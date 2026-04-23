import { GoogleGenAI } from "@google/genai";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env" });

async function testAudio() {
  const modelName = "models/gemini-3.1-flash-live-preview";
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY, httpOptions: { apiVersion: "v1alpha" } });
  
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
      model: modelName
  });
  
  console.log("Session properties:", Object.keys(session));
  console.log("Session prototype:", Object.getOwnPropertyNames(Object.getPrototypeOf(session)));
  
  session.close();
}
testAudio();
