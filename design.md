    # Design Document: CivicBridge AI

    ## Overview

    CivicBridge AI is a serverless AWS application that transforms complex government scheme documentation into accessible information for Indian citizens. The system consists of two main engines:

    1. **Matchmaker Engine**: Proactively processes scheme PDFs, extracts eligibility rules, matches users, and sends SMS notifications
    2. **Chat Engine**: Provides on-demand Hinglish conversational interface for scheme queries

    ## Architecture

    ### High-Level Components

    ```
    ┌─────────────────────────────────────────────────────────────────┐
    │                         API Gateway                              │
    │  /schemes /users /chat /chat/upload /chat/history /health       │
    └────────────┬────────────────────────────────────────────────────┘
                │
        ┌────────┴────────┐
        │                 │
    ┌───▼────┐      ┌────▼─────┐       ┌──────────────┐
    │ Admin  │      │  User    │       │    Chat      │
    │ Upload │      │ Handler  │       │   Handler    │
    │ Lambda │      │  Lambda  │       │   Lambda     │
    └───┬────┘      └────┬─────┘       └──────┬───────┘
        │                │                     │
        │                │                     │
    ┌───▼────────────────▼─────────────────────▼───────┐
    │              Amazon Bedrock                       │
    │  Nova Pro (PDF Analysis) | Nova Lite (Chat)      │
    └───────────────────────────────────────────────────┘
        │                │                     │
    ┌───▼────┐      ┌────▼─────┐       ┌──────▼───────┐
    │   S3   │      │ DynamoDB │       │     SNS      │
    │Schemes │      │ Schemes  │       │ Notifications│
    │  PDFs  │      │  Users   │       │              │
    └────────┘      │Conversa- │       └──────────────┘
                    │  tions   │
                    └──────────┘
    ```

    ### Technology Stack

    - **Infrastructure**: AWS SAM (Serverless Application Model)
    - **Compute**: AWS Lambda (Node.js 18.x or Python 3.11)
    - **Storage**: Amazon S3, DynamoDB
    - **AI/ML**: Amazon Bedrock (Nova Pro v1.0, Nova Lite v1.0)
    - **Notifications**: Amazon SNS
    - **API**: Amazon API Gateway (REST)
    - **Monitoring**: CloudWatch, X-Ray
    - **Security**: IAM, JWT, API Keys



    ## Data Models

    ### DynamoDB Tables

    #### Schemes Table
    ```
    {
    "scheme_id": "string (partition key)",
    "scheme_name": "string",
    "eligibility_rules": {
        "age_min": "number",
        "age_max": "number",
        "income_max": "number",
        "education_level": "string",
        "state": "string (optional)",
        "district": "string (optional)",
        "additional_criteria": "object"
    },
    "pdf_s3_key": "string",
    "upload_timestamp": "number",
    "status": "string (active|inactive|processing)"
    }
    ```

    #### Users Table
    ```
    {
    "user_id": "string (partition key)",
    "phone_number": "string (encrypted)",
    "age": "number",
    "income": "number",
    "education_level": "string",
    "state": "string",
    "district": "string",
    "registration_timestamp": "number"
    }
    ```

    #### Conversations Table
    ```
    {
    "session_id": "string (partition key)",
    "user_id": "string",
    "messages": [
        {
        "role": "string (user|assistant)",
        "content": "string",
        "timestamp": "number"
        }
    ],
    "pdf_s3_key": "string (optional)",
    "created_at": "number",
    "updated_at": "number"
    }
    ```

    ### S3 Bucket Structure

    ```
    civicbridge-schemes/
    schemes/{scheme-id}/{timestamp}.pdf
    
    civicbridge-chat-uploads/
    chat/{session-id}/{timestamp}.pdf
    (24-hour lifecycle policy)
    ```



    ## Component Design

    ### 1. ProcessScheme Lambda (Matchmaker Engine)

    **Trigger**: S3 Event (ObjectCreated) on schemes bucket

    **Flow**:
    ```
    1. Receive S3 event notification
    2. Validate PDF file (size, format)
    3. Download PDF from S3
    4. Invoke Bedrock Nova Pro with extraction prompt
    5. Parse and validate JSON response
    6. Save to Schemes DynamoDB table
    7. Scan Users table for matching profiles
    8. Batch matched users and send SNS notifications
    9. Log results to CloudWatch
    ```

    **Bedrock Prompt Template**:
    ```
    Extract eligibility criteria from this government scheme PDF.
    Return ONLY valid JSON with this structure:
    {
    "scheme_name": "string",
    "age_min": number,
    "age_max": number,
    "income_max": number,
    "education_level": "string",
    "state": "string or null",
    "district": "string or null",
    "additional_criteria": {}
    }
    ```

    **Matching Algorithm**:
    ```python
    def match_user(user_profile, eligibility_rules):
        matches = True
        
        # Age check
        if eligibility_rules.age_min and user_profile.age < eligibility_rules.age_min:
            matches = False
        if eligibility_rules.age_max and user_profile.age > eligibility_rules.age_max:
            matches = False
        
        # Income check
        if eligibility_rules.income_max and user_profile.income > eligibility_rules.income_max:
            matches = False
        
        # Education check
        if eligibility_rules.education_level:
            if not meets_education_requirement(user_profile.education_level, 
                                            eligibility_rules.education_level):
                matches = False
        
        # Geographic check
        if eligibility_rules.state and user_profile.state != eligibility_rules.state:
            matches = False
        if eligibility_rules.district and user_profile.district != eligibility_rules.district:
            matches = False
        
        return matches
    ```

    **SNS Message Format**:
    ```
    🎯 New Scheme Alert!

    {scheme_name}

    You may be eligible! Check details: {chat_url}

    Reply STOP to unsubscribe
    ```



    ### 2. ChatHandler Lambda (Chat Engine)

    **Endpoints**:
    - POST /chat - Send message
    - POST /chat/upload - Upload PDF
    - GET /chat/history/{session_id} - Retrieve conversation

    **Flow for POST /chat**:
    ```
    1. Validate JWT token
    2. Extract user_id and session_id
    3. Retrieve conversation history from DynamoDB
    4. Check if PDF context exists (from upload)
    5. Build Bedrock prompt with context
    6. Invoke Bedrock Nova Lite
    7. Parse response
    8. Save message exchange to Conversations table
    9. Return response to client
    ```

    **Flow for POST /chat/upload**:
    ```
    1. Validate JWT token
    2. Validate PDF (size < 5MB)
    3. Generate session_id if new
    4. Upload to S3 with 24-hour lifecycle
    5. Store pdf_s3_key in Conversations table
    6. Return acknowledgment
    ```

    **Bedrock Prompt Template for Chat**:
    ```
    You are a helpful assistant for Indian government schemes.
    Respond in Hinglish (mix of Hindi and English).
    Keep responses simple and actionable.

    Context: {scheme_context or pdf_content}

    Conversation History:
    {previous_messages}

    User Question: {current_question}

    Provide a clear, concise answer in Hinglish.
    ```

    **Eligibility Checklist Generation**:
    ```python
    def generate_eligibility_checklist(user_profile, scheme_rules):
        checklist = []
        overall_eligible = True
        
        # Age criterion
        age_status = "Yes" if (scheme_rules.age_min <= user_profile.age <= scheme_rules.age_max) else "No"
        checklist.append({
            "criterion": "Age",
            "user_value": user_profile.age,
            "required": f"{scheme_rules.age_min}-{scheme_rules.age_max}",
            "status": age_status
        })
        if age_status == "No":
            overall_eligible = False
        
        # Income criterion
        income_status = "Yes" if user_profile.income <= scheme_rules.income_max else "No"
        checklist.append({
            "criterion": "Income",
            "user_value": user_profile.income,
            "required": f"<= {scheme_rules.income_max}",
            "status": income_status
        })
        if income_status == "No":
            overall_eligible = False
        
        # Education criterion
        edu_status = "Yes" if meets_education(user_profile.education_level, 
                                            scheme_rules.education_level) else "No"
        checklist.append({
            "criterion": "Education",
            "user_value": user_profile.education_level,
            "required": scheme_rules.education_level,
            "status": edu_status
        })
        if edu_status == "No":
            overall_eligible = False
        
        return {
            "overall_status": "Eligible" if overall_eligible else "Not Eligible",
            "checklist": checklist
        }
    ```



    ### 3. UserHandler Lambda

    **Endpoints**:
    - POST /users - Create user profile
    - GET /users/{user_id} - Retrieve user profile
    - PUT /users/{user_id} - Update user profile

    **Flow for POST /users**:
    ```
    1. Validate request payload
    2. Validate phone number (10-digit Indian mobile)
    3. Validate age (1-120)
    4. Validate income (non-negative)
    5. Generate user_id (UUID)
    6. Encrypt phone_number
    7. Save to Users DynamoDB table
    8. Return user_id and JWT token
    ```

    **Flow for GET /users/{user_id}**:
    ```
    1. Validate JWT token
    2. Verify user_id matches token
    3. Query Users table
    4. Decrypt phone_number
    5. Return user profile
    ```

    **Flow for PUT /users/{user_id}**:
    ```
    1. Validate JWT token
    2. Verify user_id matches token
    3. Validate updated fields
    4. Update Users table
    5. Return updated profile
    ```

    **Validation Rules**:
    ```python
    def validate_user_input(data):
        errors = []
        
        # Phone number: 10 digits starting with 6-9
        if not re.match(r'^[6-9]\d{9}$', data.phone_number):
            errors.append("Invalid phone number format")
        
        # Age: 1-120
        if not (1 <= data.age <= 120):
            errors.append("Age must be between 1 and 120")
        
        # Income: non-negative
        if data.income < 0:
            errors.append("Income must be non-negative")
        
        # Education level: valid enum
        valid_education = ["illiterate", "primary", "secondary", "higher_secondary", 
                        "graduate", "postgraduate"]
        if data.education_level not in valid_education:
            errors.append("Invalid education level")
        
        return errors
    ```



    ## API Gateway Design

    ### Endpoints

    | Method | Path | Lambda | Auth | Description |
    |--------|------|--------|------|-------------|
    | POST | /schemes | ProcessScheme | API Key | Admin upload scheme PDF |
    | POST | /users | UserHandler | None | Register new user |
    | GET | /users/{user_id} | UserHandler | JWT | Get user profile |
    | PUT | /users/{user_id} | UserHandler | JWT | Update user profile |
    | POST | /chat | ChatHandler | JWT | Send chat message |
    | POST | /chat/upload | ChatHandler | JWT | Upload PDF for chat |
    | GET | /chat/history/{session_id} | ChatHandler | JWT | Get conversation history |
    | GET | /health | HealthCheck | None | System health status |

    ### CORS Configuration
    ```yaml
    AllowOrigins: ['*']
    AllowMethods: ['GET', 'POST', 'PUT', 'OPTIONS']
    AllowHeaders: ['Content-Type', 'Authorization', 'X-Api-Key']
    ```

    ### Rate Limiting
    - 100 requests per minute per IP address
    - Implemented via API Gateway usage plans

    ### Request/Response Schemas

    **POST /users Request**:
    ```json
    {
    "phone_number": "string",
    "age": "number",
    "income": "number",
    "education_level": "string",
    "state": "string",
    "district": "string"
    }
    ```

    **POST /users Response**:
    ```json
    {
    "user_id": "string",
    "token": "string (JWT)",
    "message": "User registered successfully"
    }
    ```

    **POST /chat Request**:
    ```json
    {
    "session_id": "string (optional)",
    "message": "string",
    "user_id": "string"
    }
    ```

    **POST /chat Response**:
    ```json
    {
    "session_id": "string",
    "response": "string (Hinglish)",
    "eligibility_checklist": "object (optional)",
    "timestamp": "number"
    }
    ```



    ## Security Design

    ### Authentication & Authorization

    **API Key Authentication (Admin)**:
    - Used for POST /schemes endpoint
    - Stored in AWS Secrets Manager
    - Validated in API Gateway

    **JWT Authentication (Users)**:
    - Issued upon user registration
    - Contains: user_id, phone_number, exp (expiration)
    - Validated in Lambda authorizer
    - 24-hour expiration

    **Authorization Logic**:
    ```python
    def authorize_user_access(token_user_id, requested_user_id):
        if token_user_id != requested_user_id:
            raise UnauthorizedError("Cannot access other user's data")
    ```

    ### Data Encryption

    **At Rest**:
    - DynamoDB encryption enabled (AWS managed keys)
    - S3 bucket encryption enabled (SSE-S3)
    - Phone numbers encrypted with AWS KMS

    **In Transit**:
    - HTTPS enforced on API Gateway
    - TLS 1.2+ required

    ### Input Sanitization

    ```python
    def sanitize_input(user_input):
        # Remove SQL injection patterns
        sanitized = re.sub(r'[;\'"\\]', '', user_input)
        
        # Limit length
        sanitized = sanitized[:1000]
        
        # Remove script tags
        sanitized = re.sub(r'<script.*?</script>', '', sanitized, flags=re.IGNORECASE)
        
        return sanitized
    ```

    ### IAM Policies

    **ProcessScheme Lambda**:
    ```yaml
    Policies:
    - S3ReadPolicy:
        BucketName: civicbridge-schemes
    - DynamoDBCrudPolicy:
        TableName: Schemes
    - DynamoDBReadPolicy:
        TableName: Users
    - SNSPublishMessagePolicy:
        TopicName: scheme-notifications
    - BedrockInvokeModelPolicy:
        ModelId: amazon.nova-pro-v1:0
    ```

    **ChatHandler Lambda**:
    ```yaml
    Policies:
    - S3CrudPolicy:
        BucketName: civicbridge-chat-uploads
    - DynamoDBCrudPolicy:
        TableName: Conversations
    - DynamoDBReadPolicy:
        TableName: Schemes
    - BedrockInvokeModelPolicy:
        ModelId: amazon.nova-lite-v1:0
    ```

    **UserHandler Lambda**:
    ```yaml
    Policies:
    - DynamoDBCrudPolicy:
        TableName: Users
    - KMSDecryptPolicy:
        KeyId: phone-encryption-key
    ```



    ## Error Handling

    ### Error Categories

    ```python
    class ValidationError(Exception):
        status_code = 400

    class UnauthorizedError(Exception):
        status_code = 401

    class NotFoundError(Exception):
        status_code = 404

    class BedrockError(Exception):
        status_code = 503

    class DynamoDBError(Exception):
        status_code = 500

    class S3Error(Exception):
        status_code = 500

    class SNSError(Exception):
        status_code = 500
    ```

    ### Error Response Format

    ```json
    {
    "error": {
        "code": "string",
        "message": "string",
        "details": "object (optional)",
        "timestamp": "number"
    }
    }
    ```

    ### Retry Logic

    **Bedrock API Calls**:
    ```python
    def invoke_bedrock_with_retry(model_id, prompt, max_retries=3):
        for attempt in range(max_retries):
            try:
                response = bedrock_client.invoke_model(
                    modelId=model_id,
                    body=json.dumps({"prompt": prompt})
                )
                return response
            except ThrottlingException:
                wait_time = 2 ** attempt  # Exponential backoff
                time.sleep(wait_time)
            except Exception as e:
                if attempt == max_retries - 1:
                    raise BedrockError(f"Failed after {max_retries} attempts: {str(e)}")
    ```

    **DynamoDB Operations**:
    ```python
    def write_to_dynamodb_with_retry(table, item, max_retries=3):
        for attempt in range(max_retries):
            try:
                table.put_item(Item=item)
                return
            except ClientError as e:
                if e.response['Error']['Code'] == 'ProvisionedThroughputExceededException':
                    wait_time = 2 ** attempt
                    time.sleep(wait_time)
                else:
                    raise DynamoDBError(str(e))
    ```

    ### Logging

    **Structured Log Format**:
    ```json
    {
    "timestamp": "ISO8601",
    "level": "INFO|WARN|ERROR",
    "function": "string",
    "request_id": "string",
    "user_id": "string (optional)",
    "message": "string",
    "error": "object (optional)",
    "duration_ms": "number (optional)"
    }
    ```

    **CloudWatch Alarms**:
    - Lambda error rate > 5%
    - Bedrock throttling errors
    - DynamoDB read/write capacity exceeded
    - API Gateway 5xx errors > 10 per minute



    ## AWS Free Tier Optimization

    ### Resource Limits

    **Lambda**:
    - Memory: 512MB per function
    - Timeout: 30 seconds
    - Concurrent executions: 10
    - Monthly invocations: Stay under 1M free tier

    **DynamoDB**:
    - On-demand pricing mode
    - Estimated: 25 GB storage, 200M read/write requests per month (within free tier)

    **S3**:
    - Total storage: < 5GB
    - GET requests: < 20,000 per month
    - PUT requests: < 2,000 per month
    - Lifecycle policy: Delete chat uploads after 24 hours

    **Bedrock**:
    - Nova Pro: Limit to 5,000 input tokens per scheme PDF
    - Nova Lite: Limit to 500 tokens per chat message
    - Monthly budget: 10,000 input + 10,000 output tokens
    - Implement request throttling when approaching limits

    **SNS**:
    - SMS: 100 free messages per month (promotional)
    - Batch notifications to stay within limit

    ### Cost Monitoring

    ```python
    def check_bedrock_usage():
        # Track token usage in DynamoDB
        current_usage = get_monthly_token_count()
        
        if current_usage > 8000:  # 80% of free tier
            send_admin_alert("Approaching Bedrock free tier limit")
            enable_throttling()
        
        return current_usage < 10000

    def enable_throttling():
        # Reduce concurrent Lambda executions
        # Queue requests instead of processing immediately
        pass
    ```



    ## Correctness Properties

    ### Property 1: Eligibility Rule Extraction Idempotence
    **Statement**: For any valid scheme PDF, extracting eligibility rules multiple times SHALL produce equivalent JSON structures

    **Formalization**:
    ```
    ∀ pdf ∈ ValidSchemePDFs:
    extract(pdf) ≈ extract(pdf)
    
    Where ≈ means structurally equivalent (same required fields, compatible values)
    ```

    **Test Strategy**: Property-based test with sample PDFs, extract twice, compare JSON schemas

    **Validates**: Requirement 2.6

    ---

    ### Property 2: User Matching Symmetry
    **Statement**: If a user matches a scheme's eligibility rules, then the scheme's rules must be satisfied by the user's profile

    **Formalization**:
    ```
    ∀ user ∈ Users, scheme ∈ Schemes:
    matches(user, scheme.rules) = true ⟹
        (user.age ≥ scheme.rules.age_min ∧ 
        user.age ≤ scheme.rules.age_max ∧
        user.income ≤ scheme.rules.income_max ∧
        meets_education(user.education, scheme.rules.education))
    ```

    **Test Strategy**: Generate random user profiles and scheme rules, verify matching logic consistency

    **Validates**: Requirement 4.2

    ---

    ### Property 3: SMS Notification Completeness
    **Statement**: For every matched user, exactly one SMS notification SHALL be sent (no duplicates, no omissions)

    **Formalization**:
    ```
    ∀ scheme ∈ Schemes:
    matched_users = {u ∈ Users | matches(u, scheme.rules)}
    sent_sms = send_notifications(matched_users)
    
    |sent_sms| = |matched_users| ∧
    ∀ u ∈ matched_users: ∃! sms ∈ sent_sms: sms.recipient = u.phone_number
    ```

    **Test Strategy**: Mock SNS, verify one-to-one correspondence between matched users and sent messages

    **Validates**: Requirement 5.1, 5.4

    ---

    ### Property 4: Conversation Context Preservation
    **Statement**: Chat responses SHALL maintain conversation context across message exchanges within a session

    **Formalization**:
    ```
    ∀ session ∈ Sessions, messages ∈ session.messages:
    response(messages[i]) depends_on messages[0..i-1]
    
    Where depends_on means the response considers previous context
    ```

    **Test Strategy**: Send multi-turn conversation, verify responses reference earlier messages

    **Validates**: Requirement 8.5

    ---

    ### Property 5: Authorization Boundary Enforcement
    **Statement**: Users SHALL only access their own profile data, never other users' data

    **Formalization**:
    ```
    ∀ user_a, user_b ∈ Users where user_a ≠ user_b:
    ∀ request with token(user_a):
        access(user_b.profile) = UNAUTHORIZED
    ```

    **Test Strategy**: Generate JWT for user A, attempt to access user B's profile, verify 401 response

    **Validates**: Requirement 14.3

    ---

    ### Property 6: Input Sanitization Completeness
    **Statement**: All user inputs SHALL be sanitized before processing to prevent injection attacks

    **Formalization**:
    ```
    ∀ input ∈ UserInputs:
    processed_input = sanitize(input)
    
    ¬contains_sql_injection(processed_input) ∧
    ¬contains_script_tags(processed_input) ∧
    length(processed_input) ≤ MAX_LENGTH
    ```

    **Test Strategy**: Generate inputs with malicious patterns, verify sanitization removes them

    **Validates**: Requirement 14.6

    ---

    ### Property 7: Eligibility Checklist Consistency
    **Statement**: The eligibility checklist overall status SHALL match the individual criterion statuses

    **Formalization**:
    ```
    ∀ user ∈ Users, scheme ∈ Schemes:
    checklist = generate_checklist(user, scheme)
    
    checklist.overall_status = "Eligible" ⟺
        ∀ criterion ∈ checklist.items: criterion.status = "Yes"
    ```

    **Test Strategy**: Generate random user/scheme pairs, verify overall status matches all criteria

    **Validates**: Requirement 9.4

    ---

    ### Property 8: API Response Time Consistency
    **Statement**: Chat responses SHALL be returned within 3 seconds for 95% of queries under normal load

    **Formalization**:
    ```
    ∀ queries ∈ ChatQueries:
    P(response_time(query) ≤ 3000ms) ≥ 0.95
    
    Where P is probability over a sample of queries
    ```

    **Test Strategy**: Load test with concurrent requests, measure response time distribution

    **Validates**: Requirement 8.4

    ---

    ### Property 9: Data Encryption at Rest
    **Statement**: All sensitive data (phone numbers) SHALL be encrypted in DynamoDB

    **Formalization**:
    ```
    ∀ user ∈ Users:
    stored_phone = dynamodb.get(user.user_id).phone_number
    
    is_encrypted(stored_phone) = true ∧
    decrypt(stored_phone) = user.original_phone_number
    ```

    **Test Strategy**: Write user to DynamoDB, read raw data, verify encryption, decrypt and compare

    **Validates**: Requirement 6.5

    ---

    ### Property 10: Free Tier Compliance
    **Statement**: System resource usage SHALL remain within AWS Free Tier limits

    **Formalization**:
    ```
    ∀ month ∈ OperationalPeriod:
    s3_storage(month) ≤ 5GB ∧
    lambda_invocations(month) ≤ 1M ∧
    bedrock_tokens(month) ≤ 20K ∧
    dynamodb_storage(month) ≤ 25GB
    ```

    **Test Strategy**: Monitor CloudWatch metrics, verify usage stays below thresholds

    **Validates**: Requirement 10.1-10.5



    ## Deployment Strategy

    ### SAM Template Structure

    ```yaml
    AWSTemplateFormatVersion: '2010-09-09'
    Transform: AWS::Serverless-2016-10-31

    Globals:
    Function:
        Runtime: python3.11
        MemorySize: 512
        Timeout: 30
        Tracing: Active
        Environment:
        Variables:
            SCHEMES_TABLE: !Ref SchemesTable
            USERS_TABLE: !Ref UsersTable
            CONVERSATIONS_TABLE: !Ref ConversationsTable
            SCHEMES_BUCKET: !Ref SchemesBucket
            CHAT_BUCKET: !Ref ChatBucket
            SNS_TOPIC: !Ref NotificationTopic
            NOVA_PRO_MODEL: amazon.nova-pro-v1:0
            NOVA_LITE_MODEL: amazon.nova-lite-v1:0

    Resources:
    # S3 Buckets
    SchemesBucket:
        Type: AWS::S3::Bucket
        Properties:
        BucketEncryption:
            ServerSideEncryptionConfiguration:
            - ServerSideEncryptionByDefault:
                SSEAlgorithm: AES256
        PublicAccessBlockConfiguration:
            BlockPublicAcls: true
            BlockPublicPolicy: true
            IgnorePublicAcls: true
            RestrictPublicBuckets: true
        NotificationConfiguration:
            LambdaConfigurations:
            - Event: s3:ObjectCreated:*
                Function: !GetAtt ProcessSchemeFunction.Arn
                Filter:
                S3Key:
                    Rules:
                    - Name: prefix
                        Value: schemes/
                    - Name: suffix
                        Value: .pdf

    ChatBucket:
        Type: AWS::S3::Bucket
        Properties:
        BucketEncryption:
            ServerSideEncryptionConfiguration:
            - ServerSideEncryptionByDefault:
                SSEAlgorithm: AES256
        LifecycleConfiguration:
            Rules:
            - Id: DeleteChatUploadsAfter24Hours
                Status: Enabled
                ExpirationInDays: 1
                Prefix: chat/

    # DynamoDB Tables
    SchemesTable:
        Type: AWS::DynamoDB::Table
        Properties:
        AttributeDefinitions:
            - AttributeName: scheme_id
            AttributeType: S
        KeySchema:
            - AttributeName: scheme_id
            KeyType: HASH
        BillingMode: PAY_PER_REQUEST
        SSESpecification:
            SSEEnabled: true

    UsersTable:
        Type: AWS::DynamoDB::Table
        Properties:
        AttributeDefinitions:
            - AttributeName: user_id
            AttributeType: S
        KeySchema:
            - AttributeName: user_id
            KeyType: HASH
        BillingMode: PAY_PER_REQUEST
        SSESpecification:
            SSEEnabled: true

    ConversationsTable:
        Type: AWS::DynamoDB::Table
        Properties:
        AttributeDefinitions:
            - AttributeName: session_id
            AttributeType: S
        KeySchema:
            - AttributeName: session_id
            KeyType: HASH
        BillingMode: PAY_PER_REQUEST
        SSESpecification:
            SSEEnabled: true

    # SNS Topic
    NotificationTopic:
        Type: AWS::SNS::Topic
        Properties:
        DisplayName: CivicBridge Scheme Notifications

    # Lambda Functions
    ProcessSchemeFunction:
        Type: AWS::Serverless::Function
        Properties:
        CodeUri: src/process_scheme/
        Handler: app.lambda_handler
        Policies:
            - S3ReadPolicy:
                BucketName: !Ref SchemesBucket
            - DynamoDBCrudPolicy:
                TableName: !Ref SchemesTable
            - DynamoDBReadPolicy:
                TableName: !Ref UsersTable
            - SNSPublishMessagePolicy:
                TopicName: !GetAtt NotificationTopic.TopicName
            - Statement:
                - Effect: Allow
                Action:
                    - bedrock:InvokeModel
                Resource: arn:aws:bedrock:*::foundation-model/amazon.nova-pro-v1:0

    ChatHandlerFunction:
        Type: AWS::Serverless::Function
        Properties:
        CodeUri: src/chat_handler/
        Handler: app.lambda_handler
        Policies:
            - S3CrudPolicy:
                BucketName: !Ref ChatBucket
            - DynamoDBCrudPolicy:
                TableName: !Ref ConversationsTable
            - DynamoDBReadPolicy:
                TableName: !Ref SchemesTable
            - Statement:
                - Effect: Allow
                Action:
                    - bedrock:InvokeModel
                Resource: arn:aws:bedrock:*::foundation-model/amazon.nova-lite-v1:0
        Events:
            PostChat:
            Type: Api
            Properties:
                Path: /chat
                Method: post
                RestApiId: !Ref CivicBridgeApi
            PostChatUpload:
            Type: Api
            Properties:
                Path: /chat/upload
                Method: post
                RestApiId: !Ref CivicBridgeApi
            GetChatHistory:
            Type: Api
            Properties:
                Path: /chat/history/{session_id}
                Method: get
                RestApiId: !Ref CivicBridgeApi

    UserHandlerFunction:
        Type: AWS::Serverless::Function
        Properties:
        CodeUri: src/user_handler/
        Handler: app.lambda_handler
        Policies:
            - DynamoDBCrudPolicy:
                TableName: !Ref UsersTable
        Events:
            CreateUser:
            Type: Api
            Properties:
                Path: /users
                Method: post
                RestApiId: !Ref CivicBridgeApi
            GetUser:
            Type: Api
            Properties:
                Path: /users/{user_id}
                Method: get
                RestApiId: !Ref CivicBridgeApi
            UpdateUser:
            Type: Api
            Properties:
                Path: /users/{user_id}
                Method: put
                RestApiId: !Ref CivicBridgeApi

    # API Gateway
    CivicBridgeApi:
        Type: AWS::Serverless::Api
        Properties:
        StageName: prod
        Cors:
            AllowOrigin: "'*'"
            AllowMethods: "'GET,POST,PUT,OPTIONS'"
            AllowHeaders: "'Content-Type,Authorization,X-Api-Key'"
        TracingEnabled: true

    Outputs:
    ApiEndpoint:
        Description: API Gateway endpoint URL
        Value: !Sub "https://${CivicBridgeApi}.execute-api.${AWS::Region}.amazonaws.com/prod"
    
    SchemesBucketName:
        Description: S3 bucket for scheme PDFs
        Value: !Ref SchemesBucket
    
    ChatBucketName:
        Description: S3 bucket for chat uploads
        Value: !Ref ChatBucket
    ```

    ### Deployment Commands

    ```bash
    # Build
    sam build

    # Deploy
    sam deploy --guided

    # First deployment will prompt for:
    # - Stack name: civicbridge-ai
    # - AWS Region: ap-south-1 (Mumbai)
    # - Confirm changes before deploy: Y
    # - Allow SAM CLI IAM role creation: Y
    # - Save arguments to configuration file: Y
    ```



    ## Frontend Design (Kiro Implementation)

    ### Admin Dashboard

    **Components**:
    - File upload widget for scheme PDFs
    - Upload progress indicator
    - Scheme list with status (processing/active/failed)
    - Error display for failed extractions

    **Key Features**:
    - Drag-and-drop PDF upload
    - Real-time status updates
    - API key management

    ### User Registration Form

    **Fields**:
    - Phone number (10-digit validation)
    - Age (numeric input, 1-120)
    - Income (numeric input, non-negative)
    - Education level (dropdown)
    - State (dropdown)
    - District (dropdown)

    **Validation**:
    - Client-side validation before submission
    - Error messages in Hinglish
    - Success message with JWT token storage

    ### Chat Interface

    **Layout**:
    ```
    ┌─────────────────────────────────────┐
    │  CivicBridge AI Chat                │
    ├─────────────────────────────────────┤
    │                                     │
    │  [PDF Upload Button]                │
    │                                     │
    │  ┌─────────────────────────────┐   │
    │  │ Conversation History        │   │
    │  │                             │   │
    │  │ User: Kya main eligible hu? │   │
    │  │                             │   │
    │  │ Bot: Haan, aap eligible ho! │   │
    │  │ [Eligibility Checklist]     │   │
    │  │                             │   │
    │  └─────────────────────────────┘   │
    │                                     │
    │  [Message Input Box]     [Send]    │
    └─────────────────────────────────────┘
    ```

    **Features**:
    - Auto-scroll to latest message
    - Loading indicator during API calls
    - PDF upload with preview
    - Eligibility checklist with color-coded status
    - Hinglish error messages

    ### Eligibility Checklist Display

    ```
    ✅ Age: 25 (Required: 18-60) - Yes
    ✅ Income: ₹50,000 (Required: ≤ ₹1,00,000) - Yes
    ✅ Education: Graduate (Required: Graduate) - Yes
    ❌ State: Maharashtra (Required: Karnataka) - No

    Overall Status: Not Eligible
    ```

    **Color Coding**:
    - Green (✅) for "Yes"
    - Red (❌) for "No"
    - Yellow (⚠️) for "Partial"

    ### Responsive Design

    **Mobile (320px-768px)**:
    - Single column layout
    - Collapsible checklist
    - Bottom-fixed message input

    **Desktop (>768px)**:
    - Two-column layout (chat + sidebar)
    - Expanded checklist
    - Keyboard shortcuts



    ## Testing Strategy

    ### Unit Tests

    **ProcessScheme Lambda**:
    - PDF validation (size, format)
    - JSON extraction and validation
    - User matching algorithm
    - SNS message formatting

    **ChatHandler Lambda**:
    - JWT validation
    - Conversation context building
    - Eligibility checklist generation
    - Hinglish response formatting

    **UserHandler Lambda**:
    - Input validation (phone, age, income)
    - User creation and updates
    - Authorization checks

    ### Integration Tests

    - S3 → Lambda → DynamoDB flow
    - API Gateway → Lambda → Bedrock flow
    - End-to-end user registration and chat

    ### Property-Based Tests

    - Property 1: Eligibility extraction idempotence
    - Property 2: User matching symmetry
    - Property 3: SMS notification completeness
    - Property 5: Authorization boundary enforcement
    - Property 6: Input sanitization completeness
    - Property 7: Eligibility checklist consistency
    - Property 9: Data encryption at rest

    ### Load Tests

    - Concurrent chat requests (100 users)
    - Bulk user matching (10,000 users)
    - API Gateway rate limiting

    ### Security Tests

    - SQL injection attempts
    - XSS attempts
    - Unauthorized access attempts
    - JWT token tampering



    ## Monitoring and Observability

    ### CloudWatch Metrics

    **Lambda Metrics**:
    - Invocation count
    - Error rate
    - Duration (p50, p95, p99)
    - Concurrent executions
    - Throttles

    **DynamoDB Metrics**:
    - Read/write capacity units consumed
    - Throttled requests
    - System errors

    **API Gateway Metrics**:
    - Request count by endpoint
    - 4xx/5xx error rates
    - Latency (p50, p95, p99)

    **Bedrock Metrics**:
    - Token usage (input/output)
    - Model invocation count
    - Throttling errors

    ### CloudWatch Alarms

    ```yaml
    Alarms:
    - Name: HighLambdaErrorRate
        Metric: Errors
        Threshold: 5%
        Action: Send SNS notification to admin
    
    - Name: BedrockThrottling
        Metric: ThrottledRequests
        Threshold: 10 per 5 minutes
        Action: Enable request queuing
    
    - Name: ApiGateway5xxErrors
        Metric: 5XXError
        Threshold: 10 per minute
        Action: Send SNS notification to admin
    
    - Name: BedrockTokenUsageHigh
        Metric: TokenUsage
        Threshold: 8000 tokens per month
        Action: Send warning to admin
    ```

    ### X-Ray Tracing

    - Enabled for all Lambda functions
    - Trace API Gateway → Lambda → Bedrock flows
    - Identify performance bottlenecks
    - Visualize service dependencies

    ### Logging Best Practices

    - Use structured JSON logging
    - Include request_id in all logs
    - Log entry/exit of functions
    - Log external API calls (Bedrock, DynamoDB)
    - Sanitize sensitive data (phone numbers) in logs



    ## Implementation Notes

    ### Technology Choices

    **Python 3.11 for Lambda**:
    - Native AWS SDK (boto3) support
    - Rich ecosystem for PDF processing (PyPDF2, pdfplumber)
    - Simple JSON handling
    - Good Bedrock SDK support

    **Alternative: Node.js 18.x**:
    - Faster cold starts
    - Good for API-heavy workloads
    - AWS SDK v3 support

    **Recommendation**: Python for ProcessScheme (PDF processing), Node.js for ChatHandler/UserHandler (API-focused)

    ### Bedrock Model Selection

    **Nova Pro (amazon.nova-pro-v1:0)**:
    - Use for: Complex PDF analysis, eligibility rule extraction
    - Strengths: Better understanding of structured documents
    - Cost: Higher token usage

    **Nova Lite (amazon.nova-lite-v1:0)**:
    - Use for: Chat responses, simple queries
    - Strengths: Low latency, cost-effective
    - Cost: Lower token usage

    ### Development Workflow

    1. Set up AWS SAM CLI locally
    2. Create Lambda function stubs
    3. Implement core logic with unit tests
    4. Test locally with `sam local start-api`
    5. Deploy to AWS with `sam deploy`
    6. Test with Postman/curl
    7. Build frontend with Kiro
    8. Integrate frontend with API Gateway

    ### Future Enhancements

    - Multi-language support (Hindi, Tamil, Telugu)
    - Voice interface integration
    - WhatsApp bot integration
    - Machine learning for better eligibility prediction
    - Analytics dashboard for scheme effectiveness
    - Mobile app (React Native)

