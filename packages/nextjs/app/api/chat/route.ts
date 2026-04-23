import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

type ChatTurn = {
  role: "student" | "ai";
  text: string;
};

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const {
    teacherName,
    teacherBio,
    targetLanguage,
    persona,
    message,
    history = [],
  } = body as {
    teacherName?: string;
    teacherBio?: string;
    targetLanguage?: string;
    persona?: string;
    message?: string;
    history?: ChatTurn[];
  };

  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: "GEMINI_API_KEY bulunamadi" }, { status: 500 });
    }

    const ai = new GoogleGenAI({ apiKey });

    const normalizedHistory = history
      .filter(turn => turn?.text?.trim())
      .slice(-12)
      .map(turn => `${turn.role === "student" ? "Student" : "Tutor"}: ${turn.text.trim()}`)
      .join("\n");

    const prompt = `You are ${teacherName || "an AI language tutor"}, a friendly language teacher helping a student practice ${targetLanguage || "English"}.

Persona: ${persona || teacherBio || "warm, patient, encouraging"}

Rules:
- Keep responses short and conversational.
- Always reply in ${targetLanguage || "English"} unless the student explicitly asks otherwise.
- Ask a follow-up question often so the student keeps talking.
- If the student makes a mistake, correct gently and continue naturally.

Conversation so far:
${normalizedHistory || "Tutor: Greet the student and invite them to speak."}

Latest student message:
${message?.trim() || "Please greet me and start the conversation."}

Reply as the tutor only.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        temperature: 0.7,
      },
    });

    return NextResponse.json({
      reply: (response.text || "Hello! What would you like to talk about today?").trim(),
    });
  } catch (error: any) {
    console.error("AI chat hatasi:", error);
    return NextResponse.json({
      reply: buildFallbackReply(targetLanguage || "English", message || "", history),
      fallback: true,
    });
  }
}

function buildFallbackReply(targetLanguage: string, message: string, history: ChatTurn[]) {
  const trimmed = message.trim();
  const lower = trimmed.toLowerCase();

  if (!trimmed) {
    return targetLanguage.toLowerCase().startsWith("span")
      ? "Hola. Empecemos con una conversacion corta. Como te sientes hoy?"
      : "Hello. Let's start with a short conversation. How are you feeling today?";
  }

  if (lower.includes("hello") || lower.includes("hi") || lower.includes("merhaba")) {
    return targetLanguage.toLowerCase().startsWith("span")
      ? "Hola. Mucho gusto. Que te gusta hacer en tu tiempo libre?"
      : "Hi, nice to meet you. What do you like to do in your free time?";
  }

  if (lower.includes("name")) {
    return targetLanguage.toLowerCase().startsWith("span")
      ? "Soy tu tutora de idiomas. Ahora dime tu nombre y una cosa sobre tu dia."
      : "I am your language tutor. Now tell me your name and one thing about your day.";
  }

  const turnCount = history.length;
  return targetLanguage.toLowerCase().startsWith("span")
    ? `Bien. Dijiste: "${trimmed}". Puedes decirlo otra vez con una frase un poco mas larga? Turno ${turnCount + 1}.`
    : `Nice. You said: "${trimmed}". Can you say it again with a slightly longer sentence? Turn ${turnCount + 1}.`;
}
