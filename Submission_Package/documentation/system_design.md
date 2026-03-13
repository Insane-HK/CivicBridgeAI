# System Design

Our design philosophy focuses on being highly scalable while maintaining low operational costs via a serverless architecture.

![System Component VOD](media_assets/system_design.vod)
*(Placeholder for an architectural walkthrough video)*

- **Compute:** AWS Lambda instances handle dynamic loads automatically. 
- **Database:** DynamoDB was chosen for rapid key-value retrieval. Users retrieve their exact conversation histories and scheme lists in milliseconds.
- **Frontend Hosting:** Nginx on an EC2 instance provides a robust web server that handles client-side routing fallback (`try_files`) effortlessly.
