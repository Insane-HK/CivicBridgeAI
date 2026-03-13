# Implementation Plan: CivicBridge AI

## Overview

This implementation plan breaks down the CivicBridge AI system into discrete coding tasks. The system consists of AWS SAM infrastructure, three Lambda functions (ProcessScheme, ChatHandler, UserHandler), DynamoDB tables, S3 buckets, API Gateway, Bedrock integration, and a frontend UI. Tasks are organized to build incrementally, with testing integrated throughout.

## Tasks

- [x] 1. Set up AWS SAM project structure and infrastructure foundation
  - Create SAM template.yaml with Globals section
  - Define DynamoDB tables (Schemes, Users, Conversations) with encryption
  - Define S3 buckets (schemes, chat-uploads) with encryption and lifecycle policies
  - Define SNS topic for notifications
  - Set up API Gateway with CORS configuration
  - Configure IAM roles and policies for Lambda functions
  - Add CloudWatch log groups and X-Ray tracing
  - _Requirements: 11.1, 11.5, 11.6, 11.7, 10.2, 10.4_

- [ ] 2. Implement UserHandler Lambda function
  - [x] 2.1 Create user registration endpoint (POST /users)
    - Write Lambda handler for user creation
    - Implement phone number validation (10-digit Indian mobile)
    - Implement age validation (1-120)
    - Implement income validation (non-negative)
    - Implement education level validation
    - Generate user_id (UUID)
    - Encrypt phone_number with KMS
    - Generate and return JWT token
    - Save user profile to DynamoDB Users table
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.6_
  
  - [ ]* 2.2 Write property test for input validation
    - **Property 6: Input Sanitization Completeness**
    - **Validates: Requirements 14.6**
    - Generate random inputs with malicious patterns
    - Verify sanitization removes SQL injection, script tags, and enforces length limits
  
  - [x] 2.3 Implement user profile retrieval endpoint (GET /users/{user_id})
    - Write Lambda handler for getting user profile
    - Validate JWT token and extract user_id
    - Verify user_id matches token (authorization check)
    - Query DynamoDB Users table
    - Decrypt phone_number
    - Return user profile
    - _Requirements: 6.6, 14.3_
  
  - [x] 2.4 Implement user profile update endpoint (PUT /users/{user_id})
    - Write Lambda handler for updating user profile
    - Validate JWT token and extract user_id
    - Verify user_id matches token (authorization check)
    - Validate updated fields
    - Update DynamoDB Users table
    - Return updated profile
    - _Requirements: 6.6, 14.3_
  
  - [ ]* 2.5 Write property test for authorization boundary enforcement
    - **Property 5: Authorization Boundary Enforcement**
    - **Validates: Requirements 14.3**
    - Generate JWT for user A
    - Attempt to access user B's profile
    - Verify 401 UNAUTHORIZED response


- [ ] 3. Implement ProcessScheme Lambda function (Matchmaker Engine)
  - [x] 3.1 Create S3 event handler and PDF validation
    - Write Lambda handler for S3 ObjectCreated events
    - Validate PDF file format and size (≤10MB)
    - Download PDF from S3
    - Reject non-PDF files with error logging
    - _Requirements: 1.1, 1.2, 1.4, 1.5_
  
  - [x] 3.2 Implement Bedrock Nova Pro integration for eligibility extraction
    - Create Bedrock client with retry logic (exponential backoff)
    - Build extraction prompt template
    - Invoke amazon.nova-pro-v1:0 model
    - Parse JSON response from Bedrock
    - Validate extracted JSON contains required fields (scheme_name, age_min, age_max, income_max, education_level)
    - Handle Bedrock errors and throttling
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 11.2, 11.4_
  
  - [ ]* 3.3 Write property test for eligibility extraction idempotence
    - **Property 1: Eligibility Rule Extraction Idempotence**
    - **Validates: Requirements 2.6**
    - Extract rules from sample PDF twice
    - Verify JSON structures are equivalent
  
  - [x] 3.4 Implement scheme storage in DynamoDB
    - Save extracted eligibility rules to Schemes table
    - Set scheme_id as partition key
    - Store scheme_name, eligibility_rules, pdf_s3_key, upload_timestamp, status
    - Set status to "active"
    - Implement retry logic with exponential backoff (up to 3 retries)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_
  
  - [~] 3.5 Implement user matching algorithm
    - Scan Users table for all profiles
    - Implement match_user function with age, income, education, geographic checks
    - Collect matched user phone numbers
    - Handle missing user profile fields gracefully
    - Complete matching for 10,000 users within 60 seconds
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_
  
  - [ ]* 3.6 Write property test for user matching symmetry
    - **Property 2: User Matching Symmetry**
    - **Validates: Requirements 4.2**
    - Generate random user profiles and scheme rules
    - Verify matching logic consistency
    - Ensure matched users satisfy all eligibility criteria
  
  - [~] 3.7 Implement SNS notification system
    - Create SNS client
    - Format SMS messages with scheme name, description, and chat URL
    - Send notifications in batches of 100 (SNS rate limit compliance)
    - Handle SNS delivery failures with logging
    - Complete all SMS sends within 5 minutes for 1,000 users
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_
  
  - [ ]* 3.8 Write property test for SMS notification completeness
    - **Property 3: SMS Notification Completeness**
    - **Validates: Requirements 5.1, 5.4**
    - Mock SNS client
    - Verify one-to-one correspondence between matched users and sent messages
    - Ensure no duplicates or omissions


