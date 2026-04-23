"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useAccount } from "wagmi";
import {
  useScaffoldReadContract,
  useScaffoldWriteContract,
} from "~~/hooks/scaffold-eth";
import { useSpeechRecognition } from "~~/hooks/speakstream/useSpeechRecognition";
import { useGeminiVerify } from "~~/hooks/speakstream/useGeminiVerify";
import { LiveTranscript } from "~~/components/speakstream/LiveTranscript";
import { PaymentFlow } from "~~/components/speakstream/PaymentFlow";
import { MicRecorder } from "~~/components/speakstream/MicRecorder";
import { AITutorSession } from "~~/components/speakstream/AITutorSession";
import { isAITeacher, getAITeacher } from "~~/lib/teacherUtils";
import { Bot, User, Radio, ChevronDown } from "lucide-react";
import { motion } from "framer-motion";

interface ChunkDisplay {
  text: string;
  verified?: boolean;
  score?: number;
}

export default function SessionPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const sessionId = BigInt(params.id as string);
  useAccount();

  // AI tutor parametresi
  const aiTeacherAddress = searchParams.get("ai") || null;
  const isAI = aiTeacherAddress ? isAITeacher(aiTeacherAddress) : false;
  const aiTeacher = isAI && aiTeacherAddress ? getAITeacher(aiTeacherAddress) : null;

  // State
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [displayChunks, setDisplayChunks] = useState<ChunkDisplay[]>([]);
  const [releasedToTeacher, setReleasedToTeacher] = useState<bigint>(BigInt(0));
  const [refundedToStudent, setRefundedToStudent] = useState<bigint>(BigInt(0));
  const [isEnding, setIsEnding] = useState(false);
  const [verifiedCount, setVerifiedCount] = useState(0);
  const [totalChunks, setTotalChunks] = useState(0);
  const [sessionActive, setSessionActive] = useState(true);
  const [, setLastReleaseTime] = useState(0);
  const [showTechDetails, setShowTechDetails] = useState(false);

  // Hooks
  const speech = useSpeechRecognition();
  const gemini = useGeminiVerify();

  // Contract reads
  const { data: sessionData, refetch: refetchSession } = useScaffoldReadContract({
    contractName: "SpeakStream",
    functionName: "getSession",
    args: [sessionId],
  });

  const { data: teacherData } = useScaffoldReadContract({
    contractName: "SpeakStream",
    functionName: "getTeacher",
    args: [sessionData?.teacher],
  });

  // Contract writes
  const { writeContractAsync: writeContract } = useScaffoldWriteContract("SpeakStream");

  // Refs
  const elapsedRef = useRef(0);
  const lastReleaseRef = useRef(0);
  const transcriptBufferRef = useRef("");
  const sessionActiveRef = useRef(true);

  // AI tutor transcript callback
  const handleAIStudentTranscript = useCallback((fullTranscript: string) => {
    transcriptBufferRef.current = fullTranscript;
  }, []);

  useEffect(() => {
    if (sessionData) {
      setReleasedToTeacher(sessionData.releasedToTeacher);
      setRefundedToStudent(sessionData.refundedToStudent);
      setLastReleaseTime(Number(sessionData.lastReleaseTime));
      lastReleaseRef.current = Number(sessionData.lastReleaseTime);
      const isActive = sessionData.status === 0;
      setSessionActive(isActive);
      sessionActiveRef.current = isActive;
    }
  }, [sessionData]);

  // Elapsed timer
  useEffect(() => {
    if (!sessionActive || !sessionData) return;
    const startTime = Number(sessionData.startTime);
    const maxDuration = Number(sessionData.maxDuration);
    const interval = setInterval(() => {
      const now = Math.floor(Date.now() / 1000);
      const elapsed = Math.min(now - startTime, maxDuration);
      setElapsedSeconds(elapsed);
      elapsedRef.current = elapsed;
      if (elapsed >= maxDuration) {
        setSessionActive(false);
        sessionActiveRef.current = false;
        speech.stop();
        clearInterval(interval);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [sessionActive, sessionData]);

  // Human teacher: transcript chunks
  useEffect(() => {
    if (isAI) return;
    if (speech.chunks.length > 0) {
      const lastChunk = speech.chunks[speech.chunks.length - 1];
      if (lastChunk.isFinal) {
        transcriptBufferRef.current += " " + lastChunk.text;
        setDisplayChunks(prev => [...prev, { text: lastChunk.text }]);
      }
    }
  }, [speech.chunks, isAI]);

  // 30 saniyede bir AI dogrulama + release (her iki mod icin)
  useEffect(() => {
    if (!sessionActive || !sessionData) return;
    const targetLang = isAI && aiTeacher
      ? aiTeacher.targetLanguage?.toLowerCase() || "en"
      : teacherData?.languages?.split(",")[0] || "en";

    const verifyAndRelease = async () => {
      if (!sessionActiveRef.current) return;
      const currentElapsed = elapsedRef.current;
      const lastRelease = lastReleaseRef.current;
      if (currentElapsed - lastRelease < 5) return;

      const chunkDuration = currentElapsed - lastRelease;
      const transcript = transcriptBufferRef.current.trim();

      // AI modda buffer'i temizleme — surekli birikir
      if (!isAI) {
        transcriptBufferRef.current = "";
      }

      const result = await gemini.verify(transcript, targetLang, chunkDuration);
      if (!result || !sessionActiveRef.current) return;

      setTotalChunks(prev => prev + 1);
      const verifiedSecs = result.score >= 50
        ? Math.min(result.verifiedSeconds, chunkDuration)
        : 0;
      if (result.score >= 50) setVerifiedCount(prev => prev + 1);

      if (!isAI) {
        setDisplayChunks(prev => {
          const updated = [...prev];
          for (let i = Math.max(0, updated.length - 5); i < updated.length; i++) {
            if (updated[i].verified === undefined) {
              updated[i] = { ...updated[i], verified: result.score >= 50, score: result.score };
            }
          }
          return updated;
        });
      }

      try {
        await writeContract({
          functionName: "releaseElapsed",
          args: [sessionId, BigInt(currentElapsed), BigInt(verifiedSecs)],
        });
        lastReleaseRef.current = currentElapsed;
        setLastReleaseTime(currentElapsed);
        await refetchSession();
      } catch (e) {
        console.error("releaseElapsed hatasi:", e);
      }
    };

    const interval = setInterval(verifyAndRelease, 30000);
    return () => clearInterval(interval);
  }, [sessionActive, sessionData, teacherData, isAI, aiTeacher]);

  // Seans bitirme
  const handleEndSession = async () => {
    setIsEnding(true);
    try {
      const currentElapsed = elapsedRef.current;
      const lastRelease = lastReleaseRef.current;
      const targetLang = isAI && aiTeacher
        ? aiTeacher.targetLanguage?.toLowerCase() || "en"
        : teacherData?.languages?.split(",")[0] || "en";

      if (currentElapsed > lastRelease) {
        const chunkDuration = currentElapsed - lastRelease;
        const transcript = transcriptBufferRef.current.trim();
        const result = await gemini.verify(transcript, targetLang, chunkDuration);
        const verifiedSecs = result && result.score >= 50
          ? Math.min(result.verifiedSeconds, chunkDuration) : 0;
        try {
          await writeContract({
            functionName: "releaseElapsed",
            args: [sessionId, BigInt(currentElapsed), BigInt(verifiedSecs)],
          });
        } catch (e) { console.error("Son release hatasi:", e); }
      }

      await writeContract({ functionName: "endSession", args: [sessionId] });
      speech.stop();
      setSessionActive(false);
      sessionActiveRef.current = false;
      await refetchSession();
    } catch (e) { console.error("Seans bitirme hatasi:", e); }
    setIsEnding(false);
  };

  const handleStartMic = () => {
    const lang = teacherData?.languages?.split(",")[0] || "en";
    const langMap: Record<string, string> = {
      en: "en-US", tr: "tr-TR", de: "de-DE", fr: "fr-FR",
      es: "es-ES", it: "it-IT", ja: "ja-JP", ko: "ko-KR",
    };
    speech.start(langMap[lang] || "en-US");
  };

  if (!sessionData) {
    return (
      <div className="flex justify-center py-20">
        <span className="loading loading-spinner loading-lg text-primary" />
      </div>
    );
  }

  const maxDuration = Number(sessionData.maxDuration);
  const displayTeacherName = isAI && aiTeacher ? aiTeacher.name : teacherData?.name || "Ogretmen";

  return (
    <div className="max-w-7xl mx-auto px-4 py-4">
      {/* Top bar */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-4 bg-base-200 rounded-xl px-4 py-3"
      >
        <div className="flex items-center gap-3">
          <span className="font-mono text-sm text-base-content/50">Seans #{params.id}</span>
          <span className="text-base-content/20">|</span>
          <div className="flex items-center gap-2">
            {isAI ? <Bot className="h-4 w-4 text-indigo-400" /> : <User className="h-4 w-4" />}
            <span className="font-semibold text-sm">{displayTeacherName}</span>
            {isAI && <span className="badge badge-primary badge-xs">AI</span>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {sessionActive && (
            <div className="flex items-center gap-1.5 bg-green-500/10 text-green-400 px-3 py-1 rounded-full">
              <Radio className="h-3 w-3 animate-pulse" />
              <span className="text-xs font-semibold">LIVE</span>
            </div>
          )}
          {!sessionActive && <div className="badge badge-neutral badge-sm">SONA ERDI</div>}
        </div>
      </motion.div>

      {/* 3-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Sol sutun — Ogretmen karti */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:col-span-3"
        >
          <div className={`card shadow-xl ${
            isAI
              ? "bg-gradient-to-br from-indigo-950/80 to-purple-950/80 border border-indigo-500/20"
              : "bg-base-100"
          }`}>
            <div className="card-body items-center text-center p-4">
              {isAI && aiTeacher ? (
                <div className="w-16 h-16 rounded-full overflow-hidden bg-gradient-to-br from-indigo-500 to-purple-500 mb-2">
                  <img src={aiTeacher.avatar} alt={aiTeacher.name} className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="avatar placeholder mb-2">
                  <div className="bg-gradient-to-br from-indigo-500 to-purple-500 text-white rounded-full w-16 h-16">
                    <span className="text-2xl font-bold">{displayTeacherName.charAt(0)}</span>
                  </div>
                </div>
              )}

              <h3 className="font-bold text-sm">{displayTeacherName}</h3>

              {isAI && (
                <div className="badge badge-primary badge-sm mt-1">AI Tutor</div>
              )}

              {sessionActive && (
                <div className="flex items-center gap-1 mt-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-xs text-green-500">Aktif</span>
                </div>
              )}

              {/* Mikrofon (sadece insan ogretmen modu) */}
              {!isAI && sessionActive && (
                <div className="mt-4">
                  <MicRecorder
                    isListening={speech.isListening}
                    onStart={handleStartMic}
                    onStop={speech.stop}
                    error={speech.error}
                  />
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Orta sutun — Konusma alani */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-5"
        >
          <div className="card bg-base-100 shadow-xl h-full">
            <div className="card-body p-4">
              {isAI && aiTeacher ? (
                <AITutorSession
                  teacherName={aiTeacher.name}
                  teacherBio={aiTeacher.bio}
                  targetLanguage={aiTeacher.targetLanguage}
                  persona={aiTeacher.persona}
                  avatar={aiTeacher.avatar}
                  isActive={sessionActive}
                  onStudentTranscriptUpdate={handleAIStudentTranscript}
                />
              ) : (
                <LiveTranscript
                  chunks={displayChunks}
                  interimText={speech.interimTranscript}
                  isListening={speech.isListening}
                  isVerifying={gemini.isVerifying}
                  lastVerification={gemini.lastResult}
                />
              )}
            </div>
          </div>
        </motion.div>

        {/* Sag sutun — Odeme akisi */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-4"
        >
          <div className="card bg-base-100 shadow-xl h-full">
            <div className="card-body p-4">
              <PaymentFlow
                totalDeposited={sessionData.totalDeposited}
                releasedToTeacher={releasedToTeacher}
                refundedToStudent={refundedToStudent}
                elapsedSeconds={elapsedSeconds}
                maxDuration={maxDuration}
                isActive={sessionActive}
                onEndSession={handleEndSession}
                isEnding={isEnding}
                verifiedCount={verifiedCount}
                totalChunks={totalChunks}
              />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Bottom bar */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mt-4 bg-base-200 rounded-xl px-4 py-3"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-base-content/50">
            <span>Monad Testnet (10143)</span>
            <span className="text-base-content/20">|</span>
            <span>Escrow ile korunuyor</span>
          </div>
          <button
            className="flex items-center gap-1 text-xs text-base-content/40 hover:text-base-content/60 transition-colors"
            onClick={() => setShowTechDetails(!showTechDetails)}
          >
            Teknik Detaylar
            <ChevronDown className={`h-3 w-3 transition-transform ${showTechDetails ? "rotate-180" : ""}`} />
          </button>
        </div>
        {showTechDetails && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="mt-2 pt-2 border-t border-base-content/10 text-xs text-base-content/40 flex flex-wrap gap-4"
          >
            <span>{isAI ? "Live API: Gemini 3.1 Flash Live" : "Ses Tanima: Web Speech API"}</span>
            <span>Dogrulama: Gemini 2.5 Flash</span>
            <span>Blok Suresi: 400ms</span>
            <span>Dogrulama Araligi: 30sn</span>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
