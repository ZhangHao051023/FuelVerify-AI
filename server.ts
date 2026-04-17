import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // API Proxy for Fuel Prices to avoid CORS issues in production
  app.get("/api/fuel-prices", async (req, res) => {
    try {
      console.log("Proxying request to data.gov.my...");
      const response = await fetch('https://api.data.gov.my/data-catalogue?id=fuelprice', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log("Proxy fetch successful");
        return res.json(data);
      }
      
      console.warn(`Government API responded with ${response.status}. Falling back to AI...`);
    } catch (error: any) {
      console.error("Proxy fetch error, falling back to AI:", error.message);
    }

    // AI Fallback on the server
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "Government API failed and GEMINI_API_KEY is missing on server." });
      }

      console.log("Attempting to fetch fuel prices using Gemini AI (Search Tool) on server...");
      const client = new GoogleGenAI({ apiKey });
      
      const prompt = `Search for the LATEST fuel prices in Malaysia (RON95, RON97, Diesel). 
      Format the data for West Malaysia and East Malaysia.
      Return ONLY a JSON object in this format:
      {
        "West Malaysia": { "RON95": 2.05, "RON95_Market": 3.20, "RON97": 3.47, "Diesel": 3.35, "RON95_SubsidyLimit": 200 },
        "East Malaysia": { "RON95": 2.05, "RON95_Market": 3.20, "RON97": 3.47, "Diesel": 2.15, "RON95_SubsidyLimit": 200 }
      }`;

      const result = await client.models.generateContent({
        model: "gemini-2.0-flash",
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        tools: [{ googleSearch: {} }] as any,
      } as any);

      const text = result.text || "";
      // Extract JSON block if it exists
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      const cleanedJson = jsonMatch ? jsonMatch[0] : text;
      const fuelData = JSON.parse(cleanedJson);
      
      console.log("AI Fallback successful");
      res.json({ _isAI: true, ...fuelData });
    } catch (aiError: any) {
      console.error("AI Fallback failed:", aiError.message);
      res.status(500).json({ error: "Failed to fetch fuel prices via all routes." });
    }
  });

  // AI Verification Endpoint
  app.post("/api/verify", express.json(), async (req, res) => {
    try {
      const { record, history } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;
      
      if (!apiKey) {
        return res.status(500).json({ error: "GEMINI_API_KEY is missing on server." });
      }

      const client = new GoogleGenAI({ apiKey });
      const prompt = `As a Malaysian government petrol usage auditor, verify this record against the user's history and general policy rules.
          
          Current Record:
          ${JSON.stringify(record, null, 2)}
          
          History (Last 5 records):
          ${JSON.stringify(history.slice(0, 5), null, 2)}
          
          Policy Rules:
          1. Duplicate check: Same date, amount, and station is highly suspicious.
          2. Consumption check: Unrealistic fuel consumption for standard cars.
          3. Frequency check: Multiple full tanks on the same day.
          
          Return ONLY a JSON object:
          {
            "status": "verified" | "flagged",
            "notes": ["List of observations or reasons for flagging"]
          }`;

      const response = await client.models.generateContent({
        model: "gemini-2.0-flash",
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: {
          responseMimeType: "application/json",
        },
      } as any);

      res.json(JSON.parse(response.text || '{"status": "flagged", "notes": ["Error in verification"]}'));
    } catch (error: any) {
      console.error("Verification endpoint error:", error.message);
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files from the dist directory in production
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}

startServer();