- [~] 4. Checkpoint - Verify infrastructure and core Lambda functions
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. Implement ChatHandler Lambda function (Chat Engine)
  - [x] 5.1 Create chat message endpoint (POST /chat)
    - Write Lambda handler for chat messages
    - Validate JWT token and extract user_id
    - Extract session_id from request (or generate new)
    - Retrieve conversation history from Conversations table
    - Check for PDF context (from previous upload)
    - Build Bedrock prompt with conversation context
    - Invoke amazon.nova-lite-v1:0 model
    - Parse Hinglish response
    - Save message exchange to Conversations table
    - Return response within 3 seconds
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 11.3, 11.4_
  
  - [ ]* 5.2 Write property test for conversation context preservation
    - **Property 4: Conversation Context Preservation**
    - **Validates: Requirements 8.5**
    - Send multi-turn conversation
    - Verify responses reference earlier messages
  
  - [~] 5.3 Create PDF upload endpoint (POST /chat/upload)
    - Write Lambda handler for PDF uploads
    - Validate JWT token
    - Validate PDF size (≤5MB)
    - Generate session_id if new
    - Upload to S3 chat bucket with 24-hour lifecycle
    - Store pdf_s3_key in Conversations table
    - Return acknowledgment within 2 seconds
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_
  
  - [~] 5.4 Create conversation history endpoint (GET /chat/history/{session_id})
    - Write Lambda handler for retrieving conversation history
    - Validate JWT token
    - Query Conversations table by session_id
    - Return message history
    - _Requirements: 12.1_
  
  - [~] 5.5 Implement eligibility checklist generation
    - Create generate_eligibility_checklist function
    - Evaluate age, income, education, geographic criteria
    - Generate structured checklist with criterion name, user value, required value, status
    - Calculate overall eligibility status (Eligible/Not Eligible/Partially Eligible)
    - Format checklist in JSON and human-readable Hinglish
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_
  
  - [ ]* 5.6 Write property test for eligibility checklist consistency
    - **Property 7: Eligibility Checklist Consistency**
    - **Validates: Requirements 9.4**
    - Generate random user/scheme pairs
    - Verify overall status matches all individual criteria statuses
  
  - [~] 5.7 Implement concurrent request handling
    - Configure Lambda concurrency settings
    - Test with 100 concurrent users
    - Ensure response times remain under 3 seconds for 95% of queries
    - _Requirements: 8.6_


- [ ] 6. Implement error handling and logging infrastructure
  - [~] 6.1 Create error classes and structured logging
    - Define error classes (ValidationError, UnauthorizedError, NotFoundError, BedrockError, DynamoDBError, S3Error, SNSError)
    - Implement structured JSON logging format
    - Add timestamp, level, function name, request_id, user_id, message, error, duration_ms
    - Configure CloudWatch log retention (30 days)
    - _Requirements: 13.1, 13.2, 13.3, 13.5_
  
  - [~] 6.2 Implement retry logic for external services
    - Add exponential backoff for Bedrock API calls (max 3 retries)
    - Add exponential backoff for DynamoDB operations (max 3 retries)
    - Handle throttling exceptions
    - _Requirements: 3.5_
  
  - [x] 6.3 Create health check endpoint (GET /health)
    - Write Lambda handler for health checks
    - Check DynamoDB table accessibility
    - Check S3 bucket accessibility
    - Check Bedrock model availability
    - Return system status and component health
    - _Requirements: 13.6_
  
  - [~] 6.4 Set up CloudWatch alarms and SNS alerts
    - Create alarm for Lambda error rate >5%
    - Create alarm for Bedrock throttling errors
    - Create alarm for DynamoDB capacity exceeded
    - Create alarm for API Gateway 5xx errors >10 per minute
    - Configure SNS topic for admin notifications
    - _Requirements: 13.4_

