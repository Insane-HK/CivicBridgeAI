# Implementation Details

### LLM Integration for Eligibility
Instead of keyword search, CivicBridge AI utilizes **Amazon Bedrock** to strictly format PDF data into JSON schema schemas defining `<minimum_age>`, `<gender>`, `<income_threshold>`, etc. 

### Chat History Management
Conversations are stored in DynamoDB under a unique `session_id`. Each time a user chats, the backend fetches previous context and injects it into the prompt so the model remembers earlier questions about specific schemes.
