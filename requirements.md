# Requirements Document

## Introduction

CivicBridge AI is an AWS serverless system designed to address information poverty in India by transforming complex government scheme documentation into accessible, actionable information. The system operates through two complementary engines: a Proactive Matchmaker Engine that automatically identifies and notifies eligible citizens, and an On-Demand Chat Engine that provides instant Hinglish responses to scheme-related queries. Built entirely on AWS Free Tier infrastructure, the system leverages Amazon Bedrock Nova models to process bureaucratic PDFs and deliver personalized assistance via SMS notifications and conversational interfaces.

## Glossary

- **Matchmaker_Engine**: The proactive component that analyzes scheme PDFs, extracts eligibility rules, matches users, and sends SMS notifications
- **Chat_Engine**: The on-demand component that answers user questions about schemes in Hinglish with eligibility checklists
- **Scheme_PDF**: Government documentation describing benefit programs, typically 50+ pages with eligibility criteria
- **Eligibility_Rules**: Structured JSON containing Age, Income, Education, and other criteria extracted from Scheme PDFs
- **User_Profile**: DynamoDB record containing citizen demographic data used for scheme matching
- **Hinglish**: Conversational mix of Hindi and English commonly used in India
- **Nova_Pro_Model**: Amazon Bedrock model (amazon.nova-pro-v1:0) used for complex PDF analysis and rule extraction
- **Nova_Lite_Model**: Amazon Bedrock model (amazon.nova-lite-v1:0) used for low-latency chat responses
- **Schemes_Table**: DynamoDB table storing extracted eligibility rules and scheme metadata
- **Users_Table**: DynamoDB table storing citizen profiles for proactive matching
- **Admin_User**: Government official or authorized personnel who uploads Scheme PDFs
- **Citizen_User**: Individual seeking information about government schemes
- **SAM_Template**: AWS Serverless Application Model infrastructure-as-code definition

## Requirements

### Requirement 1: Admin Scheme PDF Upload

**User Story:** As an Admin_User, I want to upload Scheme PDFs to the system, so that eligibility rules can be extracted and citizens can be matched automatically

#### Acceptance Criteria

1. WHEN an Admin_User uploads a Scheme_PDF to the designated S3 bucket, THE Matchmaker_Engine SHALL trigger a Lambda function within 5 seconds
2. THE S3_Bucket SHALL accept PDF files up to 10MB in size
3. THE S3_Bucket SHALL organize uploaded files using the naming pattern: schemes/{scheme-id}/{timestamp}.pdf
4. WHEN a non-PDF file is uploaded, THE Matchmaker_Engine SHALL reject the file and log an error message
5. THE Lambda_Function SHALL have IAM permissions to read from the S3_Bucket

### Requirement 2: Eligibility Rule Extraction

**User Story:** As an Admin_User, I want the system to automatically extract eligibility criteria from uploaded PDFs, so that I don't have to manually parse complex documents

#### Acceptance Criteria

1. WHEN a Scheme_PDF upload triggers the Lambda function, THE Matchmaker_Engine SHALL invoke the Nova_Pro_Model via Amazon Bedrock
2. THE Matchmaker_Engine SHALL extract eligibility rules in strict JSON format containing Age, Income, Education, and additional criteria fields
3. THE Matchmaker_Engine SHALL complete extraction within 30 seconds for PDFs up to 50 pages
4. IF the Nova_Pro_Model cannot extract valid eligibility rules, THEN THE Matchmaker_Engine SHALL log the failure and notify the Admin_User
5. THE Matchmaker_Engine SHALL validate that extracted JSON contains required fields: scheme_name, age_min, age_max, income_max, education_level
6. FOR ALL valid Scheme PDFs, extracting rules then formatting them back to text then extracting again SHALL produce equivalent JSON structure (round-trip property)

### Requirement 3: Scheme Storage

**User Story:** As a system administrator, I want extracted scheme data stored reliably, so that it can be queried for matching and chat responses

#### Acceptance Criteria

1. WHEN eligibility rules are successfully extracted, THE Matchmaker_Engine SHALL save the JSON to the Schemes_Table in DynamoDB
2. THE Schemes_Table SHALL use scheme_id as the partition key
3. THE Schemes_Table SHALL store: scheme_id, scheme_name, eligibility_rules (JSON), pdf_s3_key, upload_timestamp, status
4. THE Matchmaker_Engine SHALL set status to "active" upon successful storage
5. IF DynamoDB write fails, THEN THE Matchmaker_Engine SHALL retry up to 3 times with exponential backoff

### Requirement 4: Proactive User Matching

**User Story:** As a Citizen_User, I want to be automatically notified when I'm eligible for new schemes, so that I don't miss opportunities due to lack of awareness

#### Acceptance Criteria

