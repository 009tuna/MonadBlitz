import { GoogleGenAI } from "@google/genai";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env" });

async function testLive() {
  try {
    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: { apiVersion: "v1alpha" },
    });

    console.log("Testing token creation with gemini-2.0-flash...");
    const token = await ai.authTokens.create({
      config: {
        uses: 1,
        expireTime: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        liveConnectConstraints: {
          model: "models/gemini-2.0-flash",
          config: {
            responseModalities: ["audio"],
          },
        },
      },
    });

    console.log("Token:", token.name);

    console.log("Connecting...");
    const aiLive = new GoogleGenAI({ apiKey: token.name, httpOptions: { apiVersion: "v1alpha" } });
    const session = await aiLive.live.connect({
      model: "models/gemini-2.0-flash",
      config: {
        responseModalities: ["audio"],
      },
    });
    console.log("Connected successfully!");
    session.close();
  } catch (error) {
    console.error("Error:", error);
  }
}
testLive();
