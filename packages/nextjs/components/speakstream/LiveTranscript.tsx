"use client";

import { useEffect, useRef } from "react";
import type { VerificationResult } from "~~/hooks/speakstream/useGeminiVerify";

interface ChunkDisplay {
  text: string;
  verified?: boolean; // true=dogrulandi, false=reddedildi, undefined=bekliyor
  score?: number;
}

interface LiveTranscriptProps {
  chunks: ChunkDisplay[];
  interimText: string;
  isListening: boolean;
  isVerifying: boolean;
  lastVerification: VerificationResult | null;
}

export const LiveTranscript = ({
  chunks,
  interimText,
  isListening,
  isVerifying,
  lastVerification,
}: LiveTranscriptProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Otomatik scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chunks, interimText]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-lg">Canli Transcript</h3>
        <div className="flex items-center gap-2">
          {isListening && (
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              <span className="text-xs text-red-400">KAYIT</span>
            </div>
          )}
          {isVerifying && <div className="badge badge-warning badge-sm animate-pulse">AI Dogruluyor...</div>}
        </div>
      </div>

      {/* Transcript area */}
      <div
        ref={scrollRef}
        className="flex-1 bg-base-200 rounded-xl p-4 overflow-y-auto min-h-[300px] max-h-[500px] space-y-2"
      >
        {chunks.length === 0 && !interimText && (
          <div className="flex items-center justify-center h-full text-base-content/30">
            <p className="text-center">
              {isListening ? "Konusmaya baslayin..." : "Mikrofonu baslatmak icin butona basin"}
            </p>
          </div>
        )}

        {chunks.map((chunk, i) => (
          <div
            key={i}
            className={`inline-block px-3 py-1.5 rounded-lg text-sm mr-1 mb-1 transition-all duration-300 ${
              chunk.verified === true
                ? "bg-green-500/20 text-green-300 border border-green-500/30"
                : chunk.verified === false
                  ? "bg-red-500/20 text-red-300 border border-red-500/30 line-through"
                  : "bg-base-300 text-base-content/80"
            }`}
          >
            {chunk.text}
            {chunk.score !== undefined && (
              <span className={`ml-1 text-xs font-mono ${chunk.score >= 50 ? "text-green-400" : "text-red-400"}`}>
                ({chunk.score})
              </span>
            )}
          </div>
        ))}

        {/* Interim (henuz kesinlesmemis) text */}
        {interimText && (
          <span className="inline-block px-3 py-1.5 rounded-lg text-sm bg-base-300/50 text-base-content/40 italic">
            {interimText}
          </span>
        )}
      </div>

      {/* Son dogrulama sonucu */}
      {lastVerification && (
        <div
          className={`mt-3 p-3 rounded-xl text-sm ${
            lastVerification.score >= 50
              ? "bg-green-500/10 border border-green-500/20"
              : "bg-red-500/10 border border-red-500/20"
          }`}
        >
          <div className="flex justify-between items-center">
            <span className="font-semibold">{lastVerification.score >= 50 ? "Dogrulandi" : "Reddedildi"}</span>
            <span className={`font-mono font-bold ${lastVerification.score >= 50 ? "text-green-400" : "text-red-400"}`}>
              Skor: {lastVerification.score}/100
            </span>
          </div>
          <p className="text-xs text-base-content/50 mt-1">{lastVerification.reasoning}</p>
        </div>
      )}
    </div>
  );
};
