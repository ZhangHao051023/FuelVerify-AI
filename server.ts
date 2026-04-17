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
    let governmentDataMatch = false;
    let fuelData: any = null;

    try {
      console.log("Proxying request to data.gov.my with latest filters...");
      // Fetch latest 10 entries to ensure we find a 'level' entry that is recent
      const response = await fetch('https://api.data.gov.my/data-catalogue?id=fuelprice&limit=20&sort=-date', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data)) {
          const levelData = data.filter((item: any) => item.series_type === 'level');
          if (levelData.length > 0) {
            const latest = levelData[0]; // Since we sorted by -date
            console.log(`Found level data from ${latest.date}: RON95=${latest.ron95}, RON97=${latest.ron97}`);
            
            // Logic check: if prices are suspiciously low (e.g. 0.40), treat as invalid
            if (latest.ron95 > 1.0) {
              const ron95_subsidized = latest.ron95_budi95 || 2.05;
              const ron95_market = latest.ron95 || (ron95_subsidized + 1.20);
              
              fuelData = {
                "West Malaysia": {
                  "RON95": ron95_subsidized,
                  "RON95_Market": Math.max(ron95_market, ron95_subsidized + 0.50),
                  "RON97": latest.ron97,
                  "Diesel": latest.diesel,
                  "RON95_SubsidyLimit": 200
                },
                "East Malaysia": {
                  "RON95": ron95_subsidized,
                  "RON95_Market": Math.max(ron95_market, ron95_subsidized + 0.50),
                  "RON97": latest.ron97,
                  "Diesel": latest.diesel_eastmsia || 2.15,
                  "RON95_SubsidyLimit": 200
                }
              };
              governmentDataMatch = true;
              console.log("Government data validated and mapped successfully.");
              return res.json({ _isAI: false, ...fuelData });
            } else {
              console.warn("Government data found but prices look unrealistic (< RM1.0). Falling back to AI.");
            }
          }
        }
      }
      
      console.warn(`Government API responded with ${response.status} or invalid data structure.`);
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
      
      const prompt = `Search for the MOST RECENT and LATEST fuel prices in Malaysia as of April 2026. 
      The current market prices for RON95 is around RM3.20 - RM3.50, while subsidized is RM2.05.
      RON97 varies, Diesel is around RM3.35 in West Malaysia and RM2.15 in East Malaysia.
      
      Find the exact current prices for:
      - RON95 (Subsidized)
      - RON95 (Market/Unsubsidized)
      - RON97
      - Diesel (West Malaysia)
      - Diesel (East Malaysia)
      
      Return ONLY a JSON object in this format:
      {
        "West Malaysia": { "RON95": 2.05, "RON95_Market": 3.20, "RON97": 3.47, "Diesel": 3.35, "RON95_SubsidyLimit": 200 },
        "East Malaysia": { "RON95": 2.05, "RON95_Market": 3.20, "RON97": 3.47, "Diesel": 2.15, "RON95_SubsidyLimit": 200 }
      }`;

      const result = await client.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        tools: [{ googleSearch: {} }] as any,
      } as any);

      const text = result.text || "";
      console.log("AI Response received (length):", text.length);
      console.log("AI Raw Text Snippet:", text.substring(0, 200));
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
        console.error("Verification failed: GEMINI_API_KEY not found in environment.");
        return res.status(500).json({ error: "GEMINI_API_KEY is missing on server." });
      }

      console.log(`Starting AI verification for record in ${record.station}...`);
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
        model: "gemini-3-flash-preview",
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: {
          responseMimeType: "application/json",
        },
      } as any);

      const verificationText = response.text || "";
      console.log("Verification AI RAW Response:", verificationText);
      
      try {
        const result = JSON.parse(verificationText);
        console.log("Verification finished successfully. Result:", result.status);
        res.json(result);
      } catch (parseError) {
        console.error("Failed to parse AI verification JSON:", verificationText);
        res.json({ status: "flagged", notes: ["AI response format error during verification"] });
      }
    } catch (error: any) {
      console.error("Verification endpoint error:", error.message);
      res.status(500).json({ error: error.message });
    }
  });

  // AI Extraction Endpoint
  app.post("/api/extract", express.json({ limit: '10mb' }), async (req, res) => {
    try {
      const { base64Image } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;

      if (!apiKey) {
        console.error("Extraction failed: GEMINI_API_KEY not found in environment.");
        return res.status(500).json({ error: "GEMINI_API_KEY is missing on server." });
      }

      console.log("Starting AI receipt extraction...");
      const client = new GoogleGenAI({ apiKey });
      const response = await client.models.generateContent({
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
      } as any);

      console.log("Extraction AI finished.");
      res.json(JSON.parse(response.text || "{}"));
    } catch (error: any) {
      console.error("Extraction endpoint error:", error.message);
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
    console.log(`GEMINI_API_KEY present: ${!!process.env.GEMINI_API_KEY}`);
  });
}

startServer();
