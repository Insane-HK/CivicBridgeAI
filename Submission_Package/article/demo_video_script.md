# CivicBridge AI - Demo Video Script

**Target Duration:** 3-4 minutes
**Pacing:** Conversational, enthusiastic, clear

---

## 1. Introduction (0:00 - 0:30)
**Visual:** Title Slide: "CivicBridge AI - Bridging the Gap Between Citizens and Government Support" with the cover image, then transition to speaker (on camera or screen recording of the app homepage).
**Audio (Speaker):**
"Hi everyone! For millions of citizens, accessing vital government support systems is a daunting task. The resources exist, but the rules are buried deep inside incredibly dense, unstructured PDF documents.
Welcome to CivicBridge AI. Our mission is to turn this confusing bureaucratic language into structured, easily queryable information, directly empowering citizens."

## 2. The Problem (0:30 - 1:00)
**Visual:** Screen recording showing a typical, text-heavy government scheme PDF on the screen. Scrolling through dense paragraphs of eligibility criteria.
**Audio (Speaker):**
"Here is the root of the problem. If you want to know if you're eligible for a scheme, you have to read through documents like this. It's time-consuming and inaccessible for many. We realized we could fix this using Generative AI."

## 3. The Backend Architecture (1:00 - 1:45)
**Visual:** Pull up the architectural diagram from `media_assets/architecture_diagram.png`. Highlight the flow from S3 -> Lambda -> Amazon Bedrock.
**Audio (Speaker):**
"We built a serverless backend using AWS. When a government PDF is uploaded to our Amazon S3 bucket, it triggers our `ProcessScheme` Lambda function. 
This is our secret sauce: we pass the document to the **Amazon Bedrock Nova model** with a strict prompt to extract variables like `min_age`, `income_limits`, and `eligible_genders`. The LLM normalizes this unstructured text into strict JSON data."

## 4. Live Demo - The Frontend (1:45 - 2:45)
**Visual:** Switch to the React frontend running live on the EC2 instance. Show the chat interface.
*Action:* Type a prompt into the chat box like, "I am a 25-year-old female student. Are there any schemes for me?" 
Wait for the response.
**Audio (Speaker):**
"Let's see it in action. Our user interface is a clean React app hosted on an Amazon EC2 instance. 
A user can simply ask a natural language question. Behind the scenes, our `ChatHandler` Lambda queries the structured data we extracted earlier and provides a clear, accurate answer about their eligibility. No more reading PDFs."

## 5. Deployment & Technical Learnings (2:45 - 3:30)
**Visual:** Show the IDE with `deploy.py` script and the Bedrock Nova API call.
**Audio (Speaker):**
"Building this wasn't without challenges. Getting the LLM to predictably output JSON required heavy system prompting and schema handling to avoid 503 errors and crashes. 
We also fully automated our deployment. We wrote a custom Python deploy script using `paramiko` to bypass Windows SSH permission locks, securely upload our Vite build, and restart Nginx on our EC2 instance seamlessly."

## 6. Conclusion & Future Steps (3:30 - 4:00)
**Visual:** Return to the speaker on camera, or a final slide outlining future plans (WhatsApp icon).
**Audio (Speaker):**
"CivicBridge AI makes essential civic services accessible to everyone, driving real social impact. 
Looking ahead, we're planning to bypass the web app entirely by integrating directly with the WhatsApp API to serve our lowest-literacy users exactly where they already communicate.
Thank you for watching!"
