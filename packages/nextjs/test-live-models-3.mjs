import { GoogleGenAI } from "@google/genai";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env" });

async function testModel(modelName) {
  try {
    console.log(`\nTesting model: ${modelName}`);
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
          config: { responseModalities: ["audio"] },
        },
      },
    });
    
    const aiLive = new GoogleGenAI({ apiKey: token.name, httpOptions: { apiVersion: "v1alpha" } });
    const session = await aiLive.live.connect({
        model: modelName,
        config: { responseModalities: ["audio"] }
    });
    console.log(`✅ Success for ${modelName}`);
    session.close();
  } catch (error) {
    console.error(`❌ Failed for ${modelName}:`, error.message);
  }
}

async function run() {
  await testModel("models/gemini-3.0-flash");
  await testModel("models/gemini-3.1-flash-live-preview");
  await testModel("models/gemini-3.1-flash");
}
run();
