"use client";

import { formatEther } from "viem";
import { ArrowDownIcon, ArrowUpIcon, CurrencyDollarIcon, LockClosedIcon } from "@heroicons/react/24/outline";

interface PaymentFlowProps {
  totalDeposited: bigint;
  releasedToTeacher: bigint;
  refundedToStudent: bigint;
  elapsedSeconds: number;
  maxDuration: number;
  isActive: boolean;
  onEndSession: () => void;
  isEnding: boolean;
  verifiedCount: number;
  totalChunks: number;
}

export const PaymentFlow = ({
  totalDeposited,
  releasedToTeacher,
  refundedToStudent,
  elapsedSeconds,
  maxDuration,
  isActive,
  onEndSession,
  isEnding,
  verifiedCount,
  totalChunks,
}: PaymentFlowProps) => {
  const remaining = totalDeposited - releasedToTeacher - refundedToStudent;
  const progressPercent = maxDuration > 0 ? Math.min((elapsedSeconds / maxDuration) * 100, 100) : 0;

  // Zaman formatlama
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex flex-col h-full">
      <h3 className="font-bold text-lg mb-4">Odeme Akisi</h3>

      {/* Timer */}
      <div className="text-center mb-4">
        <div className="text-4xl font-mono font-bold text-primary animate-counter">{formatTime(elapsedSeconds)}</div>
        <div className="text-xs text-base-content/50">/ {formatTime(maxDuration)}</div>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-base-200 rounded-full h-3 mb-6 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-1000 ease-linear"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Payment stats */}
      <div className="space-y-3 mb-6">
        {/* Kilitli toplam */}
        <div className="flex items-center justify-between p-3 bg-base-200 rounded-xl">
          <div className="flex items-center gap-2">
            <LockClosedIcon className="h-5 w-5 text-base-content/50" />
            <span className="text-sm">Kilitli Toplam</span>
          </div>
          <span className="font-mono font-semibold">{Number(formatEther(totalDeposited)).toFixed(6)} MON</span>
        </div>

        {/* Ogretmene giden */}
        <div className="flex items-center justify-between p-3 bg-green-500/10 border border-green-500/20 rounded-xl">
          <div className="flex items-center gap-2">
            <ArrowUpIcon className="h-5 w-5 text-green-500" />
            <span className="text-sm text-green-400">Ogretmene</span>
          </div>
          <span className="font-mono font-semibold text-green-400 animate-counter">
            {Number(formatEther(releasedToTeacher)).toFixed(6)} MON
          </span>
        </div>

        {/* Iade edilen */}
        <div className="flex items-center justify-between p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
          <div className="flex items-center gap-2">
            <ArrowDownIcon className="h-5 w-5 text-red-500" />
            <span className="text-sm text-red-400">Iade</span>
          </div>
          <span className="font-mono font-semibold text-red-400">
            {Number(formatEther(refundedToStudent)).toFixed(6)} MON
          </span>
        </div>

        {/* Kalan */}
        <div className="flex items-center justify-between p-3 bg-base-200 rounded-xl">
          <div className="flex items-center gap-2">
            <CurrencyDollarIcon className="h-5 w-5 text-primary" />
            <span className="text-sm font-semibold">Kalan</span>
          </div>
          <span className="font-mono font-semibold text-primary">{Number(formatEther(remaining)).toFixed(6)} MON</span>
        </div>
      </div>

      {/* Verification stats */}
      {totalChunks > 0 && (
        <div className="bg-base-200 rounded-xl p-3 mb-4">
          <div className="text-xs text-base-content/50 mb-1">Son Dogrulama</div>
          <div className="flex items-center gap-2">
            <div className="text-sm font-semibold">
              <span className="text-green-400">{verifiedCount}</span>
              <span className="text-base-content/50">/{totalChunks} chunk dogrulandi</span>
            </div>
          </div>
        </div>
      )}

      {/* Seansi bitir butonu */}
      {isActive && (
        <button className="btn btn-error btn-block mt-auto" onClick={onEndSession} disabled={isEnding}>
          {isEnding ? <span className="loading loading-spinner" /> : "Seansi Bitir"}
        </button>
      )}

      {!isActive && (
        <div className="alert alert-info mt-auto">
          <span>Seans sona erdi</span>
        </div>
      )}
    </div>
  );
};
