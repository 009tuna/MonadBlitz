import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

/**
 * POST /api/verify
 * Gemini AI ile konusma transcript'ini dogrular.
 * Body: { transcript: string, targetLanguage: string, durationSeconds: number }
 * Response: { score: 0-100, verifiedSeconds: number, reasoning: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { transcript, targetLanguage, durationSeconds } = body;

    // Bos transcript kontrolu
    if (!transcript || transcript.trim().length === 0) {
      return NextResponse.json({
        score: 0,
        verifiedSeconds: 0,
        reasoning: "Konusma tespit edilemedi (sessizlik veya bos transcript)",
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    // API key yoksa fallback skor dondur (demo icin)
    if (!apiKey) {
      console.warn("GEMINI_API_KEY bulunamadi, fallback skor donduruluyor");
      return NextResponse.json(generateFallbackScore(transcript, durationSeconds));
    }

    // Gemini API cagrisi
    const verificationPrompt = `Bu ${durationSeconds} saniyelik bir dil ogrenme seansinin transcript'i.
Hedef dil: ${targetLanguage}.
Transcript: "${transcript}"

Bu transcript'te:
1. Gercek bir insan mi konusmus (bot/tekrar degil)?
2. Hedef dilde anlamli cumleler var mi?
3. Yoksa sadece sessizlik mi doldurulmus?

Asagidaki JSON formatinda cevap ver:
{
  "score": <0-100 arasi puan>,
  "verifiedSeconds": <gercek konusma olarak kabul edilebilecek saniye sayisi, max ${durationSeconds}>,
  "reasoning": "<kisa aciklama>"
}`;

    try {
      const ai = new GoogleGenAI({ apiKey });

      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash",
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `Sen bir dil ogrenme dogrulama asistanisin. Verilen transcript'i analiz edip JSON formatinda skor donduruyorsun. Sadece JSON dondur, baska bir sey yazma.\n\n${verificationPrompt}`,
              },
            ],
          },
        ],
        config: {
          temperature: 0.3,
        },
      });

      const content = response.text || "";

      // JSON parse et
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return NextResponse.json({
          score: Math.min(100, Math.max(0, parsed.score || 0)),
          verifiedSeconds: Math.min(durationSeconds, Math.max(0, parsed.verifiedSeconds || 0)),
          reasoning: parsed.reasoning || "Dogrulama tamamlandi",
        });
      }

      // Parse basarisiz — fallback
      return NextResponse.json(generateFallbackScore(transcript, durationSeconds));
    } catch (aiError: unknown) {
      const msg = aiError instanceof Error ? aiError.message : "Bilinmeyen hata";
      console.error("AI API hatasi:", msg);
      // AI hatasi durumunda fallback skor
      return NextResponse.json(generateFallbackScore(transcript, durationSeconds));
    }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Bilinmeyen hata";
    console.error("Verify endpoint hatasi:", msg);
    return NextResponse.json(
      { score: 50, verifiedSeconds: 15, reasoning: "Dogrulama hatasi, varsayilan skor atandi" },
      { status: 500 },
    );
  }
}

/**
 * AI kullanilamadiginda basit heuristik ile skor uret
 * Transcript uzunluguna ve kelime sayisina bakar
 */
function generateFallbackScore(transcript: string, durationSeconds: number) {
  const words = transcript.trim().split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  // Dakika basina ~100-150 kelime normal konusma hizi
  const expectedWords = (durationSeconds / 60) * 100;
  const ratio = Math.min(wordCount / Math.max(expectedWords, 1), 1.5);

  let score: number;
  if (wordCount < 3) {
    score = 10; // Cok az kelime — muhtemelen sessizlik
  } else if (ratio < 0.2) {
    score = 30; // Az konusma
  } else if (ratio < 0.5) {
    score = 60; // Orta
  } else {
    score = 85; // Iyi konusma
  }

  const verifiedSeconds = Math.floor(durationSeconds * (score / 100));

  return {
    score,
    verifiedSeconds,
    reasoning: `Fallback dogrulama: ${wordCount} kelime tespit edildi (beklenen ~${Math.floor(expectedWords)}). Skor: ${score}/100`,
  };
}
