import os
import zipfile
import shutil

base_dir = "Submission_Package"
os.makedirs(base_dir, exist_ok=True)

files_content = {
    f"{base_dir}/README.md": """# CivicBridge AI

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
""",

    f"{base_dir}/project_overview.md": """# Project Overview

![Demo GIF showing the Chat Interface](media_assets/chat_demo.gif)
*(Replace with 'chat_demo.gif' showing users chatting with the bot)*

**CivicBridge AI** bridges the gap between static, bureaucratic documents and accessible conversational AI. It natively supports regional languages and matches unstructured semantic rules against structured user profiles.

## Key Features
1. **AI Chatbot Interface:** Conversations powered by LLMs handling multi-lingual queries.
2. **Automated Eligibility Extraction:** Parses PDFs and identifies key demographic data points required for schemes.
3. **Instant Profile Matching:** Uses mock Aadhaar Lookups to find user age, gender, and income.
4. **SMS Notifications:** Proactively alerts users about new schemes via AWS SNS.

![Demo screen showing Aadhaar verification](media_assets/aadhaar_verification.png)
*(Replace with 'aadhaar_verification.png')*
""",

    f"{base_dir}/architecture/architecture_description.md": """# Architecture Description

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
""",

    f"{base_dir}/architecture/architecture_diagram_prompt.md": """# Architecture Diagram Prompt

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
""",

    f"{base_dir}/documentation/system_design.md": """# System Design

Our design philosophy focuses on being highly scalable while maintaining low operational costs via a serverless architecture.

![System Component VOD](media_assets/system_design.vod)
*(Placeholder for an architectural walkthrough video)*

- **Compute:** AWS Lambda instances handle dynamic loads automatically. 
- **Database:** DynamoDB was chosen for rapid key-value retrieval. Users retrieve their exact conversation histories and scheme lists in milliseconds.
- **Frontend Hosting:** Nginx on an EC2 instance provides a robust web server that handles client-side routing fallback (`try_files`) effortlessly.
""",

    f"{base_dir}/documentation/technology_stack.md": """# Technology Stack

## Frontend
- React.js
- Vite (Build Tool)
- Tailwind CSS

## Backend
- Python 3.12 (AWS Lambda Runtime)
- AWS Serverless Application Model (SAM)

## Cloud Services & Deployment
- AWS API Gateway
- AWS Lambda
- Amazon DynamoDB
- Amazon S3
- Amazon SNS
- Amazon Bedrock
- Amazon EC2 (Hosting)
- Paramiko (Automated SFTP Deployments via Python)
""",

    f"{base_dir}/documentation/implementation_details.md": """# Implementation Details

### LLM Integration for Eligibility
Instead of keyword search, CivicBridge AI utilizes **Amazon Bedrock** to strictly format PDF data into JSON schema schemas defining `<minimum_age>`, `<gender>`, `<income_threshold>`, etc. 

### Chat History Management
Conversations are stored in DynamoDB under a unique `session_id`. Each time a user chats, the backend fetches previous context and injects it into the prompt so the model remembers earlier questions about specific schemes.
""",

    f"{base_dir}/documentation/scalability_considerations.md": """# Scalability Considerations

Since the core backend runs on AWS Lambda and DynamoDB (PAY_PER_REQUEST), the application scales horizontally by default.

Potential bottlenecks to watch out for:
1. **Bedrock Quotas:** High traffic might hit Bedrock's Tokens-Per-Minute limits. We plan to implement payload caching or a queuing mechanism in the future.
2. **EC2 Instance Size:** The frontend is currently on a `t3.micro`. Setting up a CloudFront CDN and an S3 static bucket is planned for greater geographic distribution and scaling.
""",

    f"{base_dir}/demo/demo_script.md": """# Demo Presentation Script

**Speaker:** 
"Hello everyone! Today we're presenting CivicBridge AI. Did you know millions of dollars in government aid go unclaimed every year? The biggest barrier isn't funding; it's the complex bureaucracy of application criteria."

*(Show slide/image of a dense Gov PDF)*
"Imagine being a rural worker trying to understand an 8-page PDF document just to see if you can get farming assistance."

*(Switch screen to Admin Upload UI)*
"Our solution, CivicBridge AI, solves this immediately. As an admin, I upload that exact 8-page PDF here. In the background, Amazon Bedrock reads the document, extracts the exact demographic criteria, and stores it as queryable data."

*(Switch to Citizen Chat UI)*
"Now, I log in as a citizen. I type in my mock Aadhaar number. The system pulls my age, gender, and income. Look! I instantly have a personalized feed showing me exactly what I'm eligible for. And if I have questions, I can chat with the AI in natural language to ask how exactly I should apply."

*(Trigger SNS notification)*
"And finally, when new schemes drop, eligible users automatically get SMS alerts. It's that simple. Government aid, accessible to all."
""",

    f"{base_dir}/demo/demo_walkthrough.md": """# Demo Walkthrough

Follow these steps to demonstrate the software:

1. **Start Screen:** Open the web app on the EC2 IP URL.
2. **Admin Flow:** 
   - Navigate to the "Admin Upload" tab.
   - Attach a sample government scheme PDF (e.g., Agricultural Subsidy).
   - Click "Process". Show the success notification stating Bedrock has parsed the document.
3. **Citizen Login Flow:**
   - Switch to the User interface.
   - Enter a mock 12-digit Aadhaar Number (e.g., `1234 5678 9012`).
   - Show how the background API "fetches" their demographic profile.
4. **Chat & Eligibility Check:**
   - Display the dashboard where schemes are populated.
   - Type a question into the chat: *"What documents do I need for this subsidy?"*
   - Show the AI responding instantly based on the PDF context.
5. **Notifications:**
   - Click the "Subscribe to SMS Alerts" button to show the AWS SNS integration.
""",

    f"{base_dir}/demo/demo_video_plan.md": """# Demo Video Plan

### Length: 2-3 Minutes

1. **Introduction Hook (0:00 - 0:20)**
   - Start with a compelling stat about unclaimed aid.
   - Introduce the app name and the one-sentence pitch.
2. **Problem Statement (0:20 - 0:40)**
   - Show a confusing PDF scrolling quickly. Visual frustration.
3. **Admin Solution Overview (0:40 - 1:10)**
   - Live Demo screen recording: Uploading the PDF. Processing it via Bedrock. Show the extracted JSON data to prove the AI is working dynamically.
4. **Citizen Live Demo (1:10 - 2:00)**
   - Live Demo screen recording: User logging in via Aadhaar mock. Showing the matched schemes. Typing a query in the chatbox and getting a targeted answer.
5. **Technical Highlights (2:00 - 2:20)**
   - Flashing the architecture diagram. Briefly mention AWS Serverless and Amazon Bedrock.
6. **Impact & Outro (2:20 - end)**
   - Close with the real-world impact bridging the gap for citizens.
""",

    f"{base_dir}/article/technical_blog.md": """# How We Built CivicBridge AI

*(Technical Blog Post tailored for Dev platforms like Hashnode/Dev.to)*

## The Problem Space
We noticed a profound disconnect between government aid availability and citizen awareness. The primary bottleneck? PDFs. Bureaucratic criteria locked in unstructured text files prevent automated matching. We needed to turn unstructured semantic text into structured, queryable data.

## Architecture Overview
We opted for a Serverless first approach using AWS Lambda, API Gateway, and DynamoDB. 

Our 'secret sauce' lives in the `ProcessScheme` Lambda function. When a PDF hits our S3 bucket, this Lambda sends the document text to **Amazon Bedrock (Nova model)**. We aggressively prompt the LLM to return strict JSON containing variables like `min_age` or `eligible_genders`.

![Architecture Diagram](../media_assets/architecture_diagram.png)

## Development Journey & Challenges
One of the biggest hurdles was AWS permissions and configuration. We fought through strict Windows OpenSSH permission issues when trying to SCP our built React frontend onto our newly provisioned EC2 instance. 

**The Fix:** We wrote a custom Python deployment script utilizing `paramiko` to bypass native SSH OS lockdowns, automatically packaging our Vite build and restarting Nginx in a sequence. 

## Lessons Learned
- LLM outputs need strict guarding. Asking Bedrock for schemas requires heavy system prompting.
- EC2 default permissions require double-checking when automating file transfers.

## Future Improvements
Next, we want to expand the AI to support direct WhatsApp API integration, completely removing the need for a web-app for our lowest-literacy users.
""",

    f"{base_dir}/article/article_images_plan.md": """# Article Images Checklist

When publishing the article, insert the following media assets:

1. `media_assets/cover.png` - Header image for the blog.
2. `media_assets/pdf_example.png` - Showing a messy government PDF.
3. `media_assets/architecture_diagram.png` - AWS diagram.
4. `media_assets/code_snippet_deploy.png` - A screenshot of the Python paramiko deployment script showing how we bypassed SSH issues.
5. `media_assets/chat_demo.gif` - An animated GIF showing the LLM answering questions in real-time.
""",

    f"{base_dir}/development_story/development_process.md": """# The Development Process

### Idea Formation
We started with the question: "How can we use generative AI for social good rather than just another B2B SaaS tool?"

### Design Decisions
1. **Serverless Backend:** We knew we couldn't handle scaling servers if a scheme went viral locally. AWS SAM + Lambda was the obvious choice.
2. **React + Tailwind:** For rapid UI prototyping, React combined with Tailwind allowed us to build accessible interfaces quickly.
3. **Mocking Aadhaar:** To avoid real PII legal issues during the hackathon/demo phase, we heavily utilized a mock Aadhaar registry to simulate real-world demographic mapping.

### Major Challenges
- We encountered a stubborn `503 Error` when communicating with Amazon Bedrock due to a bad payload schema when switching from Claude Haiku to Amazon Nova models.
- **Solution:** We thoroughly audited the `ChatHandler` Lambda logs, corrected the schema validation in the Python script, and successfully hot-swapped the model without bringing down the system.
""",

    f"{base_dir}/development_story/tools_used.md": """# Tools Used

- **Code Editor:** VS Code / Cursor IDE
- **Agentic Dev Assistants:** Used AI to help provision the AWS infrastructure templates.
- **AWS CLI:** For manual deployments and managing EC2 instances.
- **AWS SAM CLI:** For packaging and deploying Lambda updates.
- **Paramiko (Python):** For customized SSH and SFTP file transfer to our EC2 web server.
""",

    f"{base_dir}/media_assets/required_screenshots.md": """# Visual Assets Requirement Checklist

Ensure the following files are saved in the `media_assets/` folder prior to submission:

- [ ] `cover.png` - A beautiful 1200x630 hero image containing the logo.
- [ ] `architecture_diagram.png` - The AWS pipeline diagram.
- [ ] `aadhaar_verification.png` - Screenshot of the User entering their ID.
- [ ] `chat_interface.png` - High-res screenshot of the chat window.
- [ ] `admin_upload.png` - Screenshot of the admin portal processing a PDF.
- [ ] `chat_demo.gif` - A short looping animation of typing and receiving an LLM response.
- [ ] `system_design.vod` or `.mp4` - (Optional) The 2-minute pitch/demo video recording.
""",

    f"{base_dir}/media_assets/demo_visual_assets.md": """# Demo Visual Assets Instructions

**How to capture the requested media:**

1. **GIFs:** Use a tool like *LiceCap* or *Giphy Capture* on macOS/Windows. Keep it under 15 seconds to ensure low file size. Focus completely on the UI moving.
2. **VOD/MP4:** Record your screen alongside your face explaining the demo script using *Loom* or *OBS Studio*. 
3. **PNGs:** Use standard screenshot tools, but ensure you test on a clean browser window (hide your bookmarks bar) to make it look professional.
""",

    f"{base_dir}/marketing/launch_post_linkedin.md": """# LinkedIn Launch Post

🚀 Excited to unveil **CivicBridge AI**! 

Did you know millions in government aid go unclaimed because the eligibility criteria are buried in dense 10-page PDFs? 

We built a solution. CivicBridge AI uses Amazon Bedrock and an entirely Serverless AWS architecture to ingest scheme documents, instantly extract eligibility, and cross-reference it against your demographic data. 

Citizens can chat naturally in their own language to find out exactly what they qualify for without the bureaucratic headache. 

Check out our demo video below! 👇

#AWS #Serverless #AmazonBedrock #GenerativeAI #CivicTech #BuildForGood
""",

    f"{base_dir}/marketing/launch_post_twitter.md": """# Twitter / X Launch Post

Government PDFs shouldn't stand between people and the financial aid they need. 📄🚫

Meet CivicBridge AI. We use AWS Serverless + Amazon Bedrock to instantly parse complex government schemes and match them to citizens via a conversational AI interface. ⚡🤖

Watch our live demo here. 👇
#BuildForGood #AWS #GenAI #Hackathon
""",

    f"{base_dir}/marketing/short_project_description.md": """# Short Project Descriptions

**10 Words:**
AI-powered chat matching citizens with complex government aid schemes.

**25 Words:**
CivicBridge AI ingests government document PDFs and uses LLMs to cross-reference demographic data, enabling citizens to instantly discover and understand eligible aid programs.

**100 Words:**
CivicBridge AI is an accessible platform bridging the gap between confusing bureaucracy and the citizens who need assistance. Built on AWS Serverless and powered by Amazon Bedrock, the tool automatically parses complex PDF government schemes into structured demographic criteria. It matches users to these schemes via mock Aadhaar profiles, completely eliminating the need for manual reading. Finally, an integrated conversational AI chatbot allows users to ask questions in native languages, ensuring government aid is readily accessible, understood, and applied for.
""",

    f"{base_dir}/packaging/instructions_to_create_zip.md": """# How to Create Your ZIP Package

If you are using this generated repository:

1. **Verify Media:** Make sure you place your actual screenshots, GIFs, and videos into the `media_assets/` folder, replacing the placeholder text if necessary.
2. **Compress:** The python script `generate_submission.py` has already grouped these files into a ZIP named `CivicBridgeAI_Submission_Package.zip`.
3. **Upload:** Your ZIP is ready to be submitted to Devpost, Dev.to, Hashnode, or your hackathon portal.
"""
}

# Write files and create directories
for file_path, content in files_content.items():
    os.makedirs(os.path.dirname(file_path), exist_ok=True)
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)

# Zip everything into a single archive
zip_name = "CivicBridgeAI_Submission_Package.zip"
with zipfile.ZipFile(zip_name, 'w', zipfile.ZIP_DEFLATED) as zipf:
    for root, dirs, files in os.walk(base_dir):
        for file in files:
            file_path = os.path.join(root, file)
            # Create a path relative to the archive root
            arcname = os.path.relpath(file_path, os.path.dirname(base_dir))
            zipf.write(file_path, arcname)

print(f"Generated {len(files_content)} files and successfully zipped into {zip_name}!")
