import { GoogleGenAI } from "@google/genai";
import { Bill, BillCategory } from "../types";

// Note: In a production app, the API key should be proxy-ed through a backend.
// We assume process.env.API_KEY is available as per instructions.

export const getFinancialAdvice = async (bills: Bill[]): Promise<string> => {
  if (!bills || bills.length === 0) {
    return "You have no bills to analyze. Great job keeping debt-free!";
  }

  const unpaidBills = bills.filter(b => !b.isPaid);
  if (unpaidBills.length === 0) {
    return "All your bills are paid. Excellent financial health!";
  }

  const prompt = `
    I have the following bills due soon (Amounts in INR):
    ${unpaidBills.map(b => `- [${b.category}] ${b.name}: Total ₹${b.totalAmount}, Min Due ₹${b.minDueAmount}, Due Date: ${b.dueDate}`).join('\n')}

    Please provide a brief, strategic plan on how to prioritize these payments to minimize interest or penalties. 
    Keep it under 3 paragraphs. Be encouraging but direct about risks.
  `;

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    
    return response.text || "Could not generate advice at this time.";
  } catch (error) {
    console.error("Error fetching Gemini advice:", error);
    return "Sorry, I'm having trouble connecting to the financial brain right now. Please try again later.";
  }
};

export interface ExtractedBillData {
  name: string;
  totalAmount: number;
  minDueAmount: number;
  dueDate: string;
  category: BillCategory;
}

export const extractBillDetails = async (base64Data: string, mimeType: string): Promise<ExtractedBillData | null> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const prompt = `
      Analyze this bill/invoice image or PDF. Extract the following details in JSON format:
      1. 'name': The biller name, bank name, or merchant.
      2. 'totalAmount': The total amount due (number only).
      3. 'minDueAmount': The minimum due amount if available, otherwise 0.
      4. 'dueDate': The due date in EXACT 'YYYY-MM-DD' format. If not found, estimate based on statement date + 20 days.
      5. 'category': Choose the EXACT best fit from this list: 'Credit Card', 'Electricity', 'Gas', 'Water', 'Internet', 'Telephone', 'Insurance', 'Rent', 'Subscription', 'Loan', 'Other'.

      Return ONLY the JSON object. Do not wrap in markdown code blocks.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Data
            }
          },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json"
      }
    });

    if (response.text) {
      let text = response.text.trim();
      // Remove markdown code blocks if present (just in case the model adds them despite responseMimeType)
      if (text.startsWith('```json')) {
        text = text.replace(/^```json/, '').replace(/```$/, '');
      } else if (text.startsWith('```')) {
        text = text.replace(/^```/, '').replace(/```$/, '');
      }
      return JSON.parse(text) as ExtractedBillData;
    }
    return null;
  } catch (error) {
    console.error("Error extracting bill details:", error);
    return null;
  }
};