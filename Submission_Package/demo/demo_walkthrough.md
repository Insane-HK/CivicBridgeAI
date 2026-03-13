# Demo Walkthrough

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
