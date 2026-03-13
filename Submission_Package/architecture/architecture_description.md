# Architecture Description

![Architecture Diagram](media_assets/architecture_diagram.png)
*(Replace with generated 'architecture_diagram.png')*

## Pipeline Step-by-Step

### 1. User Interaction (Frontend)
The user interacts with a React/Vite-based Single Page Application hosted on an EC2 instance behind an Nginx web server. The UI offers two views: an Admin uploading PDFs and a Citizen chatting.

### 2. API Gateway & Auth
All requests pass through Amazon API Gateway via a custom JWT Lambda Authorizer.

### 3. Backend Processing (AWS Lambda)
- **User Handler:** Mocks Aadhaar demographics, manages profiles, opts users into SMS.
- **Chat Handler:** Manages conversation history, invokes LLM to answer user questions based on PDF context.
- **Process Scheme Handler:** Triggered by S3 PDF uploads. Parses the PDF to find the target audience.

### 4. AI / Logic Layer (Amazon Bedrock)
The system leverages Amazon Bedrock models (Nova Pro/Lite) to:
- Extract JSON schema from unstructured PDFs (Eligibility Rules).
- Provide conversational context based on the RAG model.

### 5. Data Storage
- **S3:** Stores scheme PDFs and chat document uploads.
- **DynamoDB:** Three tables handle `Users`, `Schemes` (parsed logic), and `Conversations` history.

### 6. Output Generation
- **AWS SNS:** Pushes SMS alerts to subscribed users.
