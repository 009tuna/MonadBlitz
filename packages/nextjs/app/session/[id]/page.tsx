"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { formatEther } from "viem";
import { useAccount } from "wagmi";
import { motion } from "framer-motion";
import { Bot, Clock3, DollarSign, Shield, User } from "lucide-react";
import { AITutorSession } from "~~/components/speakstream";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { getAITeacher, isAITeacher } from "~~/lib/teacherUtils";

export default function SessionPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const { address: connectedAddress } = useAccount();
  const sessionId = BigInt(params.id as string);
  const aiTeacherAddress = searchParams.get("ai") || "";
  const isAI = aiTeacherAddress ? isAITeacher(aiTeacherAddress) : false;
  const aiTeacher = isAI ? getAITeacher(aiTeacherAddress) : null;

  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  const [isStopping, setIsStopping] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [isRefunding, setIsRefunding] = useState(false);

  const { data: sessionData, refetch: refetchSession } = useScaffoldReadContract({
    contractName: "StreamingTutorEscrow",
    functionName: "getSession",
    args: [sessionId],
  });

  const { data: tutorData } = useScaffoldReadContract({
    contractName: "StreamingTutorEscrow",
    functionName: "getTutor",
    args: [sessionData?.tutor],
  });

  const { writeContractAsync: writeContract } = useScaffoldWriteContract("StreamingTutorEscrow");

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => window.clearInterval(timer);
  }, []);

  if (!sessionData) {
    return (
      <div className="flex justify-center py-20">
        <span className="loading loading-spinner loading-lg text-primary" />
      </div>
    );
  }

  const isActive = sessionData.status === 1;
  const sessionTutorName = isAI && aiTeacher ? aiTeacher.name : tutorData?.name || "Tutor";
  const elapsedSeconds = isActive
    ? Math.min(now - Number(sessionData.startTime), Number(sessionData.maxDuration))
    : Number(sessionData.stopTime > 0n ? sessionData.stopTime - sessionData.startTime : 0n);
  const liveSpent = isActive ? sessionData.ratePerSecond * BigInt(Math.max(0, elapsedSeconds)) : sessionData.earnedAmount;
  const spent = liveSpent > sessionData.depositAmount ? sessionData.depositAmount : liveSpent;
  const remaining = sessionData.depositAmount - spent;
  const claimable = sessionData.earnedAmount - sessionData.claimedAmount;
  const refundable = sessionData.depositAmount - sessionData.earnedAmount - sessionData.refundedAmount;
  const remainingAmount = BigInt(remaining);
  const claimableAmount = BigInt(claimable);
  const refundableAmount = BigInt(refundable);
  const isStudent = connectedAddress?.toLowerCase() === sessionData.student.toLowerCase();
  const isTutor = connectedAddress?.toLowerCase() === sessionData.tutor.toLowerCase();

  const handleStop = async () => {
    setIsStopping(true);
    try {
      await writeContract({
        functionName: "stopSession",
        args: [sessionId],
      });
      await refetchSession();
    } catch (error) {
      console.error("Session stop hatasi:", error);
    } finally {
      setIsStopping(false);
    }
  };

  const handleClaim = async () => {
    setIsClaiming(true);
    try {
      await writeContract({
        functionName: "claim",
        args: [sessionId],
      });
      await refetchSession();
    } catch (error) {
      console.error("Claim hatasi:", error);
    } finally {
      setIsClaiming(false);
    }
  };

  const handleRefund = async () => {
    setIsRefunding(true);
    try {
      await writeContract({
        functionName: "refundUnused",
        args: [sessionId],
      });
      await refetchSession();
    } catch (error) {
      console.error("Refund hatasi:", error);
    } finally {
      setIsRefunding(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-4 rounded-3xl border border-base-300 bg-base-100 p-6 shadow-xl md:flex-row md:items-center md:justify-between"
      >
        <div>
          <div className="text-sm font-mono text-base-content/50">Session #{sessionId.toString()}</div>
          <div className="mt-2 flex items-center gap-3">
            {isAI ? <Bot className="h-5 w-5 text-indigo-400" /> : <User className="h-5 w-5" />}
            <div>
              <div className="font-semibold">{sessionTutorName}</div>
              <div className="text-sm text-base-content/60">
                {isActive ? "Escrow acik ve sure akiyor" : "Session durduruldu, settlement bekliyor"}
              </div>
            </div>
          </div>
        </div>

        <div className={`badge badge-lg ${isActive ? "badge-success" : "badge-neutral"}`}>
          {isActive ? "ACTIVE" : "STOPPED"}
        </div>
      </motion.div>

      {isAI && aiTeacher && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 rounded-3xl border border-indigo-500/20 bg-base-100 p-6 shadow-xl"
        >
          <AITutorSession
            teacherName={aiTeacher.name}
            teacherBio={aiTeacher.bio}
            targetLanguage={aiTeacher.targetLanguage}
            persona={aiTeacher.persona}
            avatar={aiTeacher.avatar}
            isActive={isActive}
          />
        </motion.div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <div className="flex items-center gap-2 text-base-content/60">
              <Clock3 className="h-4 w-4" />
              <span>Gecen Sure</span>
            </div>
            <div className="text-4xl font-bold">
              {Math.floor(elapsedSeconds / 60)
                .toString()
                .padStart(2, "0")}
              :
              {(elapsedSeconds % 60).toString().padStart(2, "0")}
            </div>
            <p className="text-sm text-base-content/50">Maksimum {Number(sessionData.maxDuration) / 60} dakika</p>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <div className="flex items-center gap-2 text-base-content/60">
              <DollarSign className="h-4 w-4" />
              <span>Harcanan Escrow</span>
            </div>
            <div className="text-4xl font-bold text-primary">{Number(formatEther(spent)).toFixed(4)} MON</div>
            <p className="text-sm text-base-content/50">
              Saniyelik ucret {Number(formatEther(sessionData.ratePerSecond * 60n)).toFixed(4)} MON/dakika
            </p>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <div className="flex items-center gap-2 text-base-content/60">
              <Shield className="h-4 w-4" />
              <span>Kalan Escrow</span>
            </div>
            <div className="text-4xl font-bold">{Number(formatEther(remainingAmount)).toFixed(4)} MON</div>
            <p className="text-sm text-base-content/50">Baslangic escrow {Number(formatEther(sessionData.depositAmount)).toFixed(4)} MON</p>
          </div>
        </motion.div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">Settlement Durumu</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-base-content/60">Tutor hak edisi</span>
                <span className="font-semibold">{Number(formatEther(sessionData.earnedAmount)).toFixed(4)} MON</span>
              </div>
              <div className="flex justify-between">
                <span className="text-base-content/60">Claim edilen</span>
                <span className="font-semibold">{Number(formatEther(sessionData.claimedAmount)).toFixed(4)} MON</span>
              </div>
              <div className="flex justify-between">
                <span className="text-base-content/60">Ogrenci iadesi</span>
                <span className="font-semibold">{Number(formatEther(sessionData.refundedAmount)).toFixed(4)} MON</span>
              </div>
              <div className="divider my-0" />
              <div className="flex justify-between">
                <span className="text-base-content/60">Claimable</span>
                <span className="font-semibold text-primary">{Number(formatEther(claimableAmount)).toFixed(4)} MON</span>
              </div>
              <div className="flex justify-between">
                <span className="text-base-content/60">Refundable</span>
                <span className="font-semibold text-primary">{Number(formatEther(refundableAmount)).toFixed(4)} MON</span>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">Aksiyonlar</h2>
            <div className="space-y-3">
              {isActive && isStudent && (
                <button className="btn btn-error btn-block" disabled={isStopping} onClick={handleStop}>
                  {isStopping ? <span className="loading loading-spinner" /> : "Seansi Durdur"}
                </button>
              )}

              {!isActive && isTutor && (
                <button className="btn btn-primary btn-block" disabled={claimable <= 0n || isClaiming} onClick={handleClaim}>
                  {isClaiming ? <span className="loading loading-spinner" /> : "Tutor Claim"}
                </button>
              )}

              {!isActive && isStudent && (
                <button className="btn btn-outline btn-block" disabled={refundable <= 0n || isRefunding} onClick={handleRefund}>
                  {isRefunding ? <span className="loading loading-spinner" /> : "Kalan Escrow Iadesi"}
                </button>
              )}

              {!connectedAddress && (
                <div className="text-sm text-warning">Aksiyon almak icin once cuzdan baglantisi gerekiyor.</div>
              )}

              {connectedAddress && !isStudent && !isTutor && (
                <div className="text-sm text-base-content/60">Bu session icin aksiyon yetkisi sadece ogrenci ve tutorda.</div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
