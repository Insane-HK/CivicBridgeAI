import json
from lambda_function import lambda_handler

def main():
    test_event = {
        "httpMethod": "POST",
        "body": json.dumps({
            "document_text": """The Pradhan Mantri Awas Yojana (PMAY) provides affordable housing to the urban poor. 
Eligibility: 
1. The beneficiary family should not own a pucca house either in their name or in the name of any member of their family in any part of India.
2. The beneficiary family must earn less than ₹3,00.000 per annum for EWS category.
3. An adult female member must be the property owner or co-owner.""",
            "user_question": "I earn Rs 2 Lakhs a year and I live in a rented apartment. My husband owns a pucca house in our village. Can we apply?"
        })
    }

    print("--- Invoking Lambda Handler Locally ---")
    try:
        response = lambda_handler(test_event, None)
        print(f"Status Code: {response.get('statusCode')}")
        
        body = response.get('body')
        if body:
            parsed_body = json.loads(body)
            print("\nParsed Response JSON:")
            print(json.dumps(parsed_body, indent=2))
        else:
            print("No body returned.")
            
    except Exception as e:
        print(f"Execution Error: {e}")

if __name__ == "__main__":
    main()
