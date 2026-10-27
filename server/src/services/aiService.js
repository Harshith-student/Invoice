/**
 * Format paise into Indian Rupees string (e.g. ₹50,000.00)
 */
const formatINR = (paise = 0) => {
  const rupees = (Number(paise) || 0) / 100;
  return 'Rs. ' + rupees.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

/**
 * Plain template fallback for payment reminders
 */
export const getFallbackReminderText = ({ type, clientName, amountPaise, invoiceNumber, daysLate, freelancerName, payUrl }) => {
  const amountStr = formatINR(amountPaise);
  const name = clientName || 'there';
  const from = freelancerName || 'Your Freelancer';

  switch (type) {
    case 'pre-due':
      return {
        subject: `Upcoming invoice ${invoiceNumber} due in 3 days - ${from}`,
        body: `Hi ${name},\n\nJust a quick heads-up that invoice ${invoiceNumber} for ${amountStr} is due in 3 days. Please let me know if you need any clarification on the deliverables or accounting details.\n\nYou can view and settle the invoice online anytime here:\n${payUrl}\n\nWarm regards,\n${from}`,
      };

    case 'due':
      return {
        subject: `Invoice ${invoiceNumber} is due today - ${from}`,
        body: `Hi ${name},\n\nHope you are having a productive day. This is a gentle reminder that invoice ${invoiceNumber} (${amountStr}) is due today.\n\nYou can make an instant payment via UPI, NetBanking, or card using this secure link:\n${payUrl}\n\nThank you for your prompt payment!\n\nBest regards,\n${from}`,
      };

    case 'overdue-1':
      return {
        subject: `Follow-up: Invoice ${invoiceNumber} is 3 days overdue - ${from}`,
        body: `Hi ${name},\n\nI am writing to follow up on invoice ${invoiceNumber} for ${amountStr}, which was due 3 days ago. We have not received the payment yet.\n\nCould you please check on the payment status with your finance team? You can pay directly online using the link below:\n${payUrl}\n\nIf you have already processed the payment, please disregard this note.\n\nThanks,\n${from}`,
      };

    case 'overdue-2':
    default:
      return {
        subject: `URGENT: Invoice ${invoiceNumber} is ${daysLate || 7} days overdue - ${from}`,
        body: `Dear ${name},\n\nInvoice ${invoiceNumber} for ${amountStr} is now ${daysLate || 7} days past due despite prior notices. Outstanding balances impact ongoing project scheduling and future work deliverables.\n\nPlease process this payment immediately via the secure link below to clear your account:\n${payUrl}\n\nIf there is an issue preventing payment, please reach out to me today so we can resolve it.\n\nSincerely,\n${from}`,
      };
  }
};

/**
 * Generates AI-written reminder text via Google Gemini, falling back to templates on error.
 */
export const generateAIReminderText = async ({
  type, // 'pre-due' | 'due' | 'overdue-1' | 'overdue-2'
  clientName,
  amountPaise,
  invoiceNumber,
  daysLate = 0,
  freelancerName,
  payUrl,
}) => {
  const fallback = getFallbackReminderText({
    type,
    clientName,
    amountPaise,
    invoiceNumber,
    daysLate,
    freelancerName,
    payUrl,
  });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === '' || apiKey.startsWith('your_')) {
    console.log(`🤖 Using template reminder fallback (${type}) - no Gemini API key set`);
    return fallback;
  }

  const toneInstructions = {
    'pre-due': 'Tone: warm, polite, courteous, friendly heads-up. Remind them the invoice is due in 3 days.',
    'due': 'Tone: polite, professional, and clear. Remind them the invoice is due today.',
    'overdue-1': 'Tone: direct, professional follow-up. State that the invoice is 3 days overdue and request an update.',
    'overdue-2': 'Tone: firm, urgent, and serious. State that the invoice is 7+ days late, mention that unpaid invoices impact active project deliverables, and request immediate settlement.',
  };

  const prompt = `
You are a professional freelance billing assistant in India writing a payment reminder email.
Details:
- Client Name: ${clientName || 'Valued Client'}
- Freelancer / Agency Name: ${freelancerName || 'Independent Consultant'}
- Invoice Number: ${invoiceNumber}
- Amount Due: ${formatINR(amountPaise)}
- Days Overdue: ${daysLate}
- Payment Link: ${payUrl}
- Reminder Stage: ${type}
- ${toneInstructions[type] || toneInstructions['overdue-1']}

Write a concise email reminder. Return ONLY a valid JSON object with exactly two keys: "subject" and "body".
Do not wrap in markdown quotes if possible, or use standard JSON.
Example format:
{
  "subject": "Invoice reminder ...",
  "body": "Hi ...,\\n\\n...\\n\\nBest regards,\\n..."
}
  `.trim();

  try {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 500,
        },
      }),
    });

    if (!response.ok) {
      console.warn(`⚠️ Gemini API returned status ${response.status}, using template fallback`);
      return fallback;
    }

    const data = await response.json();
    const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (candidateText) {
      // Strip potential markdown ```json blocks
      const cleaned = candidateText.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleaned);
      if (parsed.subject && parsed.body) {
        console.log(`✨ Gemini AI generated ${type} reminder text successfully!`);
        return {
          subject: parsed.subject,
          body: parsed.body,
        };
      }
    }

    return fallback;
  } catch (err) {
    console.warn(`⚠️ Gemini API call failed (${err.message}), falling back to template`);
    return fallback;
  }
};
