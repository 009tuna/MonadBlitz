"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { formatEther } from "viem";
import { useAccount } from "wagmi";
import {
  useScaffoldReadContract,
  useScaffoldWriteContract,
  useScaffoldWatchContractEvent,
} from "~~/hooks/scaffold-eth";
import { isAITeacher, getAITeacher, AI_TUTOR_POOL_ADDRESS } from "~~/lib/teacherUtils";
import { Clock, DollarSign, Globe, ArrowRight, Bot, Shield, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

const languageNames: Record<string, string> = {
  en: "English", tr: "Turkish", de: "German", fr: "French",
  es: "Spanish", it: "Italian", ja: "Japanese", ko: "Korean",
};

const durationOptions = [
  { label: "5 dk", seconds: 300 },
  { label: "10 dk", seconds: 600 },
  { label: "15 dk", seconds: 900 },
  { label: "30 dk", seconds: 1800 },
  { label: "60 dk", seconds: 3600 },
];

export default function TeacherDetailPage() {
  const params = useParams();
  const router = useRouter();
  const teacherAddress = params.address as string;
  const { address: connectedAddress } = useAccount();

  const [selectedDuration, setSelectedDuration] = useState(600);
  const [isStarting, setIsStarting] = useState(false);

  // AI ogretmen mi kontrol et
  const isAI = isAITeacher(teacherAddress);
  const aiTeacher = isAI ? getAITeacher(teacherAddress) : null;

  // AI degilse kontrattan oku
  const { data: contractTeacher, isLoading } = useScaffoldReadContract({
    contractName: "SpeakStream",
    functionName: "getTeacher",
    args: [isAI ? AI_TUTOR_POOL_ADDRESS : teacherAddress],
  });

  const { writeContractAsync: startSession } = useScaffoldWriteContract("SpeakStream");

  useScaffoldWatchContractEvent({
    contractName: "SpeakStream",
    eventName: "SessionStarted",
    onLogs: (logs) => {
      for (const log of logs) {
        if (log.args.student?.toLowerCase() === connectedAddress?.toLowerCase()) {
          const sessionId = log.args.sessionId;
          // AI tutor ise session URL'ine ai param ekle
          if (isAI) {
            router.push(`/session/${sessionId}?ai=${encodeURIComponent(teacherAddress)}`);
          } else {
            router.push(`/session/${sessionId}`);
          }
        }
      }
    },
  });

  // Ogretmen bilgilerini birlestir
  const teacher = isAI && aiTeacher
    ? {
        name: aiTeacher.name,
        bio: aiTeacher.bio,
        languages: aiTeacher.languages,
        ratePerSecond: aiTeacher.ratePerSecond,
        active: true,
        totalEarned: BigInt(0),
        avatar: aiTeacher.avatar,
        persona: aiTeacher.persona,
        targetLanguage: aiTeacher.targetLanguage,
      }
    : contractTeacher
    ? {
        name: contractTeacher.name,
        bio: contractTeacher.bio,
        languages: contractTeacher.languages,
        ratePerSecond: contractTeacher.ratePerSecond,
        active: contractTeacher.active,
        totalEarned: contractTeacher.totalEarned,
      }
    : null;

  if (!isAI && isLoading) {
    return (
      <div className="flex justify-center py-20">
        <span className="loading loading-spinner loading-lg text-primary" />
      </div>
    );
  }

  if (!teacher) {
    return (
      <div className="text-center py-20">
        <p className="text-xl text-base-content/50">Ogretmen bulunamadi</p>
      </div>
    );
  }

  const ratePerHour = teacher.ratePerSecond * BigInt(3600);
  const totalCost = teacher.ratePerSecond * BigInt(selectedDuration);
  const langList = teacher.languages.split(",").map((l: string) => l.trim()).filter(Boolean);

  const handleStartSession = async () => {
    if (!connectedAddress) return;
    setIsStarting(true);
    try {
      // AI ogretmen icin pool adresine, insan icin kendi adresine
      const contractAddr = isAI ? AI_TUTOR_POOL_ADDRESS : teacherAddress;
      await startSession({
        functionName: "startSession",
        args: [contractAddr, BigInt(selectedDuration)],
        value: totalCost,
      });
    } catch (e) {
      console.error("Seans baslatilamadi:", e);
      setIsStarting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Sol: Ogretmen bilgileri */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:col-span-2"
        >
          <div className={`card shadow-xl ${
            isAI
              ? "bg-gradient-to-br from-indigo-950/80 to-purple-950/80 border border-indigo-500/20"
              : "bg-base-100"
          }`}>
            <div className="card-body items-center text-center">
              {/* Avatar */}
              {isAI && teacher.avatar ? (
                <div className="w-24 h-24 rounded-full overflow-hidden bg-gradient-to-br from-indigo-500 to-purple-500 mb-2">
                  <img src={teacher.avatar} alt={teacher.name} className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="avatar placeholder mb-2">
                  <div className="bg-gradient-to-br from-indigo-500 to-purple-500 text-white rounded-full w-24 h-24">
                    <span className="text-4xl font-bold">{teacher.name.charAt(0).toUpperCase()}</span>
                  </div>
                </div>
              )}

              {/* AI Badge */}
              {isAI && (
                <div className="flex items-center gap-1 bg-indigo-500/20 text-indigo-300 px-3 py-1 rounded-full text-sm font-semibold mb-2">
                  <Bot className="h-4 w-4" />
                  AI Tutor — Gemini Live
                </div>
              )}

              <h1 className="text-2xl font-bold">{teacher.name}</h1>

              <div className="flex items-center gap-1 mt-1">
                {teacher.active ? (
                  <>
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-sm text-green-500">
                      {isAI ? "Her zaman aktif" : "Active"}
                    </span>
                  </>
                ) : (
                  <span className="text-sm text-error">Inactive</span>
                )}
              </div>

              <p className="text-base-content/70 mt-3">{teacher.bio}</p>

              <div className="flex items-center gap-2 flex-wrap mt-4 justify-center">
                <Globe className="h-4 w-4 text-base-content/50" />
                {langList.map((lang: string) => (
                  <span key={lang} className="badge badge-primary badge-outline badge-sm">
                    {languageNames[lang] || lang}
                  </span>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3 mt-4 w-full">
                <div className="bg-base-200/50 rounded-xl p-3 text-center">
                  <div className="text-xs text-base-content/50">Ucret</div>
                  <div className="font-bold text-primary text-sm">
                    {Number(formatEther(ratePerHour)).toFixed(4)} MON/saat
                  </div>
                </div>
                <div className="bg-base-200/50 rounded-xl p-3 text-center">
                  <div className="text-xs text-base-content/50">
                    {isAI ? "Teknoloji" : "Toplam Kazanc"}
                  </div>
                  <div className="font-bold text-sm">
                    {isAI ? "Gemini 3.1" : `${Number(formatEther(teacher.totalEarned)).toFixed(4)} MON`}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Sag: Seans baslat */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-3"
        >
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title text-2xl mb-2">
                <Clock className="h-6 w-6" />
                Seansini Planla
              </h2>
              <p className="text-sm text-base-content/50 mb-6">
                Sadece gercekten konustugu saniye kadar harcanir. Kalanini iade alirsin.
              </p>

              {/* Sure secimi */}
              <div className="mb-6">
                <label className="text-sm font-semibold mb-2 block">Seans Suresi</label>
                <div className="grid grid-cols-5 gap-2">
                  {durationOptions.map(opt => (
                    <button
                      key={opt.seconds}
                      className={`btn btn-sm ${
                        selectedDuration === opt.seconds
                          ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white border-none"
                          : "btn-outline"
                      }`}
                      onClick={() => setSelectedDuration(opt.seconds)}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Maliyet onizleme */}
              <div className="bg-base-200 rounded-2xl p-6 mb-6 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-base-content/60 text-sm">Seans suresi</span>
                  <span className="font-semibold">{selectedDuration / 60} dakika</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-base-content/60 text-sm">Ucret</span>
                  <span className="font-semibold">{Number(formatEther(ratePerHour)).toFixed(4)} MON/saat</span>
                </div>
                <div className="divider my-1" />
                <div className="flex justify-between items-center">
                  <span className="font-bold text-lg">Toplam Kilitlenecek</span>
                  <span className="font-bold text-lg text-primary flex items-center gap-1">
                    <DollarSign className="h-5 w-5" />
                    {Number(formatEther(totalCost)).toFixed(6)} MON
                  </span>
                </div>
              </div>

              {/* Bilgi */}
              <div className="flex items-start gap-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-4 mb-6">
                <Shield className="h-5 w-5 text-indigo-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-base-content/70">
                  <p className="font-semibold text-indigo-300 mb-1">Escrow Korumasi</p>
                  <p>MON&#39;lar akilli kontrata kilitlenir. AI dogrulama her 30 saniyede konusmanizi kontrol eder. Sadece dogrulanan saniyeler icin odeme yapilir, kalan otomatik iade edilir.</p>
                </div>
              </div>

              {/* Baslat butonu */}
              <button
                className="btn btn-lg btn-block bg-gradient-to-r from-indigo-500 to-purple-500 text-white border-none hover:from-indigo-600 hover:to-purple-600 shadow-lg shadow-indigo-500/25"
                onClick={handleStartSession}
                disabled={!connectedAddress || (!isAI && !teacher.active) || isStarting}
              >
                {isStarting ? (
                  <span className="loading loading-spinner" />
                ) : (
                  <>
                    {isAI ? <Bot className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}
                    Seansi Baslat — {Number(formatEther(totalCost)).toFixed(6)} MON Kilitle
                    <ArrowRight className="h-5 w-5" />
                  </>
                )}
              </button>

              {!connectedAddress && (
                <p className="text-center text-sm text-warning mt-2">
                  Seans baslatmak icin cuzdaninizi baglayin
                </p>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
