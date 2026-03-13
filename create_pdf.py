from fpdf import FPDF

pdf = FPDF()
pdf.add_page()
pdf.set_font("Arial", size=15)
pdf.cell(200, 10, txt="National Agricultural Subsidy Scheme 2026", ln=1, align='C')
pdf.set_font("Arial", size=12)
pdf.multi_cell(0, 10, txt="Overview:\nThis scheme provides financial assistance to farmers.\n\nEligibility:\n- Minimum Age: 21\n- Maximum Income: 300000 INR per year\n- Occupation: Farmer or Agricultural Worker\n\nBenefits:\nEligible citizens will receive an annual subsidy of 15,000 INR directly into their bank accounts to help purchase seeds, fertilizer, and modernized farming equipment.")
pdf.output("sample_scheme.pdf")
print("PDF created")
