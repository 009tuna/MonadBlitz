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
  
  console.log("Connected. Sending dummy audio...");
  const dummyPcm = new Int16Array(16000).fill(0);
  const uint8 = new Uint8Array(dummyPcm.buffer);
  const base64 = Buffer.from(uint8).toString("base64");

  try {
      session.sendRealtimeInput([{
        mimeType: "audio/pcm;rate=16000",
        data: base64
      }]);
      console.log("Sent with sendRealtimeInput (Array format)");
  } catch(e) {
      console.log("Failed Array format:", e.message);
  }

  await new Promise(r => setTimeout(r, 2000));
  session.close();
}
testAudio();