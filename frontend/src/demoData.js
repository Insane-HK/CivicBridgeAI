// Demo data for offline showcase — no API needed
export const DEMO_SCHEMES = [
    {
        id: 'pm_kisan',
        name: 'PM-KISAN (Pradhan Mantri Kisan Samman Nidhi)',
        text: `PM-KISAN Scheme — Central Government of India

ELIGIBILITY CRITERIA:
1. The scheme provides income support of ₹6,000 per year to all landholding farmers' families.
2. Age: Farmer must be between 18 to 70 years old.
3. Land Holding: All farmer families that own culturable land up to 2 hectares (5 acres) are eligible.
4. Income: Annual family income should not exceed ₹1,50,000 per year from all sources.
5. Residency: The farmer must be an Indian citizen residing in India.
6. Education: No minimum education qualification required.
7. Exclusions: Former and current holders of Constitutional posts, serving/retired IAS/IPS/IRS officers, and individuals paying Income Tax are NOT eligible.
8. Bank Account: The farmer must have a valid bank account for direct benefit transfer (DBT).`,
        sampleQ: 'Main 45 saal ka farmer hoon, mere paas 1.5 hectare zameen hai aur saal mein 1 lakh kamaata hoon. Kya main eligible hoon?',
        mockResponse: {
            answer: 'Haan bhai, aap PM-KISAN scheme ke liye eligible hain! 🎉\n\nAapki umar 45 saal hai jo 18-70 ke range mein hai ✅\nAapki 1.5 hectare zameen 2 hectare se kam hai ✅\nAapki ₹1 lakh annual income bhi limit ke andar hai ✅\n\nAapko ₹6,000 per year milega — ₹2,000 ki teen installments mein. Iske liye PM-KISAN portal (pmkisan.gov.in) par register karein ya apne nearest Common Service Centre (CSC) jaayein.',
            checklist: [
                { criterion: 'Age: 18–70 years', met: 'Yes' },
                { criterion: 'Land: ≤2 hectares owned', met: 'Yes' },
                { criterion: 'Annual income ≤ ₹1,50,000', met: 'Yes' },
                { criterion: 'Indian citizen & resident', met: 'Yes' },
                { criterion: 'Not an income tax payer', met: 'Unknown' },
                { criterion: 'Valid bank account for DBT', met: 'Unknown' },
            ],
        },
    },
    {
        id: 'vidyalakshmi',
        name: 'Vidya Lakshmi Education Loan Scheme',
        text: `Vidya Lakshmi Scheme — Ministry of Finance, Government of India

ELIGIBILITY CRITERIA:
1. Indian nationality.
2. Must have secured admission in a recognized college / university / professional course.
3. Student must be between 18 to 35 years of age.
4. Courses covered: Graduation, Post-graduation, Professional courses (Engineering, Medical, MBA, MCA, B.Ed., Law etc.)
5. Annual family income: No fixed upper limit, but priority given to families with income below ₹4.50 lakhs per annum.
6. Loan Amount: Up to ₹20 Lakhs for studies in India; up to ₹30 Lakhs for abroad.
7. Collateral: Not required for loans up to ₹7.5 Lakhs.
8. Moratorium: Course period + 1 year (or 6 months after getting job, whichever is earlier).
9. Interest Subsidy: Provided for economically weaker sections (EWS) — families with annual income below ₹4.5 lakhs.`,
        sampleQ: 'Main 22 saal ka B.Tech student hoon aur meri family ki income 3 lakh per year hai. Kya mujhe education loan mil sakta hai?',
        mockResponse: {
            answer: 'Bilkul! Vidya Lakshmi scheme ke tahat aap education loan ke liye eligible hain! 📚\n\nAap 22 saal ke hain (18-35 range mein) ✅\nB.Tech ek covered professional course hai ✅\nAapki family income ₹3 lakh hai jo ₹4.5 lakh se kam hai — toh aapko interest subsidy bhi milegi! ✅\n\nAap ₹7.5 lakh tak bina kisi collateral ke loan le sakte hain. Vidyalakshmi portal (vidyalakshmi.co.in) par apply karein.',
            checklist: [
                { criterion: 'Age: 18–35 years', met: 'Yes' },
                { criterion: 'Indian nationality', met: 'Yes' },
                { criterion: 'Enrolled in recognized institution', met: 'Yes' },
                { criterion: 'Course: Graduation/Professional', met: 'Yes' },
                { criterion: 'Family income < ₹4.5 lakhs (for subsidy)', met: 'Yes' },
                { criterion: 'Collateral (for >₹7.5L loans)', met: 'Unknown' },
            ],
        },
    },
    {
        id: 'pmay',
        name: 'PMAY — Pradhan Mantri Awas Yojana (Urban)',
        text: `Pradhan Mantri Awas Yojana — Urban (PMAY-U)

ELIGIBILITY CRITERIA:
1. The applicant must be an Indian citizen.
2. The applicant or any family member must NOT own a pucca house anywhere in India.
3. First-time home buyer (neither the applicant nor spouse should have received any central government housing scheme benefit before).
4. Income Categories:
   - EWS (Economically Weaker Section): Annual household income up to ₹3 lakhs. Subsidy: 6.5% on loan up to ₹6 lakhs.
   - LIG (Lower Income Group): Annual income ₹3–6 lakhs. Subsidy: 6.5%.
   - MIG-I (Middle Income Group I): ₹6–12 lakhs. Subsidy: 4%.
   - MIG-II: ₹12–18 lakhs. Subsidy: 3%.
5. Age: The primary applicant must be above 18 years old.
6. Women Preference: Ownership or co-ownership by a female family member is preferred for EWS and LIG categories.`,
        sampleQ: 'Meri saal ki income 5 lakh hai aur mere paas koi ghar nahi hai. Main 30 saal ka hoon. Kya mujhe housing subsidy mil sakti hai?',
        mockResponse: {
            answer: 'Haan, aap PMAY-U ke LIG category mein aate hain! 🏠\n\nAapki ₹5 lakh annual income LIG range (₹3-6 lakh) mein hai\nAapke paas koi pucca ghar nahi hai ✅\nAap 30 saal ke hain (18+ hai) ✅\n\nAapko home loan ke interest par 6.5% credit linked subsidy milegi — ₹6 lakh tak ke loan par approximately ₹2.67 lakh ki subsidy. PMAY portal (pmaymis.gov.in) par apply karein.',
            checklist: [
                { criterion: 'Indian citizen', met: 'Yes' },
                { criterion: 'Age: 18 years or above', met: 'Yes' },
                { criterion: 'No pucca house anywhere in India', met: 'Yes' },
                { criterion: 'First-time home buyer', met: 'Unknown' },
                { criterion: 'Income category: LIG (₹3–6 lakhs)', met: 'Yes' },
                { criterion: 'Female co-ownership (for higher priority)', met: 'Unknown' },
            ],
        },
    },
];

export function getMockResponse(schemeId, _question) {
    const scheme = DEMO_SCHEMES.find(s => s.id === schemeId);
    return scheme ? scheme.mockResponse : null;
}
