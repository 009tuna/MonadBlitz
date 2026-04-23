"use client";

import { useState, useRef, useCallback } from "react";
import { GoogleGenAI, Modality } from "@google/genai";

const GEMINI_LIVE_MODEL = "gemini-3.1-flash-live-preview";

export interface ChatMessage {
  role: "student" | "ai";
  text: string;
  timestamp: number;
}

interface UseGeminiLiveReturn {
  connect: (teacherName: string, teacherBio: string, targetLanguage: string, persona: string) => Promise<void>;
  disconnect: () => void;
  sendTextMessage: (
    teacherName: string,
    teacherBio: string,
    targetLanguage: string,
    persona: string,
    message?: string,
  ) => Promise<void>;
  isConnected: boolean;
  isConnecting: boolean;
  isTextSending: boolean;
  aiSpeaking: boolean;
  messages: ChatMessage[];
  studentTranscript: string;
  aiTranscript: string;
  error: string | null;
}

export function useGeminiLive(): UseGeminiLiveReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isTextSending, setIsTextSending] = useState(false);
  const [aiSpeaking, setAiSpeaking] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [studentTranscript, setStudentTranscript] = useState("");
  const [aiTranscript, setAiTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);

  const sessionRef = useRef<any>(null);
  const messagesRef = useRef<ChatMessage[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const pushMessage = useCallback((message: ChatMessage) => {
    setMessages(prev => {
      const next = [...prev, message];
      messagesRef.current = next;
      return next;
    });
  }, []);

  // Student transcript buffer — mesaj olarak eklemek icin
  const studentBufferRef = useRef("");
  const aiBufferRef = useRef("");

  // Audio chunk'lari oynat
  const playAudioChunk = useCallback((base64Data: string) => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext({ sampleRate: 24000 });
      }
      const ctx = audioContextRef.current;

      // Base64 -> ArrayBuffer
      const binaryStr = atob(base64Data);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }

      // PCM 16-bit -> Float32
      const pcm16 = new Int16Array(bytes.buffer);
      const float32 = new Float32Array(pcm16.length);
      for (let i = 0; i < pcm16.length; i++) {
        float32[i] = pcm16[i] / 32768;
      }

      const audioBuffer = ctx.createBuffer(1, float32.length, 24000);
      audioBuffer.getChannelData(0).set(float32);

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      source.start();

      setAiSpeaking(true);
      source.onended = () => setAiSpeaking(false);
    } catch (e) {
      console.error("Audio oynatma hatasi:", e);
    }
  }, []);

  // Flush student buffer as message
  const flushStudentBuffer = useCallback(() => {
    const text = studentBufferRef.current.trim();
    if (text) {
      pushMessage({ role: "student", text, timestamp: Date.now() });
      studentBufferRef.current = "";
    }
  }, [pushMessage]);

  // Flush AI buffer as message
  const flushAiBuffer = useCallback(() => {
    const text = aiBufferRef.current.trim();
    if (text) {
      pushMessage({ role: "ai", text, timestamp: Date.now() });
      aiBufferRef.current = "";
    }
  }, [pushMessage]);

  const sendTextMessage = useCallback(async (
    teacherName: string,
    teacherBio: string,
    targetLanguage: string,
    persona: string,
    message = "",
  ) => {
    setIsTextSending(true);
    setError(null);

    try {
      const trimmedMessage = message.trim();
      const nextHistory = messagesRef.current.map(turn => ({ role: turn.role, text: turn.text }));
      if (trimmedMessage) {
        pushMessage({ role: "student", text: trimmedMessage, timestamp: Date.now() });
        nextHistory.push({ role: "student", text: trimmedMessage });
      }

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teacherName,
          teacherBio,
          targetLanguage,
          persona,
          message: trimmedMessage,
          history: nextHistory,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "AI sohbeti baslatilamadi");
      }

      pushMessage({
        role: "ai",
        text: payload.reply || "Hello! What would you like to talk about today?",
        timestamp: Date.now(),
      });
    } catch (err: any) {
      console.error("AI text chat hatasi:", err);
      setError(err.message || "AI sohbeti baslatilamadi");
    } finally {
      setIsTextSending(false);
    }
  }, [pushMessage]);

  const connect = useCallback(async (
    teacherName: string,
    teacherBio: string,
    targetLanguage: string,
    persona: string
  ) => {
    setIsConnecting(true);
    setError(null);

    try {
      // 1. Ephemeral token al
      const tokenRes = await fetch("/api/live", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teacherName, teacherBio, targetLanguage, persona }),
      });

      if (!tokenRes.ok) {
        const errData = await tokenRes.json();
        throw new Error(errData.error || "Token alinamadi");
      }

      const { token } = await tokenRes.json();

      // 2. GoogleGenAI ile Live session baslat
      const ai = new GoogleGenAI({
        apiKey: token,
        httpOptions: { apiVersion: "v1beta" },
      });

      const session = await ai.live.connect({
        model: GEMINI_LIVE_MODEL,
        callbacks: {
          onopen: () => {
            setIsConnected(true);
            setIsConnecting(false);
          },
          onmessage: async (msg: any) => {
            // Function call handling
            if (msg.serverContent?.modelTurn?.parts) {
              for (const part of msg.serverContent.modelTurn.parts) {
                if (part.functionCall) {
                  const { name, args, callId } = part.functionCall;
                  console.log("AI Function Call:", name, args);
                  
                  if (name === "stopSession") {
                    // We need a way to trigger stopSession from here.
                    // Since this is a hook, we can emit an event or use a callback.
                    window.dispatchEvent(new CustomEvent("speakstream-ai-stop-session"));
                    
                    // Send response back to AI
                    session.sendRealtimeInput({
                      functionResponses: [{
                        name,
                        response: { success: true },
                        id: callId
                      }]
                    });
                  }
                }
              }
            }

            // Ogrenci transcript
            if (msg.serverContent?.inputTranscription?.text) {
              const text = msg.serverContent.inputTranscription.text;
              studentBufferRef.current += text;
              setStudentTranscript(prev => prev + text);
            }

            // AI transcript
            if (msg.serverContent?.outputTranscription?.text) {
              const text = msg.serverContent.outputTranscription.text;
              aiBufferRef.current += text;
              setAiTranscript(prev => prev + text);
            }

            // AI audio chunk
            if (msg.serverContent?.modelTurn?.parts) {
              for (const part of msg.serverContent.modelTurn.parts) {
                if (part.inlineData?.data) {
                  playAudioChunk(part.inlineData.data);
                }
              }
            }

            // Turn complete — flush buffers
            if (msg.serverContent?.turnComplete) {
              flushStudentBuffer();
              flushAiBuffer();
            }
          },
          onerror: (e: any) => {
            console.error("Live API error details:", e);
            const detailedError = e.message || JSON.stringify(e) || "Unknown connection error";
            setError(`Baglanti hatasi: ${detailedError}`);
            setIsConnected(false);
            setIsConnecting(false);
          },
          onclose: () => {
            console.warn("Live API connection closed.");
            flushStudentBuffer();
            flushAiBuffer();
            setIsConnected(false);
            setAiSpeaking(false);
          },
        },
        config: {
          responseModalities: ["audio"],
        },
      });

      sessionRef.current = session;

      // 3. Mikrofon stream'ini baslat
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      mediaStreamRef.current = stream;

      // AudioContext ile PCM 16kHz stream
      const audioCtx = new AudioContext({ sampleRate: 16000 });
      const source = audioCtx.createMediaStreamSource(stream);
      sourceRef.current = source;

      // ScriptProcessor ile raw PCM al
      const processor = audioCtx.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (e) => {
        if (!sessionRef.current) return;

        const inputData = e.inputBuffer.getChannelData(0);
        // Float32 -> Int16 PCM
        const pcm16 = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]));
          pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
        }

        // Base64 encode
        const uint8 = new Uint8Array(pcm16.buffer);
        let binary = "";
        for (let i = 0; i < uint8.length; i++) {
          binary += String.fromCharCode(uint8[i]);
        }
        const base64 = btoa(binary);

        try {
          sessionRef.current.sendRealtimeInput({
            media: {
              data: base64,
              mimeType: "audio/pcm;rate=16000",
            },
          });
        } catch {
          // Session kapanmis olabilir
        }
      };

      source.connect(processor);
      processor.connect(audioCtx.destination);

    } catch (err: any) {
      console.error("Live API baglanti hatasi:", err);
      setError(err.message || "Baglanti kurulamadi");
      setIsConnecting(false);
    }
  }, [playAudioChunk, flushStudentBuffer, flushAiBuffer]);

  const disconnect = useCallback(() => {
    // Mikrofonu kapat
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(t => t.stop());
      mediaStreamRef.current = null;
    }

    // Audio processor kapat
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }

    // Session kapat
    if (sessionRef.current) {
      try {
        sessionRef.current.close();
      } catch {
        // Zaten kapanmis olabilir
      }
      sessionRef.current = null;
    }

    flushStudentBuffer();
    flushAiBuffer();
    setIsConnected(false);
    setAiSpeaking(false);
  }, [flushStudentBuffer, flushAiBuffer]);

  return {
    connect,
    disconnect,
    sendTextMessage,
    isConnected,
    isConnecting,
    isTextSending,
    aiSpeaking,
    messages,
    studentTranscript,
    aiTranscript,
    error,
  };
}
