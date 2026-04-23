import { GoogleGenAI } from "@google/genai";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env" });

async function testLive() {
  const modelName = "models/gemini-3.1-flash-live-preview";
  try {
    console.log(`Testing token creation with systemInstruction and tools...`);
    const ai = new GoogleGenAI({ 
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: { apiVersion: "v1alpha" }
    });
    
    const token = await ai.authTokens.create({
      config: {
        uses: 1,
        expireTime: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        liveConnectConstraints: {
          model: modelName,
          config: {
            responseModalities: ["audio"],
            systemInstruction: {
              parts: [{ text: "You are a test system instruction." }],
            },
            tools: [
              {
                functionDeclarations: [
                  {
                    name: "stopSession",
                    description: "Stops the current tutoring session.",
                  },
                ],
              },
            ],
          },
        },
      },
    });
    
    console.log("Token:", token.name);
    
    const aiLive = new GoogleGenAI({ apiKey: token.name, httpOptions: { apiVersion: "v1alpha" } });
    const session = await aiLive.live.connect({
        model: modelName,
        config: { responseModalities: ["audio"] }
    });
    console.log("Connected successfully!");
    session.close();
  } catch (error) {
    console.error("Error:", error);
  }
}
testLive();
