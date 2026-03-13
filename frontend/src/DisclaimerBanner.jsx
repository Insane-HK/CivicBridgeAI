import React from 'react';
import { AlertCircle, Info, Shield } from 'lucide-react';

export default function DisclaimerBanner() {
    return (
        <div style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            padding: '1.5rem',
            borderRadius: '16px',
            marginBottom: '1.5rem',
            boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)'
        }}>
            <div style={{ display: 'flex', alignItems: 'start', gap: '12px', marginBottom: '12px' }}>
                <Shield size={24} style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                    <h3 style={{ margin: '0 0 8px', fontSize: '1.1rem', fontWeight: 700 }}>
                        🚀 CivicBridge AI - Demo/Testing Mode
                    </h3>
                    <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: 1.6, opacity: 0.95 }}>
                        This is a proof-of-concept application showcasing AI-powered government scheme discovery. Please note the following:
                    </p>
                </div>
            </div>

            <div style={{ display: 'grid', gap: '10px', marginLeft: '36px' }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'start' }}>
                    <Info size={16} style={{ flexShrink: 0, marginTop: '3px' }} />
                    <div style={{ fontSize: '0.85rem', lineHeight: 1.5 }}>
                        <strong>Mock Aadhaar Data:</strong> All Aadhaar lookups return simulated data for testing. Real Aadhaar integration requires government approval and UIDAI compliance.
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'start' }}>
                    <Info size={16} style={{ flexShrink: 0, marginTop: '3px' }} />
                    <div style={{ fontSize: '0.85rem', lineHeight: 1.5 }}>
                        <strong>SMS Disabled:</strong> Registration works but we're NOT sending any SMS notifications to prevent spam. Your data is stored securely in AWS DynamoDB.
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'start' }}>
                    <Info size={16} style={{ flexShrink: 0, marginTop: '3px' }} />
                    <div style={{ fontSize: '0.85rem', lineHeight: 1.5 }}>
                        <strong>AI Responses:</strong> Powered by Amazon Bedrock Nova. Rate limited to 10 requests/minute per user to prevent abuse. Responses are AI-generated and should be verified with official sources.
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'start' }}>
                    <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '3px' }} />
                    <div style={{ fontSize: '0.85rem', lineHeight: 1.5 }}>
                        <strong>Guardrails Active:</strong> Rate limiting, input validation, and spam prevention measures are in place. Malicious requests will be blocked.
                    </div>
                </div>
            </div>

            <div style={{
                marginTop: '12px',
                paddingTop: '12px',
                borderTop: '1px solid rgba(255,255,255,0.3)',
                fontSize: '0.75rem',
                opacity: 0.9
            }}>
                ⚠️ This is a demonstration project. Always verify scheme eligibility and details on official government websites before applying.
            </div>
        </div>
    );
}