1. WHEN a new scheme is saved to the Schemes_Table, THE Matchmaker_Engine SHALL scan the Users_Table for matching profiles
2. THE Matchmaker_Engine SHALL evaluate each User_Profile against Eligibility_Rules using Age, Income, and Education criteria
3. THE Matchmaker_Engine SHALL complete matching for up to 10,000 user records within 60 seconds
4. THE Matchmaker_Engine SHALL collect all matched user phone numbers for notification
5. IF a User_Profile is missing required fields, THEN THE Matchmaker_Engine SHALL skip that user and log a warning

### Requirement 5: SMS Notification Delivery

**User Story:** As a Citizen_User, I want to receive SMS alerts about schemes I'm eligible for, so that I can take action immediately

#### Acceptance Criteria

1. WHEN users are matched to a scheme, THE Matchmaker_Engine SHALL trigger Amazon SNS to send SMS notifications
2. THE SMS_Message SHALL contain: scheme name, brief description (max 100 characters), and a link to the Chat_Engine
3. THE Matchmaker_Engine SHALL send SMS messages in batches of 100 to comply with SNS rate limits
4. THE Matchmaker_Engine SHALL use the phone number stored in the User_Profile
5. IF SNS returns a delivery failure, THEN THE Matchmaker_Engine SHALL log the failure with user_id and error code
6. THE Matchmaker_Engine SHALL complete all SMS sends within 5 minutes for up to 1,000 matched users

### Requirement 6: User Profile Management

**User Story:** As a Citizen_User, I want my demographic information stored securely, so that I can receive relevant scheme notifications

#### Acceptance Criteria

1. THE Users_Table SHALL store: user_id (partition key), phone_number, age, income, education_level, state, district, registration_timestamp
2. WHEN a new Citizen_User registers, THE System SHALL validate that phone_number is a valid 10-digit Indian mobile number
3. THE System SHALL validate that age is between 1 and 120
4. THE System SHALL validate that income is a non-negative number
5. THE System SHALL encrypt phone_number at rest using DynamoDB encryption
6. THE API_Gateway SHALL expose endpoints: POST /users (create), GET /users/{user_id} (read), PUT /users/{user_id} (update)

### Requirement 7: Chat Interface PDF Upload

**User Story:** As a Citizen_User, I want to upload a Scheme_PDF and ask questions about it, so that I can understand eligibility without reading the entire document

#### Acceptance Criteria

1. WHEN a Citizen_User uploads a PDF via the Chat_Engine interface, THE System SHALL store it temporarily in S3 with a 24-hour expiration policy
2. THE Chat_Engine SHALL accept PDF files up to 5MB in size
3. THE Chat_Engine SHALL trigger a Lambda function to process the uploaded PDF
4. THE Lambda_Function SHALL invoke the Nova_Lite_Model via Amazon Bedrock with the PDF content
5. THE Chat_Engine SHALL return an acknowledgment to the user within 2 seconds of upload

### Requirement 8: Hinglish Chat Responses

**User Story:** As a Citizen_User, I want to ask questions in Hinglish and receive simple answers, so that language barriers don't prevent me from accessing information

#### Acceptance Criteria

1. WHEN a Citizen_User submits a text question, THE Chat_Engine SHALL invoke the Nova_Lite_Model via Amazon Bedrock
2. THE Chat_Engine SHALL provide the Nova_Lite_Model with context from either the uploaded PDF or the Schemes_Table
3. THE Nova_Lite_Model SHALL generate responses in Hinglish (mixed Hindi-English)
4. THE Chat_Engine SHALL return responses within 3 seconds for 95% of queries
5. THE Chat_Engine SHALL maintain conversation context for up to 10 message exchanges per session
6. THE Chat_Engine SHALL handle concurrent requests from up to 100 users simultaneously

### Requirement 9: Eligibility Checklist Generation

**User Story:** As a Citizen_User, I want a clear Yes/No checklist showing my eligibility status, so that I can quickly determine if I qualify for a scheme

#### Acceptance Criteria

1. WHEN a Citizen_User asks about eligibility, THE Chat_Engine SHALL generate a structured checklist
2. THE Eligibility_Checklist SHALL contain: criterion name, user value, required value, status (Yes/No/Partial)
3. THE Chat_Engine SHALL evaluate: Age criteria, Income criteria, Education criteria, Geographic criteria, and Other scheme-specific criteria
4. THE Chat_Engine SHALL display the overall eligibility result: "Eligible", "Not Eligible", or "Partially Eligible"
5. THE Chat_Engine SHALL format the checklist in both JSON (for API) and human-readable Hinglish (for UI)

### Requirement 10: AWS Free Tier Compliance

**User Story:** As a system administrator, I want the system to operate within AWS Free Tier limits, so that costs remain minimal during the hackathon and initial deployment

#### Acceptance Criteria

