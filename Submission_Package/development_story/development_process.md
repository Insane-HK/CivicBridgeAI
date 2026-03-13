# The Development Process

### Idea Formation
We started with the question: "How can we use generative AI for social good rather than just another B2B SaaS tool?"

### Design Decisions
1. **Serverless Backend:** We knew we couldn't handle scaling servers if a scheme went viral locally. AWS SAM + Lambda was the obvious choice.
2. **React + Tailwind:** For rapid UI prototyping, React combined with Tailwind allowed us to build accessible interfaces quickly.
3. **Mocking Aadhaar:** To avoid real PII legal issues during the hackathon/demo phase, we heavily utilized a mock Aadhaar registry to simulate real-world demographic mapping.

### Major Challenges
- We encountered a stubborn `503 Error` when communicating with Amazon Bedrock due to a bad payload schema when switching from Claude Haiku to Amazon Nova models.
- **Solution:** We thoroughly audited the `ChatHandler` Lambda logs, corrected the schema validation in the Python script, and successfully hot-swapped the model without bringing down the system.
