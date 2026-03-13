# Architecture Diagram Prompt

*You can copy and paste this prompt into tools like ChatGPT (with Mermaid.js), Draw.io, or Eraser.io to generate the diagram.*

```text
Please generate a cloud architecture diagram for a serverless AWS application called "CivicBridge AI". 

Components:
1. **Client Layer:** React User Interface (Hosted on EC2 Nginx web server).
2. **API Layer:** Amazon API Gateway handling REST endpoint routing. Custom JWT Authorizer attached.
3. **Compute Layer:**
   - UserHandler Lambda (handles registration / mocked Aadhaar API)
   - ChatHandler Lambda (processes user questions, interfaces with Bedrock)
   - ProcessScheme Lambda (triggered by S3 when an admin uploads a PDF, uses Bedrock to extract rules)
4. **AI Layer:** Amazon Bedrock (Nova Lite/Nova Pro models for document parsing and NLP).
5. **Storage Layer:**
   - Amazon DynamoDB (Tables: Users, Schemes, Conversations)
   - Amazon S3 (Buckets: Schemes PDFs, Chat Uploads)
6. **Notification Layer:** Amazon SNS (Sends SMS alerts to users).

Flows:
- UI talks to API Gateway.
- API Gateway routes to the three Lambda functions.
- Lambdas read/write from DynamoDB and S3.
- ChatHandler and ProcessScheme Lambdas query Amazon Bedrock.
- UserHandler can mock out an external Aadhaar Authentication API.
- ProcessScheme Lambda triggers SNS.
```