1. THE System SHALL use S3 storage limited to 5GB total
2. THE System SHALL configure Lambda functions with 512MB memory allocation
3. THE System SHALL limit Lambda execution time to 30 seconds per invocation
4. THE System SHALL use DynamoDB on-demand pricing mode
5. THE System SHALL limit Amazon Bedrock API calls to stay within free tier: 10,000 input tokens and 10,000 output tokens per month for Nova models
6. THE System SHALL implement request throttling when approaching free tier limits

### Requirement 11: Infrastructure as Code

**User Story:** As a developer, I want all infrastructure defined in AWS SAM, so that the system can be deployed consistently and version-controlled

#### Acceptance Criteria

1. THE SAM_Template SHALL define all AWS resources: S3 buckets, DynamoDB tables, Lambda functions, API Gateway, SNS topics, IAM roles
2. THE SAM_Template SHALL specify the Nova_Pro_Model (amazon.nova-pro-v1:0) for the Matchmaker_Engine Lambda
3. THE SAM_Template SHALL specify the Nova_Lite_Model (amazon.nova-lite-v1:0) for the Chat_Engine Lambda
4. THE SAM_Template SHALL configure IAM policies granting Lambda functions permission to invoke Bedrock models
5. THE SAM_Template SHALL define environment variables for: DynamoDB table names, S3 bucket names, SNS topic ARNs, Bedrock model IDs
6. THE SAM_Template SHALL enable AWS X-Ray tracing for all Lambda functions
7. WHEN the SAM_Template is deployed using "sam deploy", THE System SHALL create all resources successfully in a single CloudFormation stack

### Requirement 12: API Gateway Configuration

**User Story:** As a frontend developer, I want well-defined REST APIs, so that I can integrate the Kiro-built UI with backend services

#### Acceptance Criteria

1. THE API_Gateway SHALL expose the following endpoints: POST /schemes (admin upload), POST /users (registration), GET /users/{user_id}, PUT /users/{user_id}, POST /chat (send message), POST /chat/upload (PDF upload), GET /chat/history/{session_id}
2. THE API_Gateway SHALL implement CORS to allow requests from the frontend domain
3. THE API_Gateway SHALL validate request payloads against JSON schemas
4. THE API_Gateway SHALL return appropriate HTTP status codes: 200 (success), 400 (bad request), 401 (unauthorized), 500 (server error)
5. THE API_Gateway SHALL implement rate limiting: 100 requests per minute per IP address
6. THE API_Gateway SHALL log all requests to CloudWatch for monitoring

### Requirement 13: Error Handling and Logging

**User Story:** As a system administrator, I want comprehensive error logging, so that I can troubleshoot issues and monitor system health

#### Acceptance Criteria

1. WHEN any Lambda function encounters an error, THE System SHALL log the error to CloudWatch with: timestamp, function name, error message, stack trace, request context
2. THE System SHALL categorize errors as: ValidationError, BedrockError, DynamoDBError, S3Error, SNSError, UnknownError
3. THE System SHALL implement structured logging in JSON format
4. IF a critical error occurs (Bedrock unavailable, DynamoDB unreachable), THEN THE System SHALL send an alert via SNS to the admin notification topic
5. THE System SHALL retain CloudWatch logs for 30 days
6. THE System SHALL expose a GET /health endpoint returning system status and component health checks

### Requirement 14: Security and Access Control

**User Story:** As a security administrator, I want proper authentication and authorization, so that only authorized users can access admin functions and user data is protected

#### Acceptance Criteria

1. THE API_Gateway SHALL require API key authentication for admin endpoints: POST /schemes
2. THE API_Gateway SHALL implement JWT token authentication for user endpoints: POST /chat, GET /users/{user_id}, PUT /users/{user_id}
3. THE System SHALL validate that users can only access their own User_Profile data
4. THE Lambda_Functions SHALL follow the principle of least privilege with minimal IAM permissions
5. THE S3_Bucket SHALL block public access and require signed URLs for PDF retrieval
6. THE System SHALL sanitize all user inputs to prevent injection attacks before passing to Bedrock or DynamoDB

### Requirement 15: Frontend Integration Requirements

**User Story:** As a Citizen_User, I want an intuitive web interface built with Kiro, so that I can easily interact with the chat system and view my eligibility

#### Acceptance Criteria

1. THE Frontend_UI SHALL provide an admin dashboard for uploading Scheme PDFs
2. THE Frontend_UI SHALL provide a user registration form collecting: phone number, age, income, education level, state, district
3. THE Frontend_UI SHALL provide a chat interface with: message input, conversation history, PDF upload button, eligibility checklist display
4. THE Frontend_UI SHALL display the Eligibility_Checklist in a visual format with color-coded Yes/No indicators
5. THE Frontend_UI SHALL be responsive and functional on mobile devices with screen widths down to 320px
6. THE Frontend_UI SHALL display loading indicators during API calls
7. THE Frontend_UI SHALL handle API errors gracefully with user-friendly Hinglish error messages