- [ ] 7. Implement security features
  - [~] 7.1 Create API key authentication for admin endpoints
    - Store API key in AWS Secrets Manager
    - Implement API key validation in API Gateway
    - Apply to POST /schemes endpoint
    - _Requirements: 14.1_
  
  - [~] 7.2 Implement JWT token generation and validation
    - Create JWT generation function (24-hour expiration)
    - Include user_id, phone_number, exp in token
    - Create Lambda authorizer for JWT validation
    - Apply to user and chat endpoints
    - _Requirements: 14.2_
  
  - [~] 7.3 Implement input sanitization
    - Create sanitize_input function
    - Remove SQL injection patterns
    - Remove script tags
    - Enforce length limits (1000 characters)
    - Apply to all user inputs before Bedrock/DynamoDB calls
    - _Requirements: 14.6_
  
  - [~] 7.4 Configure S3 bucket security
    - Block public access on all buckets
    - Require signed URLs for PDF retrieval
    - Enable bucket encryption (SSE-S3)
    - _Requirements: 14.5_
  
  - [~] 7.5 Implement phone number encryption
    - Create KMS key for phone number encryption
    - Encrypt phone numbers before storing in DynamoDB
    - Decrypt phone numbers when retrieving user profiles
    - _Requirements: 6.5_
  
  - [ ]* 7.6 Write property test for data encryption at rest
    - **Property 9: Data Encryption at Rest**
    - **Validates: Requirements 6.5**
    - Write user to DynamoDB
    - Read raw data and verify encryption
    - Decrypt and compare with original


- [~] 8. Checkpoint - Verify security and error handling
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 9. Implement AWS Free Tier compliance and monitoring
  - [~] 9.1 Configure Lambda resource limits
    - Set memory allocation to 512MB for all functions
    - Set timeout to 30 seconds for all functions
    - Set concurrent execution limit to 10
    - _Requirements: 10.2, 10.3_
  
  - [~] 9.2 Configure S3 lifecycle policies
    - Set 24-hour expiration for chat uploads
    - Monitor total storage to stay under 5GB
    - _Requirements: 10.1_
  
  - [~] 9.3 Implement Bedrock token usage tracking
    - Create DynamoDB table for tracking monthly token usage
    - Increment token count after each Bedrock invocation
    - Implement check_bedrock_usage function
    - Send admin alert at 80% of free tier limit (8,000 tokens)
    - Enable request throttling when approaching limit
    - _Requirements: 10.5_
  
  - [~] 9.4 Set up CloudWatch monitoring dashboard
    - Create dashboard with Lambda invocation metrics
    - Add DynamoDB read/write capacity metrics
    - Add S3 storage metrics
    - Add Bedrock token usage metrics
    - Add API Gateway request/error metrics
    - _Requirements: 13.6_
  
  - [ ]* 9.5 Write property test for free tier compliance
    - **Property 10: Free Tier Compliance**
    - **Validates: Requirements 10.1-10.5**
    - Monitor CloudWatch metrics
    - Verify S3 storage ≤5GB, Lambda invocations ≤1M, Bedrock tokens ≤20K, DynamoDB storage ≤25GB

- [ ] 10. Configure API Gateway endpoints and validation
  - [~] 10.1 Define all REST API endpoints
    - POST /schemes (admin upload)
    - POST /users (registration)
    - GET /users/{user_id}
    - PUT /users/{user_id}
    - POST /chat (send message)
    - POST /chat/upload (PDF upload)
    - GET /chat/history/{session_id}
    - GET /health
    - _Requirements: 12.1_
  
  - [~] 10.2 Implement request validation with JSON schemas
    - Define JSON schema for POST /users request
    - Define JSON schema for POST /chat request
    - Define JSON schema for POST /chat/upload request
    - Configure API Gateway to validate requests
    - _Requirements: 12.3_
  
  - [~] 10.3 Configure CORS and rate limiting
    - Enable CORS for all endpoints
    - Set AllowOrigins to frontend domain
    - Implement rate limiting (100 requests per minute per IP)
    - _Requirements: 12.2, 12.5_
  
  - [~] 10.4 Implement HTTP status code handling
    - Return 200 for success
    - Return 400 for bad request (validation errors)
    - Return 401 for unauthorized
    - Return 404 for not found
    - Return 500 for server errors
    - _Requirements: 12.4_
  
  - [~] 10.5 Enable API Gateway logging
    - Configure CloudWatch logging for all requests
    - Log request/response payloads (sanitized)
    - Log execution time
    - _Requirements: 12.6_


