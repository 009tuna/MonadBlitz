"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Activity, DollarSign, Sparkles, TrendingUp, Wallet } from "lucide-react";
import { formatEther } from "viem";
import { useAccount } from "wagmi";
import { useScaffoldEventHistory, useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";

export default function TeacherDashboardPage() {
  const { address: connectedAddress, isConnecting } = useAccount();
  const [claimingSessionId, setClaimingSessionId] = useState<bigint | null>(null);

  const {
    data: teacherData,
    isLoading: isTeacherLoading,
    refetch,
  } = useScaffoldReadContract({
    contractName: "StreamingTutorEscrow",
    functionName: "getTutor",
    args: [connectedAddress],
  });

  const { data: claimableValue, refetch: refetchClaimable } = useScaffoldReadContract({
    contractName: "StreamingTutorEscrow",
    functionName: "getTutorClaimable",
    args: [connectedAddress],
  });

  const { data: stoppedSessions } = useScaffoldEventHistory({
    contractName: "StreamingTutorEscrow",
    eventName: "SessionStopped",
    filters: connectedAddress ? { tutor: connectedAddress } : undefined,
    watch: true,
    enabled: Boolean(connectedAddress),
    blockData: true,
  });

  const { writeContractAsync: claim } = useScaffoldWriteContract("StreamingTutorEscrow");

  const handleClaim = async (sessionId: bigint) => {
    setClaimingSessionId(sessionId);
    try {
      await claim({
        functionName: "claim",
        args: [sessionId],
      });
      await refetch();
      await refetchClaimable();
    } catch (error) {
      console.error("Claim hatasi:", error);
    }
    setClaimingSessionId(null);
  };

  if (isConnecting || isTeacherLoading) {
    return (
      <div className="flex justify-center py-20">
        <span className="loading loading-spinner loading-lg text-primary" />
      </div>
    );
  }

  if (!connectedAddress) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <Wallet className="h-16 w-16 mx-auto text-base-content/20 mb-4" />
        <h1 className="text-3xl font-bold mb-2">Cuzdan Baglantisi Bekleniyor</h1>
        <p className="text-base-content/60">Ogretmen panelini goruntulemek icin lutfen once cuzdanini bagla.</p>
      </div>
    );
  }

  if (!teacherData || teacherData.wallet === "0x0000000000000000000000000000000000000000") {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <div className="bg-base-200 rounded-3xl p-10 shadow-xl border border-base-300">
          <Sparkles className="h-16 w-16 mx-auto text-indigo-500 mb-4" />
          <h1 className="text-3xl font-bold mb-4">Henuz Ogretmen Degilsiniz</h1>
          <p className="text-base-content/60 mb-8 max-w-md mx-auto">
            Saniye bazli escrow seanslarindan pay alabilmek icin once ogretmen olarak kaydol.
          </p>
          <Link href="/become-teacher" className="btn btn-primary btn-lg shadow-lg hover:shadow-indigo-500/25">
            Ogretmen Ol
          </Link>
        </div>
      </div>
    );
  }

  const totalEarned = formatEther(teacherData.totalEarned);
  const totalClaimed = formatEther(teacherData.totalClaimed);
  const claimable = formatEther(claimableValue || 0n);
  const ratePerHour = teacherData.ratePerSecond * BigInt(3600);
  const stoppedSessionRows = ((stoppedSessions || []) as { args?: Record<string, unknown> }[])
    .map(item => {
      const sessionId = item.args?.sessionId;
      return typeof sessionId === "bigint" ? sessionId : null;
    })
    .filter((sessionId): sessionId is bigint => sessionId !== null);

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3 mb-8"
      >
        <div className="avatar placeholder">
          <div className="bg-gradient-to-br from-indigo-500 to-purple-500 text-white rounded-full w-16 h-16">
            <span className="text-2xl font-bold">{teacherData.name.charAt(0).toUpperCase()}</span>
          </div>
        </div>
        <div>
          <h1 className="text-3xl font-bold">Hos Geldin, {teacherData.name}</h1>
          <div className="flex items-center gap-2 mt-1">
            <div
              className={`w-2 h-2 rounded-full ${teacherData.active ? "bg-green-500 animate-pulse" : "bg-red-500"}`}
            />
            <span className="text-sm text-base-content/60">
              {teacherData.active ? "Profilin Aktif" : "Profilin Pasif"}
            </span>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="card bg-base-100 shadow-xl border border-base-200"
        >
          <div className="card-body">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-base-content/60">Toplam Kazanc</h3>
              <TrendingUp className="h-5 w-5 text-green-500" />
            </div>
            <div className="text-3xl font-bold font-mono text-base-content">
              {Number(totalEarned).toFixed(4)} <span className="text-lg text-base-content/50">MON</span>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="card bg-base-100 shadow-xl border border-base-200"
        >
          <div className="card-body">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-base-content/60">Saatlik Ucretin</h3>
              <Activity className="h-5 w-5 text-indigo-500" />
            </div>
            <div className="text-3xl font-bold font-mono text-base-content">
              {Number(formatEther(ratePerHour)).toFixed(4)}{" "}
              <span className="text-lg text-base-content/50">MON/saat</span>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="card bg-gradient-to-br from-indigo-500/10 to-purple-500/10 shadow-xl border border-indigo-500/20"
        >
          <div className="card-body">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-indigo-400">Bekleyen Claim</h3>
              <DollarSign className="h-5 w-5 text-indigo-400" />
            </div>
            <div className="text-3xl font-bold font-mono text-indigo-300 mb-4">
              {Number(claimable).toFixed(4)} <span className="text-lg text-indigo-400/50">MON</span>
            </div>
            <div className="text-xs text-indigo-400/70">Toplam cekilen: {Number(totalClaimed).toFixed(4)} MON</div>
          </div>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="card bg-base-100 shadow-xl mb-8"
      >
        <div className="card-body">
          <h3 className="card-title">Bekleyen Seanslar</h3>
          <p className="text-sm text-base-content/60">
            Ogrenci seansi durdurduktan sonra kendi payin icin `claim(sessionId)` cagirirsin. Kalan escrow ogrenciye
            `refundUnused` ile doner.
          </p>

          {stoppedSessionRows.length === 0 ? (
            <div className="text-sm text-base-content/50">Henuz claim bekleyen seans yok.</div>
          ) : (
            <div className="space-y-3">
              {stoppedSessionRows.map(sessionId => (
                <ClaimableSessionCard
                  key={sessionId.toString()}
                  sessionId={sessionId}
                  isClaiming={claimingSessionId === sessionId}
                  onClaim={handleClaim}
                />
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

function ClaimableSessionCard({
  sessionId,
  onClaim,
  isClaiming,
}: {
  sessionId: bigint;
  onClaim: (sessionId: bigint) => Promise<void>;
  isClaiming: boolean;
}) {
  const { data: session } = useScaffoldReadContract({
    contractName: "StreamingTutorEscrow",
    functionName: "getSession",
    args: [sessionId],
  });

  if (!session) {
    return null;
  }

  const claimable = session.earnedAmount - session.claimedAmount;
  const refundPending = session.depositAmount - session.earnedAmount - session.refundedAmount;
  const claimableAmount = BigInt(claimable);
  const refundPendingAmount = BigInt(refundPending);

  return (
    <div className="rounded-2xl border border-base-300 p-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <div className="font-semibold">Seans #{sessionId.toString()}</div>
          <div className="text-sm text-base-content/60 font-mono">
            Ogrenci {session.student.slice(0, 6)}...{session.student.slice(-4)}
          </div>
          <div className="text-xs text-base-content/50">
            Claimable {Number(formatEther(claimableAmount)).toFixed(4)} MON | Ogrenci iadesi{" "}
            {Number(formatEther(refundPendingAmount)).toFixed(4)} MON
          </div>
        </div>
        <button
          className="btn btn-primary"
          disabled={claimable <= 0n || isClaiming}
          onClick={() => void onClaim(sessionId)}
        >
          {isClaiming ? <span className="loading loading-spinner" /> : "Claim Et"}
        </button>
      </div>
    </div>
  );
}
