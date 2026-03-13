# Scalability Considerations

Since the core backend runs on AWS Lambda and DynamoDB (PAY_PER_REQUEST), the application scales horizontally by default.

Potential bottlenecks to watch out for:
1. **Bedrock Quotas:** High traffic might hit Bedrock's Tokens-Per-Minute limits. We plan to implement payload caching or a queuing mechanism in the future.
2. **EC2 Instance Size:** The frontend is currently on a `t3.micro`. Setting up a CloudFront CDN and an S3 static bucket is planned for greater geographic distribution and scaling.
