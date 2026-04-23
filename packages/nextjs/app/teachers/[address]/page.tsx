"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { formatEther, parseEther } from "viem";
import { useAccount } from "wagmi";
import {
  useScaffoldReadContract,
  useScaffoldWatchContractEvent,
  useScaffoldWriteContract,
} from "~~/hooks/scaffold-eth";
import { getAITeacher, getContractAddressForTeacher, isAITeacher } from "~~/lib/teacherUtils";
import { ArrowRight, Bot, Clock, Globe, Shield, Sparkles, Wallet } from "lucide-react";
import { motion } from "framer-motion";

const languageNames: Record<string, string> = {
  en: "English",
  tr: "Turkish",
  de: "German",
  fr: "French",
  es: "Spanish",
  it: "Italian",
  ja: "Japanese",
  ko: "Korean",
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
  const contractTeacherAddress = getContractAddressForTeacher(teacherAddress);
  const isAI = isAITeacher(teacherAddress);
  const aiTeacher = isAI ? getAITeacher(teacherAddress) : null;
  const { address: connectedAddress } = useAccount();

  const [selectedDuration, setSelectedDuration] = useState(600);
  const [topUpAmount, setTopUpAmount] = useState("0.1");
  const [isFunding, setIsFunding] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  const { data: contractTeacher, isLoading } = useScaffoldReadContract({
    contractName: "StreamingTutorEscrow",
    functionName: "getTutor",
    args: [contractTeacherAddress],
  });

  const { data: studentBalance, refetch: refetchBalance } = useScaffoldReadContract({
    contractName: "StreamingTutorEscrow",
    functionName: "studentBalances",
    args: [connectedAddress],
  });

  const { data: activeSessionId } = useScaffoldReadContract({
    contractName: "StreamingTutorEscrow",
    functionName: "activeSessionIds",
    args: [connectedAddress],
  });

  const { writeContractAsync: deposit } = useScaffoldWriteContract("StreamingTutorEscrow");
  const { writeContractAsync: startSession } = useScaffoldWriteContract("StreamingTutorEscrow");

  useScaffoldWatchContractEvent({
    contractName: "StreamingTutorEscrow",
    eventName: "SessionStarted",
    onLogs: logs => {
      for (const log of logs) {
        const student = (log.args as Record<string, unknown>).student as string | undefined;
        const sessionId = (log.args as Record<string, unknown>).sessionId as bigint | undefined;

        if (student?.toLowerCase() === connectedAddress?.toLowerCase() && sessionId !== undefined) {
          const suffix = isAI ? `?ai=${encodeURIComponent(teacherAddress)}` : "";
          router.push(`/session/${sessionId.toString()}${suffix}`);
        }
      }
    },
  });

  const teacher = contractTeacher
    ? {
        name: isAI ? aiTeacher?.name || contractTeacher.name : contractTeacher.name,
        bio: isAI ? aiTeacher?.bio || contractTeacher.bio : contractTeacher.bio,
        languages: isAI ? aiTeacher?.languages || contractTeacher.languages : contractTeacher.languages,
        ratePerSecond: contractTeacher.ratePerSecond,
        active: contractTeacher.active,
        totalEarned: contractTeacher.totalEarned,
        totalClaimed: contractTeacher.totalClaimed,
        avatar: aiTeacher?.avatar,
      }
    : null;

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <span className="loading loading-spinner loading-lg text-primary" />
      </div>
    );
  }

  if (!teacher || teacherAddress === contractTeacherAddress && teacher.name.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-xl text-base-content/50">Ogretmen bulunamadi</p>
      </div>
    );
  }

  const ratePerHour = teacher.ratePerSecond * BigInt(3600);
  const requiredDeposit = teacher.ratePerSecond * BigInt(selectedDuration);
  const availableBalance = studentBalance || 0n;
  const hasEnoughBalance = availableBalance >= requiredDeposit;
  const hasActiveSession = Boolean(activeSessionId && activeSessionId > 0n);
  const langList = teacher.languages.split(",").map((lang: string) => lang.trim()).filter(Boolean);

  const handleFund = async () => {
    if (!connectedAddress || !topUpAmount) return;
    setIsFunding(true);

    try {
      await deposit({
        functionName: "deposit",
        value: parseEther(topUpAmount),
      });
      await refetchBalance();
    } catch (error) {
      console.error("Bakiye yukleme hatasi:", error);
    } finally {
      setIsFunding(false);
    }
  };

  const handleStartSession = async () => {
    if (!connectedAddress || !hasEnoughBalance || hasActiveSession) return;
    setIsStarting(true);

    try {
      await startSession({
        functionName: "startSession",
        args: [contractTeacherAddress, BigInt(selectedDuration)],
      });
    } catch (error) {
      console.error("Seans baslatilamadi:", error);
    } finally {
      setIsStarting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:col-span-2"
        >
          <div
            className={`card shadow-xl ${
              isAI
                ? "bg-gradient-to-br from-indigo-950/80 to-purple-950/80 border border-indigo-500/20"
                : "bg-base-100"
            }`}
          >
            <div className="card-body items-center text-center">
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

              {isAI && (
                <div className="flex items-center gap-1 bg-indigo-500/20 text-indigo-300 px-3 py-1 rounded-full text-sm font-semibold mb-2">
                  <Bot className="h-4 w-4" />
                  AI Tutor Pool
                </div>
              )}

              <h1 className="text-2xl font-bold">{teacher.name}</h1>

              <div className="flex items-center gap-1 mt-1">
                <div className={`w-2 h-2 rounded-full ${teacher.active ? "bg-green-500 animate-pulse" : "bg-red-500"}`} />
                <span className={`text-sm ${teacher.active ? "text-green-500" : "text-error"}`}>
                  {teacher.active ? (isAI ? "Her zaman aktif" : "Aktif") : "Pasif"}
                </span>
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
                  <div className="font-bold text-primary text-sm">{Number(formatEther(ratePerHour)).toFixed(4)} MON/saat</div>
                </div>
                <div className="bg-base-200/50 rounded-xl p-3 text-center">
                  <div className="text-xs text-base-content/50">Toplam Kazanc</div>
                  <div className="font-bold text-sm">{Number(formatEther(teacher.totalEarned)).toFixed(4)} MON</div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

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
                Bu v1 akisinda bakiye once kontrata yatirilir, seans bitince egitmen payini ceker ve kalan bakiye ogrenciye iade edilir.
              </p>

              <div className="mb-6">
                <label className="text-sm font-semibold mb-2 block">Seans Suresi</label>
                <div className="grid grid-cols-5 gap-2">
                  {durationOptions.map(option => (
                    <button
                      key={option.seconds}
                      className={`btn btn-sm ${
                        selectedDuration === option.seconds
                          ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white border-none"
                          : "btn-outline"
                      }`}
                      onClick={() => setSelectedDuration(option.seconds)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-base-200 rounded-2xl p-6 mb-6 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-base-content/60 text-sm">Seans suresi</span>
                  <span className="font-semibold">{selectedDuration / 60} dakika</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-base-content/60 text-sm">Saatlik ucret</span>
                  <span className="font-semibold">{Number(formatEther(ratePerHour)).toFixed(4)} MON</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-base-content/60 text-sm">Gerekli escrow</span>
                  <span className="font-semibold text-primary">{Number(formatEther(requiredDeposit)).toFixed(4)} MON</span>
                </div>
                <div className="divider my-1" />
                <div className="flex justify-between items-center">
                  <span className="text-base-content/60 text-sm">Mevcut bakiye</span>
                  <span className="font-semibold">{Number(formatEther(availableBalance)).toFixed(4)} MON</span>
                </div>
              </div>

              {!hasEnoughBalance && (
                <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-4 mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Wallet className="h-4 w-4 text-indigo-400" />
                    <span className="font-semibold">Once escrow bakiyesi yukle</span>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      className="input input-bordered flex-1"
                      value={topUpAmount}
                      onChange={event => setTopUpAmount(event.target.value)}
                    />
                    <button
                      className="btn btn-primary"
                      onClick={handleFund}
                      disabled={!connectedAddress || isFunding}
                    >
                      {isFunding ? <span className="loading loading-spinner" /> : "Bakiye Yukle"}
                    </button>
                  </div>
                  <p className="text-xs text-base-content/50 mt-2">
                    Alternatif olarak ana sayfadaki demo panelinden de bakiye yukleyebilirsin.
                  </p>
                </div>
              )}

              <div className="rounded-2xl border border-base-300 p-4 mb-6">
                <div className="flex items-start gap-3">
                  <Shield className="h-5 w-5 text-green-500 mt-0.5" />
                  <div className="text-sm text-base-content/70">
                    Para seans basinda dogrudan egitmene gitmez. Seans durduruldugunda kazanilan tutar hesaplanir; egitmen
                    `claim`, ogrenci ise `refundUnused` ile kendi payini ceker.
                  </div>
                </div>
              </div>

              <button
                className="btn btn-lg btn-block bg-gradient-to-r from-indigo-500 to-purple-500 text-white border-none shadow-lg shadow-indigo-500/25"
                onClick={handleStartSession}
                disabled={!connectedAddress || !teacher.active || !hasEnoughBalance || hasActiveSession || isStarting}
              >
                {isStarting ? (
                  <span className="loading loading-spinner" />
                ) : (
                  <>
                    <Sparkles className="h-5 w-5" />
                    Seansi Baslat
                    <ArrowRight className="h-5 w-5" />
                  </>
                )}
              </button>

              {hasActiveSession && (
                <p className="text-center text-sm text-warning mt-2">
                  Acik bir seansin var. Yeni seans icin once onu durdurman gerekir.
                </p>
              )}

              {!connectedAddress && (
                <p className="text-center text-sm text-warning mt-2">
                  Seans baslatmak icin once cuzdanini bagla.
                </p>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

