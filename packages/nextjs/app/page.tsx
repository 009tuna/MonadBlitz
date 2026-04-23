"use client";

import Link from "next/link";
import type { NextPage } from "next";
import { useEffect, useState } from "react";
import { formatEther, parseEther } from "viem";
import { useAccount } from "wagmi";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Bot,
  Clock3,
  DollarSign,
  GraduationCap,
  Radio,
  Shield,
  Wallet,
} from "lucide-react";
import {
  useScaffoldReadContract,
  useScaffoldWatchContractEvent,
  useScaffoldWriteContract,
} from "~~/hooks/scaffold-eth";
import { AI_TEACHERS } from "~~/lib/aiTeachers";
import { AI_TUTOR_POOL_ADDRESS, getAITeacher, getContractAddressForTeacher, isAITeacher } from "~~/lib/teacherUtils";

const durationOptions = [
  { label: "5 dk", seconds: 300 },
  { label: "10 dk", seconds: 600 },
  { label: "15 dk", seconds: 900 },
  { label: "30 dk", seconds: 1800 },
];

const LOCAL_STORAGE_SESSION_KEY = "streaming-tutor-demo-session";
const LOCAL_STORAGE_TEACHER_KEY = "streaming-tutor-demo-teacher";

const Home: NextPage = () => {
  const { address: connectedAddress } = useAccount();
  const [depositAmount, setDepositAmount] = useState("0.2");
  const [selectedDuration, setSelectedDuration] = useState(600);
  const [selectedTeacherAddress, setSelectedTeacherAddress] = useState<string>(AI_TEACHERS[0].address);
  const [currentSessionId, setCurrentSessionId] = useState<bigint | undefined>(undefined);
  const [currentSessionTeacherAddress, setCurrentSessionTeacherAddress] = useState<string | undefined>(undefined);
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  const [isDepositing, setIsDepositing] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [isRefunding, setIsRefunding] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);

  const contractTeacherAddress = getContractAddressForTeacher(selectedTeacherAddress);
  const selectedAiTeacher = isAITeacher(selectedTeacherAddress) ? getAITeacher(selectedTeacherAddress) : null;

  const { data: studentBalance, refetch: refetchStudentBalance } = useScaffoldReadContract({
    contractName: "StreamingTutorEscrow",
    functionName: "studentBalances",
    args: [connectedAddress],
  });

  const { data: activeSessionId } = useScaffoldReadContract({
    contractName: "StreamingTutorEscrow",
    functionName: "activeSessionIds",
    args: [connectedAddress],
  });

  const { data: humanTutorAddresses } = useScaffoldReadContract({
    contractName: "StreamingTutorEscrow",
    functionName: "getAllTutors",
  });

  const { data: selectedTeacherOnchain } = useScaffoldReadContract({
    contractName: "StreamingTutorEscrow",
    functionName: "getTutor",
    args: [contractTeacherAddress],
  });

  const { data: currentSession, refetch: refetchCurrentSession } = useScaffoldReadContract({
    contractName: "StreamingTutorEscrow",
    functionName: "getSession",
    args: [currentSessionId],
  });

  const { data: currentSessionTutor } = useScaffoldReadContract({
    contractName: "StreamingTutorEscrow",
    functionName: "getTutor",
    args: [currentSession?.tutor],
  });

  const { writeContractAsync: deposit } = useScaffoldWriteContract("StreamingTutorEscrow");
  const { writeContractAsync: startSession } = useScaffoldWriteContract("StreamingTutorEscrow");
  const { writeContractAsync: writeSessionAction } = useScaffoldWriteContract("StreamingTutorEscrow");

  useScaffoldWatchContractEvent({
    contractName: "StreamingTutorEscrow",
    eventName: "SessionStarted",
    onLogs: logs => {
      for (const log of logs) {
        const student = (log.args as Record<string, unknown>).student as string | undefined;
        const sessionId = (log.args as Record<string, unknown>).sessionId as bigint | undefined;

        if (student?.toLowerCase() === connectedAddress?.toLowerCase() && sessionId !== undefined) {
          setCurrentSessionId(sessionId);
          setCurrentSessionTeacherAddress(selectedTeacherAddress);
          window.localStorage.setItem(LOCAL_STORAGE_SESSION_KEY, sessionId.toString());
          window.localStorage.setItem(LOCAL_STORAGE_TEACHER_KEY, selectedTeacherAddress);
        }
      }
    },
  });

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (activeSessionId && activeSessionId > 0n) {
      setCurrentSessionId(activeSessionId);
      window.localStorage.setItem(LOCAL_STORAGE_SESSION_KEY, activeSessionId.toString());
    } else {
      setCurrentSessionId(undefined);
    }

    const savedSessionId = window.localStorage.getItem(LOCAL_STORAGE_SESSION_KEY);
    const savedTeacherAddress = window.localStorage.getItem(LOCAL_STORAGE_TEACHER_KEY);
    if (savedSessionId) {
      setCurrentSessionId(BigInt(savedSessionId));
    }
    if (savedTeacherAddress) {
      setCurrentSessionTeacherAddress(savedTeacherAddress);
    } else if (!activeSessionId || activeSessionId === 0n) {
      setCurrentSessionTeacherAddress(undefined);
    }
  }, [activeSessionId]);

  useEffect(() => {
    if (!currentSession) {
      return;
    }

    const fullySettled =
      currentSession.status === 2 &&
      currentSession.claimedAmount >= currentSession.earnedAmount &&
      currentSession.refundedAmount >= currentSession.depositAmount - currentSession.earnedAmount;

    if (fullySettled) {
      window.localStorage.removeItem(LOCAL_STORAGE_SESSION_KEY);
      window.localStorage.removeItem(LOCAL_STORAGE_TEACHER_KEY);
      setCurrentSessionId(undefined);
      setCurrentSessionTeacherAddress(undefined);
    }
  }, [currentSession]);

  const selectedTeacher = selectedTeacherOnchain
    ? {
        name: selectedAiTeacher?.name || selectedTeacherOnchain.name,
        bio: selectedAiTeacher?.bio || selectedTeacherOnchain.bio,
        languages: selectedAiTeacher?.languages || selectedTeacherOnchain.languages,
        ratePerSecond: selectedTeacherOnchain.ratePerSecond,
        active: selectedTeacherOnchain.active,
      }
    : null;

  const requiredDeposit = selectedTeacher ? selectedTeacher.ratePerSecond * BigInt(selectedDuration) : 0n;
  const availableBalance = studentBalance || 0n;
  const hasEnoughBalance = availableBalance >= requiredDeposit;
  const humanTutorAddressList =
    (humanTutorAddresses as string[] | undefined)?.filter(address => address.toLowerCase() !== AI_TUTOR_POOL_ADDRESS.toLowerCase()) || [];

  const isActiveSession = currentSession?.status === 1;
  const elapsedSeconds = currentSession
    ? isActiveSession
      ? Math.min(now - Number(currentSession.startTime), Number(currentSession.maxDuration))
      : Number(currentSession.stopTime > 0n ? currentSession.stopTime - currentSession.startTime : 0n)
    : 0;
  const liveSpent = currentSession
    ? isActiveSession
      ? currentSession.ratePerSecond * BigInt(Math.max(0, elapsedSeconds))
      : currentSession.earnedAmount
    : 0n;
  const spent = currentSession && liveSpent > currentSession.depositAmount ? currentSession.depositAmount : liveSpent;
  const remaining = currentSession ? currentSession.depositAmount - spent : 0n;
  const refundable = currentSession ? currentSession.depositAmount - currentSession.earnedAmount - currentSession.refundedAmount : 0n;
  const claimable = currentSession ? currentSession.earnedAmount - currentSession.claimedAmount : 0n;
  const remainingAmount = BigInt(remaining);
  const refundableAmount = BigInt(refundable);
  const claimableAmount = BigInt(claimable);
  const isSessionStudent = Boolean(currentSession && connectedAddress?.toLowerCase() === currentSession.student.toLowerCase());
  const isSessionTutor = Boolean(currentSession && connectedAddress?.toLowerCase() === currentSession.tutor.toLowerCase());
  const resolvedSessionTeacherAddress = currentSessionTeacherAddress || selectedTeacherAddress;
  const sessionTeacherIsAI = isAITeacher(resolvedSessionTeacherAddress);
  const sessionTeacherName = sessionTeacherIsAI
    ? getAITeacher(resolvedSessionTeacherAddress)?.name || "AI Tutor"
    : currentSessionTutor?.name || "Tutor";

  const handleDeposit = async () => {
    if (!depositAmount || !connectedAddress) return;
    setIsDepositing(true);
    try {
      await deposit({
        functionName: "deposit",
        value: parseEther(depositAmount),
      });
      await refetchStudentBalance();
    } catch (error) {
      console.error("Deposit hatasi:", error);
    } finally {
      setIsDepositing(false);
    }
  };

  const handleStartSession = async () => {
    if (!selectedTeacher || !connectedAddress || !hasEnoughBalance || isActiveSession) return;
    setIsStarting(true);
    try {
      await startSession({
        functionName: "startSession",
        args: [contractTeacherAddress, BigInt(selectedDuration)],
      });
      setCurrentSessionTeacherAddress(selectedTeacherAddress);
      window.localStorage.setItem(LOCAL_STORAGE_TEACHER_KEY, selectedTeacherAddress);
      await refetchStudentBalance();
    } catch (error) {
      console.error("Session start hatasi:", error);
    } finally {
      setIsStarting(false);
    }
  };

  const handleStopSession = async () => {
    if (!currentSessionId) return;
    setIsStopping(true);
    try {
      await writeSessionAction({
        functionName: "stopSession",
        args: [currentSessionId],
      });
      await refetchCurrentSession();
    } catch (error) {
      console.error("Stop hatasi:", error);
    } finally {
      setIsStopping(false);
    }
  };

  const handleRefund = async () => {
    if (!currentSessionId) return;
    setIsRefunding(true);
    try {
      await writeSessionAction({
        functionName: "refundUnused",
        args: [currentSessionId],
      });
      await refetchCurrentSession();
      await refetchStudentBalance();
    } catch (error) {
      console.error("Refund hatasi:", error);
    } finally {
      setIsRefunding(false);
    }
  };

  const handleClaim = async () => {
    if (!currentSessionId) return;
    setIsClaiming(true);
    try {
      await writeSessionAction({
        functionName: "claim",
        args: [currentSessionId],
      });
      await refetchCurrentSession();
    } catch (error) {
      console.error("Claim hatasi:", error);
    } finally {
      setIsClaiming(false);
    }
  };

  return (
    <div className="relative overflow-hidden px-4 py-10">
      <div className="fixed inset-0 pointer-events-none -z-10">
        <div className="orb orb-indigo absolute top-20 left-1/4 h-96 w-96 opacity-20" />
        <div className="orb orb-purple absolute right-1/4 top-60 h-80 w-80 opacity-15" style={{ animationDelay: "2s" }} />
        <div className="orb orb-blue absolute bottom-20 left-1/3 h-72 w-72 opacity-10" style={{ animationDelay: "4s" }} />
      </div>

      <section className="mx-auto max-w-6xl">
        <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-4 py-2">
            <Radio className="h-4 w-4 animate-pulse text-indigo-400" />
            <span className="text-sm font-medium text-indigo-300">Monad Testnet Escrow Demo</span>
          </div>
          <h1 className="mt-6 text-5xl font-black leading-tight md:text-7xl">
            <span className="text-gradient">Streaming</span> Tutor Escrow
          </h1>
          <p className="mx-auto mt-6 max-w-3xl text-lg text-base-content/60 md:text-xl">
            Ogrenci once MON yatirir, session baslar, gecen sure kadar earned hesaplanir. Session durunca tutor payini
            claim eder, kalan escrow ogrenciye iade edilir.
          </p>
        </motion.div>

        <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-[1.2fr,0.8fr]">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="card bg-base-100 shadow-2xl">
            <div className="card-body gap-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="rounded-2xl border border-base-300 p-4">
                  <div className="flex items-center gap-2 text-sm text-base-content/60">
                    <Wallet className="h-4 w-4" />
                    Escrow bakiyesi
                  </div>
                  <div className="mt-2 text-3xl font-bold">{Number(formatEther(availableBalance)).toFixed(4)} MON</div>
                </div>
                <div className="rounded-2xl border border-base-300 p-4">
                  <div className="flex items-center gap-2 text-sm text-base-content/60">
                    <DollarSign className="h-4 w-4" />
                    Gerekli deposit
                  </div>
                  <div className="mt-2 text-3xl font-bold text-primary">{Number(formatEther(requiredDeposit)).toFixed(4)} MON</div>
                </div>
                <div className="rounded-2xl border border-base-300 p-4">
                  <div className="flex items-center gap-2 text-sm text-base-content/60">
                    <Clock3 className="h-4 w-4" />
                    Seans suresi
                  </div>
                  <div className="mt-2 text-3xl font-bold">{selectedDuration / 60} dk</div>
                </div>
              </div>

              <div>
                <div className="mb-3 flex items-center gap-2">
                  <Bot className="h-4 w-4 text-indigo-400" />
                  <span className="font-semibold">Tutor sec</span>
                </div>
                <div className="flex flex-wrap gap-3">
                  {AI_TEACHERS.map(teacher => (
                    <button
                      key={teacher.address}
                      className={`btn rounded-full ${
                        selectedTeacherAddress === teacher.address
                          ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white border-none"
                          : "btn-outline"
                      }`}
                      onClick={() => setSelectedTeacherAddress(teacher.address)}
                    >
                      {teacher.name}
                    </button>
                  ))}
                  {humanTutorAddressList.map(address => (
                    <HumanTutorOption
                      key={address}
                      address={address}
                      isSelected={selectedTeacherAddress === address}
                      onSelect={setSelectedTeacherAddress}
                    />
                  ))}
                </div>
              </div>

              <div>
                <div className="mb-3 flex items-center gap-2">
                  <Clock3 className="h-4 w-4 text-indigo-400" />
                  <span className="font-semibold">Sure sec</span>
                </div>
                <div className="flex flex-wrap gap-3">
                  {durationOptions.map(option => (
                    <button
                      key={option.seconds}
                      className={`btn rounded-full ${
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

              <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-indigo-400" />
                  <span className="font-semibold">Bakiye yukle</span>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    className="input input-bordered flex-1"
                    value={depositAmount}
                    onChange={event => setDepositAmount(event.target.value)}
                  />
                  <button className="btn btn-primary" disabled={!connectedAddress || isDepositing} onClick={handleDeposit}>
                    {isDepositing ? <span className="loading loading-spinner" /> : "Deposit"}
                  </button>
                </div>
              </div>

              {selectedTeacher && (
                <div className="rounded-2xl border border-base-300 p-4 text-sm text-base-content/70">
                  <div className="font-semibold">{selectedTeacher.name}</div>
                  <div className="mt-1">{selectedTeacher.bio}</div>
                  <div className="mt-2 text-base-content/50">
                    Saatlik {Number(formatEther(selectedTeacher.ratePerSecond * 3600n)).toFixed(4)} MON
                  </div>
                </div>
              )}

              <button
                className="btn btn-lg bg-gradient-to-r from-indigo-500 to-purple-500 text-white border-none shadow-lg shadow-indigo-500/25"
                disabled={!connectedAddress || !selectedTeacher || !hasEnoughBalance || Boolean(activeSessionId && activeSessionId > 0n) || isStarting}
                onClick={handleStartSession}
              >
                {isStarting ? (
                  <span className="loading loading-spinner" />
                ) : (
                  <>
                    Seansi Baslat
                    <ArrowRight className="h-5 w-5" />
                  </>
                )}
              </button>

              {!connectedAddress && <div className="text-sm text-warning">Demo paneli kullanmak icin once cuzdanini bagla.</div>}
              {connectedAddress && !hasEnoughBalance && (
                <div className="text-sm text-warning">Secilen session icin yeterli escrow bakiyesi yok.</div>
              )}
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="card bg-base-100 shadow-2xl">
            <div className="card-body">
              <h2 className="card-title">Canli session durumu</h2>

              {!currentSession ? (
                <div className="space-y-4 text-sm text-base-content/60">
                  <p>Henuz takip edilen bir session yok. Deposit yapip bir tutor secerek demo akisini baslat.</p>
                  <Link href="/teachers" className="btn btn-outline">
                    Tutor listesini ac
                  </Link>
                </div>
              ) : (
                <>
                  <div className="rounded-2xl border border-base-300 p-4">
                    <div className="text-sm text-base-content/50">Session #{currentSessionId?.toString()}</div>
                    <div className="mt-2 flex items-center gap-2">
                      {sessionTeacherIsAI ? <Bot className="h-4 w-4 text-indigo-400" /> : <GraduationCap className="h-4 w-4" />}
                      <span className="font-semibold">{sessionTeacherName}</span>
                    </div>
                    <div className={`badge mt-3 ${isActiveSession ? "badge-success" : "badge-neutral"}`}>
                      {isActiveSession ? "ACTIVE" : "STOPPED"}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    <MetricCard label="Gecen sure" value={`${Math.floor(elapsedSeconds / 60)
                      .toString()
                      .padStart(2, "0")}:${(elapsedSeconds % 60).toString().padStart(2, "0")}`} />
                    <MetricCard label="Harcanan MON" value={`${Number(formatEther(spent)).toFixed(4)} MON`} />
                    <MetricCard label="Kalan escrow" value={`${Number(formatEther(remainingAmount)).toFixed(4)} MON`} />
                  </div>

                  <div className="rounded-2xl border border-base-300 p-4 text-sm text-base-content/60">
                    <div className="flex justify-between">
                      <span>Tutor claimable</span>
                      <span className="font-semibold text-primary">{Number(formatEther(claimableAmount)).toFixed(4)} MON</span>
                    </div>
                    <div className="mt-2 flex justify-between">
                      <span>Student refundable</span>
                      <span className="font-semibold text-primary">{Number(formatEther(refundableAmount)).toFixed(4)} MON</span>
                    </div>
                  </div>

                  {isActiveSession && isSessionStudent && (
                    <button className="btn btn-error" disabled={isStopping} onClick={handleStopSession}>
                      {isStopping ? <span className="loading loading-spinner" /> : "Seansi Durdur"}
                    </button>
                  )}

                  {!isActiveSession && isSessionTutor && (
                    <button className="btn btn-primary" disabled={claimable <= 0n || isClaiming} onClick={handleClaim}>
                      {isClaiming ? <span className="loading loading-spinner" /> : "Tutor Claim"}
                    </button>
                  )}

                  {!isActiveSession && isSessionStudent && (
                    <button className="btn btn-outline" disabled={refundable <= 0n || isRefunding} onClick={handleRefund}>
                      {isRefunding ? <span className="loading loading-spinner" /> : "Kalan Escrow Iadesi"}
                    </button>
                  )}

                  <Link
                    href={`/session/${currentSessionId?.toString()}${sessionTeacherIsAI ? `?ai=${encodeURIComponent(resolvedSessionTeacherAddress)}` : ""}`}
                    className="btn btn-ghost"
                  >
                    Ayrintili session sayfasi
                  </Link>
                </>
              )}
            </div>
          </motion.div>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-3">
          {[
            {
              title: "Deposit once, reuse later",
              description: "Ogrenci bakiyesi kontratta tutulur. Yeni session icin tekrar para gondermek gerekmez.",
            },
            {
              title: "Pure time-based billing",
              description: "Earned = elapsedSeconds * ratePerSecond. Earned tutar escrow u gecemez.",
            },
            {
              title: "Order-independent settlement",
              description: "Tutor claim once, student refund once. Hangi taraf once settlement yaparsa yapsin toplam dagilim ayni kalir.",
            },
          ].map(item => (
            <div key={item.title} className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-green-500" />
                  <span className="font-semibold">{item.title}</span>
                </div>
                <p className="text-sm text-base-content/60">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

function HumanTutorOption({
  address,
  isSelected,
  onSelect,
}: {
  address: string;
  isSelected: boolean;
  onSelect: (address: string) => void;
}) {
  const { data: teacher } = useScaffoldReadContract({
    contractName: "StreamingTutorEscrow",
    functionName: "getTutor",
    args: [address],
  });

  if (!teacher || !teacher.wallet || teacher.wallet === "0x0000000000000000000000000000000000000000") {
    return null;
  }

  return (
    <button
      className={`btn rounded-full ${isSelected ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white border-none" : "btn-outline"}`}
      onClick={() => onSelect(address)}
    >
      {teacher.name}
    </button>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-base-300 p-4">
      <div className="text-sm text-base-content/50">{label}</div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
    </div>
  );
}

export default Home;
