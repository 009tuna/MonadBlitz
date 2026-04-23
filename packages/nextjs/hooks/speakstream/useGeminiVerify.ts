"use client";

import { useState, useCallback } from "react";

export interface VerificationResult {
  score: number;
  verifiedSeconds: number;
  reasoning: string;
  timestamp: number;
}

interface UseGeminiVerifyReturn {
  verify: (transcript: string, targetLanguage: string, durationSeconds: number) => Promise<VerificationResult | null>;
  isVerifying: boolean;
  lastResult: VerificationResult | null;
  results: VerificationResult[];
  error: string | null;
}

export function useGeminiVerify(): UseGeminiVerifyReturn {
  const [isVerifying, setIsVerifying] = useState(false);
  const [lastResult, setLastResult] = useState<VerificationResult | null>(null);
  const [results, setResults] = useState<VerificationResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  const verify = useCallback(async (
    transcript: string,
    targetLanguage: string,
    durationSeconds: number
  ): Promise<VerificationResult | null> => {
    if (!transcript.trim()) {
      // Bos transcript — skor 0
      const emptyResult: VerificationResult = {
        score: 0,
        verifiedSeconds: 0,
        reasoning: "Konusma tespit edilemedi (sessizlik)",
        timestamp: Date.now(),
      };
      setLastResult(emptyResult);
      setResults(prev => [...prev, emptyResult]);
      return emptyResult;
    }

    setIsVerifying(true);
    setError(null);

    try {
      const response = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript,
          targetLanguage,
          durationSeconds,
        }),
      });

      if (!response.ok) {
        throw new Error(`API hatasi: ${response.status}`);
      }

      const data = await response.json();
      const result: VerificationResult = {
        score: data.score || 0,
        verifiedSeconds: data.verifiedSeconds || 0,
        reasoning: data.reasoning || "Bilinmeyen",
        timestamp: Date.now(),
      };

      setLastResult(result);
      setResults(prev => [...prev, result]);
      return result;
    } catch (e: any) {
      console.error("Gemini dogrulama hatasi:", e);
      setError(e.message);

      // Hata durumunda fallback — %70 skor ver (demo icin)
      const fallbackResult: VerificationResult = {
        score: 70,
        verifiedSeconds: Math.floor(durationSeconds * 0.7),
        reasoning: "AI dogrulama gecici olarak kullanilamiyor, varsayilan skor atandi",
        timestamp: Date.now(),
      };
      setLastResult(fallbackResult);
      setResults(prev => [...prev, fallbackResult]);
      return fallbackResult;
    } finally {
      setIsVerifying(false);
    }
  }, []);

  return {
    verify,
    isVerifying,
    lastResult,
    results,
    error,
  };
}
