# AIdeas: CivicBridge AI

![Cover Image Illustration](../media_assets/cover_image.png)

**Tags:** #aideas-2025 #social-impact #NAMER 
*(Note: Please update the region tag if your region is different, e.g., #EMEA, #APJC, #LATAM, #GCR, #ANZ)*

## App category
Social Impact

## My vision
We noticed a profound disconnect between government aid availability and citizen awareness. The primary bottleneck is often PDFs—bureaucratic criteria locked in unstructured text files prevent automated matching and discovery. My vision for CivicBridge AI is to turn unstructured semantic text into structured, queryable data, helping users seamlessly understand their eligibility for various government schemes.

## Why this matters
This idea matters because it directly empowers citizens to access the vital support systems they deserve. By simplifying the discovery of government resources and abstracting away dense bureaucratic language using AI, CivicBridge AI makes essential civic services accessible to everyone, bringing a tangible, positive **Social Impact** to our communities.

## How I built this
We opted for a serverless-first approach using a Python backend with AWS Lambda, API Gateway, and Amazon S3, paired with a React frontend hosted on an Amazon EC2 instance. 

Our "secret sauce" lives in the `ProcessScheme` Lambda function. When a PDF hits our S3 bucket, this Lambda sends the document text to **Amazon Bedrock (Nova model)**. We aggressively prompt the LLM to return strict JSON containing extracted variables like `min_age` or `eligible_genders`. We then utilize a `ChatHandler` Lambda to process natural language user questions against this newly structured data.

**Key Technical Milestones:**
1. Integrating Amazon Bedrock models (Nova Lite/Nova Pro) to predictably parse and extract structured criteria from unformatted government PDFs while handling timeout and schema errors.
2. Automating our frontend deployment: We faced strict Windows OpenSSH permission issues when trying to SCP our built React frontend onto our newly provisioned EC2 instance. We fixed this by writing a custom Python deployment script utilizing `paramiko` to bypass native SSH OS lockdowns, automatically packaging our Vite build and restarting Nginx in a seamless sequence.

## Demo
*[Embed your < 5 minute YouTube video demo here]*

*(Example Architecture / Demo Screenshot)*
![Architecture Diagram](../media_assets/architecture_diagram.png)

## What I learned
Our development journey provided several critical insights into building with Generative AI and AWS:
- **LLM Output Guardrails:** LLM outputs need strict guarding. Asking Bedrock to reliably return structured data requires heavy system prompting and careful schema handling to prevent application crashes.
- **Infrastructure Troubleshooting:** Troubleshooting cloud permissions and EC2 file transfer issues taught us the importance of having robust, automated deployment scripts to smooth out our iteration cycle.
- **Designing for the End-User:** Working with the AI models highlighted how we could push accessibility even further. Moving forward, we plan to expand the AI to support direct WhatsApp API integration, completely removing the need for a web-app to better serve our lowest-literacy users.
