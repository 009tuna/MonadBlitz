import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

const GEMINI_LIVE_MODEL = "models/gemini-3.1-flash-live-preview";

/**
 * POST /api/live
 * Gemini Live API icin ephemeral token uretir.
 * Body: { teacherName: string, teacherBio: string, targetLanguage: string, persona: string }
 * Response: { token: string }
 */
export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: "GEMINI_API_KEY bulunamadi" }, { status: 500 });
    }

    const body = await request.json();
    const { teacherName, teacherBio, targetLanguage, persona } = body;

    const systemInstruction = `You are ${teacherName || "an AI language tutor"}, a friendly language teacher helping a student practice ${targetLanguage || "English"}.

Rules:
- Keep responses short (1-2 sentences) — this is conversation, not lecture
- Always respond in ${targetLanguage || "English"}, never switch languages unless student asks
- If student makes a mistake, gently correct once then continue the conversation naturally
- Ask follow-up questions to keep conversation flowing
- Match student's level — if they use simple words, you use simple words
- Persona: ${persona || teacherBio || "warm, patient, encouraging"}

The student is paying per second they actually speak. Encourage them to talk more, not you.
Start by warmly greeting them and asking what they'd like to talk about today.`;

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: { apiVersion: "v1alpha" },
    });

    const token = await ai.authTokens.create({
      config: {
        uses: 1,
        expireTime: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        liveConnectConstraints: {
          model: GEMINI_LIVE_MODEL,
          config: {
            responseModalities: ["audio"],
            speechConfig: {
              voiceConfig: { prebuiltVoiceConfig: { voiceName: "Aoide" } },
            },
            systemInstruction: {
              parts: [{ text: systemInstruction }],
            },
            tools: [
              {
                functionDeclarations: [
                  {
                    name: "stopSession",
                    description:
                      "Stops the current tutoring session. Call this when the student wants to end the lesson or says goodbye.",
                    parameters: {
                      type: "OBJECT",
                      properties: {},
                    },
                  },
                ],
              },
            ],
          },
        },
      },
    });

    return NextResponse.json({ token: token.name });
  } catch (error: any) {
    console.error("Live API token hatasi:", error);
    return NextResponse.json({ error: error.message || "Token uretilemedi" }, { status: 500 });
  }
}
