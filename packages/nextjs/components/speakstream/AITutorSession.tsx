"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bot, MessageSquare, Mic, MicOff, Send, User, Wifi, WifiOff } from "lucide-react";
import { useGeminiLive } from "~~/hooks/speakstream/useGeminiLive";

interface AITutorSessionProps {
  teacherName: string;
  teacherBio: string;
  targetLanguage: string;
  persona: string;
  avatar: string;
  isActive: boolean;
  /** Callback: her yeni student transcript chunk'inda cagrilir (odeme dogrulamasi icin) */
  onStudentTranscriptUpdate?: (fullTranscript: string) => void;
}

export const AITutorSession = ({
  teacherName,
  teacherBio,
  targetLanguage,
  persona,
  isActive,
  onStudentTranscriptUpdate,
}: AITutorSessionProps) => {
  const live = useGeminiLive();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showFallbackWarning, setShowFallbackWarning] = useState(false);
  const [messageInput, setMessageInput] = useState("");

  // Otomatik scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [live.messages]);

  // Student transcript degistiginde callback cagir
  useEffect(() => {
    if (onStudentTranscriptUpdate && live.studentTranscript) {
      onStudentTranscriptUpdate(live.studentTranscript);
    }
  }, [live.studentTranscript, onStudentTranscriptUpdate, live]);

  // Seans bittiginde disconnect
  useEffect(() => {
    if (!isActive && live.isConnected) {
      live.disconnect();
    }
  }, [isActive, live.isConnected, live]);

  const handleConnect = async () => {
    try {
      await live.connect(teacherName, teacherBio, targetLanguage, persona);
    } catch {
      setShowFallbackWarning(true);
    }
  };

  const handleDisconnect = () => {
    live.disconnect();
  };

  const handleStartTextChat = async () => {
    await live.sendTextMessage(teacherName, teacherBio, targetLanguage, persona);
  };

  const handleSendMessage = async () => {
    const trimmed = messageInput.trim();
    if (!trimmed || live.isTextSending) return;
    setMessageInput("");
    await live.sendTextMessage(teacherName, teacherBio, targetLanguage, persona, trimmed);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Connection status bar */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h3 className="font-bold text-lg">AI Konusma</h3>
          {live.isConnected ? (
            <div className="flex items-center gap-1 text-green-400">
              <Wifi className="h-4 w-4" />
              <span className="text-xs font-semibold">LIVE</span>
            </div>
          ) : live.isConnecting ? (
            <div className="flex items-center gap-1 text-yellow-400">
              <span className="loading loading-dots loading-xs" />
              <span className="text-xs">Baglaniyor...</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-base-content/30">
              <WifiOff className="h-4 w-4" />
              <span className="text-xs">Bagli degil</span>
            </div>
          )}
        </div>

        {live.aiSpeaking && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-1 bg-indigo-500/20 text-indigo-300 px-3 py-1 rounded-full"
          >
            <Bot className="h-4 w-4" />
            <span className="text-xs font-semibold">{teacherName.split(" — ")[0]} konusuyor...</span>
            <span className="flex gap-0.5">
              <span className="w-1 h-3 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-1 h-3 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-1 h-3 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
            </span>
          </motion.div>
        )}
      </div>

      {/* Chat messages area */}
      <div
        ref={scrollRef}
        className="flex-1 bg-base-200 rounded-xl p-4 overflow-y-auto min-h-[300px] max-h-[500px] space-y-3"
      >
        {live.messages.length === 0 && !live.isConnected && !live.isConnecting && (
          <div className="flex flex-col items-center justify-center h-full text-base-content/30 gap-3">
            <Bot className="h-16 w-16" />
            <p className="text-center text-sm">
              AI ogretmenle konusmaya baslamak icin
              <br />
              asagidaki butona basin
            </p>
          </div>
        )}

        {live.messages.length === 0 && live.isConnecting && (
          <div className="flex flex-col items-center justify-center h-full text-base-content/30 gap-3">
            <span className="loading loading-spinner loading-lg text-primary" />
            <p className="text-sm">Gemini Live API&apos;ye baglaniyor...</p>
          </div>
        )}

        <AnimatePresence>
          {live.messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className={`flex gap-2 ${msg.role === "student" ? "justify-end" : "justify-start"}`}
            >
              {msg.role === "ai" && (
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
                    <Bot className="h-4 w-4 text-white" />
                  </div>
                </div>
              )}

              <div
                className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                  msg.role === "ai"
                    ? "bg-indigo-500/20 text-indigo-100 rounded-tl-sm"
                    : "bg-base-300 text-base-content rounded-tr-sm"
                }`}
              >
                {msg.text}
              </div>

              {msg.role === "student" && (
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 rounded-full bg-base-300 flex items-center justify-center">
                    <User className="h-4 w-4 text-base-content/50" />
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {live.aiSpeaking && live.aiTranscript && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-2 items-end">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
              <Bot className="h-4 w-4 text-white" />
            </div>
            <div className="bg-indigo-500/20 px-4 py-3 rounded-2xl rounded-tl-sm border border-indigo-500/30">
              <p className="text-sm italic text-indigo-200">
                {live.aiTranscript}
                <span className="inline-block w-1.5 h-4 bg-indigo-400 ml-1 animate-pulse align-middle" />
              </p>
            </div>
          </motion.div>
        )}
      </div>

      {/* Error display */}
      {(live.error || showFallbackWarning) && (
        <div className="alert alert-warning text-sm mt-3">
          <span>
            {live.error || "Live API baglantisi kurulamadi. Web Speech API fallback modunda calisabilirsiniz."}
          </span>
        </div>
      )}

      <div className="mt-4 space-y-3">
        {live.messages.length === 0 && (
          <button
            className="btn btn-lg w-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white border-none shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/40 transition-all"
            onClick={handleStartTextChat}
            disabled={live.isTextSending}
          >
            {live.isTextSending ? <span className="loading loading-spinner" /> : <MessageSquare className="h-5 w-5" />}
            Sohbeti Baslat
          </button>
        )}

        <div className="flex gap-2">
          <input
            type="text"
            className="input input-bordered flex-1"
            placeholder={`${targetLanguage || "English"} dilinde bir sey yaz...`}
            value={messageInput}
            onChange={event => setMessageInput(event.target.value)}
            onKeyDown={event => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void handleSendMessage();
              }
            }}
          />
          <button
            className="btn btn-primary"
            onClick={handleSendMessage}
            disabled={!messageInput.trim() || live.isTextSending}
          >
            {live.isTextSending ? <span className="loading loading-spinner" /> : <Send className="h-4 w-4" />}
          </button>
        </div>

        <div className="rounded-2xl border border-base-300 p-3">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-base-content/50">Sesli Mod</div>
          <div className="flex flex-wrap gap-2">
            {!live.isConnected && !live.isConnecting ? (
              <button className="btn btn-outline" onClick={handleConnect} disabled={!isActive}>
                <Mic className="h-4 w-4" />
                Mikrofonu Bagla
              </button>
            ) : live.isConnecting ? (
              <button className="btn btn-disabled">
                <span className="loading loading-spinner" />
                Baglaniyor...
              </button>
            ) : (
              <button className="btn btn-error" onClick={handleDisconnect}>
                <MicOff className="h-4 w-4" />
                Mikrofonu Durdur
              </button>
            )}
            {!isActive && (
              <div className="self-center text-xs text-base-content/50">Sesli mod icin aktif seans gerekiyor.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
