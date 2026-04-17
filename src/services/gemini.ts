import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { PetrolRecord, VerificationResult } from "../types";
import { getGeminiApiKey } from "../lib/config";

let aiInstance: GoogleGenAI | null = null;

function getAI() {
  const apiKey = getGeminiApiKey();
  if (!apiKey) return null;
  if (!aiInstance) {
    aiInstance = new GoogleGenAI({ apiKey });
  }
  return aiInstance;
}

export const extractReceiptData = async (base64Image: string): Promise<Partial<PetrolRecord>> => {
  try {
    const response = await fetch('/api/extract', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ base64Image }),
    });

    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }

    return await response.json();
  } catch (e) {
    console.error("Failed to extract receipt data via server, trying local fallback", e);
    
    // Local fallback if we have a key
    const apiKey = getGeminiApiKey();
    if (!apiKey) return {};

    const ai = getAI()!;
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          parts: [
            {
              inlineData: {
                mimeType: "image/jpeg",
                data: base64Image,
              },
            },
            {
              text: `Extract petrol receipt information from this image. 
              Return a JSON object with the following fields:
              - date (ISO format YYYY-MM-DD)
              - amount (number, MYR)
              - liters (number)
              - stationName (string)
              - type (one of: RON95, RON97, Diesel)
              
              If a field is not found, leave it null.`,
            },
          ],
        },
      ],
      config: {
        responseMimeType: "application/json",
      },
    });

    return JSON.parse(response.text || "{}");
  }
};

export const verifyUsage = async (record: PetrolRecord, history: PetrolRecord[]): Promise<VerificationResult> => {
  try {
    const response = await fetch('/api/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ record, history }),
    });

    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }

    return await response.json();
  } catch (e) {
    console.error("Verification failed (server fallback)", e);
    // Local fallback if server fails and we have a local key
    try {
      const apiKey = getGeminiApiKey();
      if (!apiKey) throw new Error("No local API key");
      
      const ai = getAI();
      const response: GenerateContentResponse = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          {
            text: `As a Malaysian government petrol usage auditor, verify this record against the user's history and general policy rules.
            
            Current Record:
            ${JSON.stringify(record, null, 2)}
            
            History (Last 5 records):
            ${JSON.stringify(history.slice(0, 5), null, 2)}
            
            Return a JSON object:
            {
              "status": "verified" | "flagged",
              "notes": ["List of observations"]
            }`,
          },
        ],
        config: {
          responseMimeType: "application/json",
        },
      });

      return JSON.parse(response.text || '{"status": "flagged", "notes": ["Error in verification"]}');
    } catch (innerError) {
      return { status: "flagged", notes: ["Verification failed to process"] };
    }
  }
};
