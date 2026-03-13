# CivicBridge AI

An AI-powered matchmaking and chat engine that helps citizens discover, understand, and determine their eligibility for complex government schemes in multiple languages.

![CivicBridge AI Cover Image](media_assets/cover.png)
*(Replace with 'cover.png')*

## 🚀 Quick Links
- [Project Overview](project_overview.md)
- [Architecture](architecture/architecture_description.md)
- [Demo Video](demo/demo_video_plan.md)
- [Technical Blog](article/technical_blog.md)

## 💡 The Problem
Government schemes are often buried in dense, complex PDF documents, making it difficult for everyday citizens—especially those with language barriers or limited technical literacy—to figure out what benefits they qualify for and how to apply.

## 🛠️ The Solution
CivicBridge AI acts as an accessible translator. It ingests complex government PDFs, extracts structured eligibility criteria using Amazon Bedrock, and cross-references user demographic profiles (via mock Aadhaar lookups) to instantly check eligibility. A conversational AI interface allows users to ask questions in natural language.

## ⚙️ Tech Stack
- Frontend: React.js, Vite, Nginx
- Backend: Python Serverless (AWS Lambda)
- AI Logic: Amazon Bedrock (Nova Lite/Nova Pro)
- Storage & Data: DynamoDB, S3
- Notifications: AWS SNS
