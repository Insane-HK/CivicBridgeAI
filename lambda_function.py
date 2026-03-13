import json
import boto3
import os

# Initialize Bedrock Runtime client
region = os.environ.get('AWS_REGION', 'us-east-1')
bedrock_runtime = boto3.client('bedrock-runtime', region_name=region)

def lambda_handler(event, context):
    """
    AWS Lambda Handler for CivicBridge AI
    Accepts document_text, user_question, and optional conversation_history.
    Invokes Claude 3 Haiku via Amazon Bedrock and returns answer + eligibility checklist.
    """

    # Standard CORS headers for API Gateway
    headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'OPTIONS,POST'
    }

    # Handle preflight CORS request
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': headers, 'body': ''}

    try:
        # Parse the incoming JSON payload
        body_str = event.get('body', '{}') or '{}'
        body = json.loads(body_str)

        document_text       = body.get('document_text', '').strip()
        user_question       = body.get('user_question', '').strip()
        conversation_history = body.get('conversation_history', [])  # list of {role, content}

        # Validate inputs
        if not document_text or not user_question:
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({
                    'error': 'Missing document_text or user_question',
                    'message': 'Please provide both the scheme document and your question.'
                })
            }

        # ── Build the system context ──────────────────────────────────────────
        system_prompt = """You are CivicBridge AI, an expert assistant for Indian government schemes.
Your job is to help citizens understand eligibility criteria in simple, friendly Hinglish (mix of Hindi and English).
Keep answers short, warm, and actionable. Use emojis occasionally to make responses friendly.
ALWAYS respond in the exact JSON format requested — never wrap in markdown code blocks."""

        # ── Build conversation messages ────────────────────────────────────────
        # Inject document context as first user turn
        doc_context_message = f"""Scheme Document:
---
{document_text[:3000]}
---

The above is the government scheme document. Now I will ask you questions about eligibility based on this scheme.
Please respond in the JSON format with 'answer' and 'checklist' fields."""

        messages = [
            {"role": "user", "content": [{"type": "text", "text": doc_context_message}]},
            {"role": "assistant", "content": [{"type": "text", "text": '{"status": "understood", "message": "Document padh liya. Aap apna sawal pooch sakte hain."}'}]}
        ]

        # Add previous conversation turns
        for turn in conversation_history[-6:]:  # Keep last 3 exchanges (6 messages)
            role = turn.get('role', 'user')
            content = turn.get('content', '')
            if role in ('user', 'assistant') and content:
                messages.append({
                    "role": role,
                    "content": [{"type": "text", "text": str(content)}]
                })

        # Add current question with output format instruction
        current_prompt = f"""{user_question}

Respond ONLY in this exact JSON format (no markdown, no extra text):
{{
    "answer": "Your detailed Hinglish answer here. Be friendly and clear.",
    "checklist": [
        {{"criterion": "Eligibility criterion name with value e.g. Age: 18-65 years", "met": "Yes"}},
        {{"criterion": "Another criterion e.g. Income: below 3 lakhs per year", "met": "No"}},
        {{"criterion": "Criterion where info is missing e.g. Residency requirement", "met": "Unknown"}}
    ]
}}

Important: 'met' must be exactly "Yes", "No", or "Unknown". Extract ALL hard eligibility criteria from the document."""

        messages.append({
            "role": "user",
            "content": [{"type": "text", "text": current_prompt}]
        })

        # ── Call Bedrock (Claude 3 Haiku) ──────────────────────────────────────
        payload = {
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": 1500,
            "temperature": 0.1,
            "system": system_prompt,
            "messages": messages
        }

        response = bedrock_runtime.invoke_model(
            modelId='anthropic.claude-3-haiku-20240307-v1:0',
            contentType='application/json',
            accept='application/json',
            body=json.dumps(payload)
        )

        # Parse the response
        response_body = json.loads(response.get('body').read())
        content = response_body.get('content', [])

        if content:
            response_text = content[0].get('text', '{}').strip()

            # Strip markdown code fences if model adds them
            for fence in ('```json', '```'):
                if response_text.startswith(fence):
                    response_text = response_text[len(fence):]
            if response_text.endswith('```'):
                response_text = response_text[:-3]
            response_text = response_text.strip()

            result = json.loads(response_text)

            # Ensure required fields exist
            if 'answer' not in result:
                result['answer'] = 'AI se response mila, lekin format different tha.'
            if 'checklist' not in result:
                result['checklist'] = []
        else:
            result = {"answer": "AI model se koi response nahi mila. Dobara try karein.", "checklist": []}

        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps(result, ensure_ascii=False)
        }

    except json.JSONDecodeError as e:
        print(f"JSON Parsing Error: {e}")
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({
                'error': 'AI response parse nahi ho saka.',
                'answer': 'Kuch technical issue hua. Please dobara try karein.',
                'checklist': []
            })
        }
    except Exception as e:
        print(f"Error: {type(e).__name__}: {e}")
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({
                'error': str(e),
                'answer': f'Error: {str(e)}',
                'checklist': []
            })
        }