- [ ] 11. Build frontend UI with Kiro
  - [~] 11.1 Create admin dashboard for scheme PDF uploads
    - Build file upload widget with drag-and-drop
    - Add upload progress indicator
    - Display scheme list with status (processing/active/failed)
    - Show error messages for failed extractions
    - Implement API key management
    - _Requirements: 15.1_
  
  - [~] 11.2 Create user registration form
    - Build form with phone number, age, income, education, state, district fields
    - Implement client-side validation (10-digit phone, age 1-120, non-negative income)
    - Display error messages in Hinglish
    - Show success message with JWT token storage
    - _Requirements: 15.2_
  
  - [~] 11.3 Create chat interface
    - Build message input box and send button
    - Display conversation history with auto-scroll
    - Add PDF upload button
    - Show loading indicators during API calls
    - Implement session management
    - _Requirements: 15.3_
  
  - [~] 11.4 Create eligibility checklist display component
    - Build visual checklist with color-coded indicators (green ✅, red ❌, yellow ⚠️)
    - Display criterion name, user value, required value, status
    - Show overall eligibility status
    - Format in Hinglish
    - _Requirements: 15.4_
  
  - [~] 11.5 Implement responsive design
    - Create mobile layout (320px-768px) with single column
    - Create desktop layout (>768px) with two columns
    - Make message input bottom-fixed on mobile
    - Add collapsible checklist on mobile
    - Test on various screen sizes
    - _Requirements: 15.5_
  
  - [~] 11.6 Implement error handling in frontend
    - Display user-friendly Hinglish error messages
    - Handle API errors gracefully (network errors, 4xx, 5xx)
    - Show loading states during API calls
    - Implement retry logic for failed requests
    - _Requirements: 15.6, 15.7_
  
  - [~] 11.7 Integrate frontend with API Gateway
    - Configure API endpoint URLs
    - Implement JWT token storage and refresh
    - Add Authorization header to authenticated requests
    - Add X-Api-Key header to admin requests
    - Test all endpoints (users, chat, schemes, health)
    - _Requirements: 12.1, 14.1, 14.2_


- [~] 12. Checkpoint - Verify frontend integration
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 13. Deploy and test complete system
  - [x] 13.1 Deploy SAM template to AWS
    - Run `sam build` to build Lambda functions
    - Run `sam deploy --guided` to deploy stack
    - Configure stack name, region (ap-south-1), and parameters
    - Verify all resources created successfully
    - Save API Gateway endpoint URL
    - _Requirements: 11.7_
  
  - [~] 13.2 Test admin scheme upload flow
    - Upload sample scheme PDF via admin dashboard
    - Verify S3 upload successful
    - Verify ProcessScheme Lambda triggered
    - Verify eligibility rules extracted and saved to DynamoDB
    - Verify user matching executed
    - Verify SMS notifications sent
    - Check CloudWatch logs for errors
    - _Requirements: 1.1, 2.1, 3.1, 4.1, 5.1_
  
  - [~] 13.3 Test user registration and profile management
    - Register new user via frontend form
    - Verify user saved to DynamoDB with encrypted phone number
    - Verify JWT token returned
    - Test GET /users/{user_id} endpoint
    - Test PUT /users/{user_id} endpoint
    - Verify authorization checks work (cannot access other users' data)
    - _Requirements: 6.1, 6.6, 14.3_
  
  - [~] 13.4 Test chat interface end-to-end
    - Upload scheme PDF via chat interface
    - Verify PDF stored in S3 with 24-hour lifecycle
    - Send chat message asking about eligibility
    - Verify Hinglish response received within 3 seconds
    - Verify eligibility checklist displayed correctly
    - Test multi-turn conversation with context preservation
    - Retrieve conversation history
    - _Requirements: 7.1, 8.1, 8.4, 8.5, 9.1, 9.4_
  
  - [~] 13.5 Test error handling and security
    - Test invalid inputs (malformed phone, negative income, SQL injection)
    - Test unauthorized access attempts
    - Test JWT token expiration
    - Test API rate limiting
    - Verify error messages displayed in Hinglish
    - Check CloudWatch logs for proper error logging
    - _Requirements: 13.1, 14.6, 12.5_
  
  - [~] 13.6 Verify AWS Free Tier compliance
    - Check S3 storage usage (<5GB)
    - Check Lambda invocation count
    - Check Bedrock token usage
    - Check DynamoDB storage and request units
    - Verify CloudWatch alarms configured
    - Test throttling when approaching limits
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [~] 14. Final checkpoint - Complete system verification
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional property-based tests and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at key milestones
- Property tests validate universal correctness properties from the design document
- Implementation uses Python 3.11 for Lambda functions as specified in the design
- All code should follow AWS best practices and security guidelines
- Frontend is built with Kiro as specified in requirements

