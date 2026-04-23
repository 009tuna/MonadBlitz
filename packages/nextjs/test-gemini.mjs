import { GoogleGenAI } from "@google/genai";

async function testChat() {
  try {
    const ai = new GoogleGenAI({ 
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: { apiVersion: "v1alpha" }
    });
    console.log("Testing live token creation...");
    const token = await ai.authTokens.create({
      config: {
        uses: 1,
        expireTime: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        liveConnectConstraints: {
          model: "models/gemini-3.1-flash-live-preview",
          config: {
            responseModalities: ["audio"],
          },
        },
      },
    });
    console.log("Live Token:", token.name ? "Successfully created!" : "Failed");
    
  } catch (error) {
    console.error("Error occurred:", error);
  }
}

testChat();
