"use client";

import { useState, useRef, useCallback, useEffect } from "react";

// Web Speech API tipi (Chrome/Chromium icin)
interface SpeechRecognitionEvent {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

export interface TranscriptChunk {
  text: string;
  timestamp: number;
  isFinal: boolean;
}

interface UseSpeechRecognitionReturn {
  transcript: string;
  interimTranscript: string;
  isListening: boolean;
  chunks: TranscriptChunk[];
  start: (lang?: string) => void;
  stop: () => void;
  getAndClearChunks: () => TranscriptChunk[];
  error: string | null;
}

export function useSpeechRecognition(): UseSpeechRecognitionReturn {
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [chunks, setChunks] = useState<TranscriptChunk[]>([]);
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const chunksRef = useRef<TranscriptChunk[]>([]);
  const restartTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Chunk'lari al ve temizle (AI dogrulama icin)
  const getAndClearChunks = useCallback(() => {
    const currentChunks = [...chunksRef.current];
    chunksRef.current = [];
    setChunks([]);
    return currentChunks;
  }, []);

  const stop = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
    }
    setIsListening(false);
  }, []);

  const start = useCallback((lang: string = "en-US") => {
    setError(null);

    // Browser destegi kontrol
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError("Tarayiciniz Web Speech API desteklemiyor. Lutfen Chrome/Chromium kullanin.");
      return;
    }

    // Onceki instance'i temizle
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = lang;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = "";
      let final = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          final += result[0].transcript + " ";

          // Yeni final chunk ekle
          const newChunk: TranscriptChunk = {
            text: result[0].transcript.trim(),
            timestamp: Date.now(),
            isFinal: true,
          };
          chunksRef.current.push(newChunk);
          setChunks(prev => [...prev, newChunk]);
        } else {
          interim += result[0].transcript;
        }
      }

      if (final) {
        setTranscript(prev => prev + final);
      }
      setInterimTranscript(interim);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      if (event.error === "not-allowed") {
        setError("Mikrofon izni reddedildi. Lutfen tarayici ayarlarindan mikrofon iznini verin.");
        stop();
      } else if (event.error === "no-speech") {
        // Sessizlik — normal, yeniden baslat
      } else {
        setError(`Ses tanima hatasi: ${event.error}`);
      }
    };

    recognition.onend = () => {
      // Otomatik yeniden baslat (Web Speech API bazen durur)
      if (recognitionRef.current) {
        restartTimeoutRef.current = setTimeout(() => {
          try {
            recognition.start();
          } catch {
            // Zaten calisiyor olabilir
          }
        }, 100);
      }
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch {
      setError("Ses tanima baslatIlamadi.");
    }
  }, [stop]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current);
      }
    };
  }, []);

  return {
    transcript,
    interimTranscript,
    isListening,
    chunks,
    start,
    stop,
    getAndClearChunks,
    error,
  };
}
