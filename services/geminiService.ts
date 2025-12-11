
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
  paymentUrl?: string;
}

/**
 * Processes a PDF file. 
 * - Handles Password Protection.
 * - Extracts text if digital PDF.
 * - Renders first page to image if scanned PDF.
 */
export const processPdfFile = async (file: File, password?: string): Promise<{ type: 'text' | 'image', data: string } | null> => {
  try {
    // Dynamically import PDF.js to avoid startup crashes if the environment struggles with large bundles or top-level await
    const pdfjsLib = await import('pdfjs-dist');
    const workerModule = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
    
    // Set worker source
    pdfjsLib.GlobalWorkerOptions.workerSrc = workerModule.default;

    const arrayBuffer = await file.arrayBuffer();
    
    // Load PDF
    const loadingTask = pdfjsLib.getDocument({
        data: arrayBuffer,
        password: password,
        // Critical for APK/Offline: Prevent trying to load fonts from external CDNs which might fail or block rendering
        disableFontFace: true 
    });

    const pdf = await loadingTask.promise;
    const maxPages = Math.min(pdf.numPages, 3); // Analyze first 3 pages max
    let fullText = '';
    
    // Try Extracting Text first (Cheaper & Faster)
    for (let i = 1; i <= maxPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(' ');
        fullText += `--- Page ${i} ---\n${pageText}\n`;
    }

    // Heuristic: If we extracted a good amount of text, it's a digital PDF.
    // If text is very short/empty, it's likely a scanned image inside a PDF.
    if (fullText.length > 50) {
        return { type: 'text', data: fullText };
    }

    // Fallback: Scanned PDF -> Render Page 1 to Image
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: 2.0 }); // High res for OCR
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    if (context) {
        await page.render({ canvasContext: context, viewport: viewport }).promise;
        const base64Image = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
        return { type: 'image', data: base64Image };
    }
    
    return null;

  } catch (error: any) {
    if (error.name === 'PasswordException') {
        throw new Error('PASSWORD_REQUIRED');
    }
    console.error("PDF Processing Error", error);
    throw new Error('PDF_PROCESSING_FAILED');
  }
};

export const extractBillDetails = async (inputData: string, inputType: 'base64_image' | 'text' | 'pdf_text'): Promise<ExtractedBillData | null> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const basePrompt = `
      Analyze this bill/invoice data. Extract the following details in JSON format:
      1. 'name': The biller name, bank name, or merchant.
      2. 'totalAmount': The total amount due (number only).
      3. 'minDueAmount': The minimum due amount if available, otherwise 0.
      4. 'dueDate': The due date in EXACT 'YYYY-MM-DD' format. If not found, estimate based on statement date + 20 days.
      5. 'category': Choose the EXACT best fit from this list: 'Credit Card', 'Electricity', 'Gas', 'Water', 'Internet', 'Telephone', 'Insurance', 'Rent', 'Subscription', 'Loan', 'Other'.
      6. 'paymentUrl': Any direct website link found for bill payment (starts with http/https). If none, leave empty.

      Return ONLY the JSON object. Do not wrap in markdown code blocks.
    `;

    let contents;

    if (inputType === 'text' || inputType === 'pdf_text') {
        contents = {
            parts: [{ text: `Here is the text content extracted from a bill:\n\n${inputData}\n\n${basePrompt}` }]
        };
    } else {
        // Base64 Image (Scanned PDF or Image File)
        contents = {
            parts: [
              {
                inlineData: {
                  mimeType: 'image/jpeg',
                  data: inputData
                }
              },
              { text: basePrompt }
            ]
        };
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: contents,
      config: {
        responseMimeType: "application/json"
      }
    });

    if (response.text) {
      let text = response.text.trim();
      // Clean potential markdown wrapping
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
