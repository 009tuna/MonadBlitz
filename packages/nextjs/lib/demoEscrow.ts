"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AI_TEACHERS, AI_TUTOR_POOL_ADDRESS } from "~~/lib/aiTeachers";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const STORE_KEY = "speakstream-demo-escrow-v1";
const CHANGE_EVENT = "speakstream-demo-escrow-change";
const CONTRACT_EVENT = "speakstream-demo-escrow-contract-event";

type Tutor = {
  wallet: string;
  name: string;
  bio: string;
  languages: string;
  ratePerSecond: bigint;
  active: boolean;
  totalEarned: bigint;
  totalClaimed: bigint;
};

type Session = {
  student: string;
  tutor: string;
  ratePerSecond: bigint;
  startTime: bigint;
  stopTime: bigint;
  maxDuration: bigint;
  depositAmount: bigint;
  earnedAmount: bigint;
  claimedAmount: bigint;
  refundedAmount: bigint;
  status: number;
};

type DemoStore = {
  tutors: Record<string, Tutor>;
  tutorList: string[];
  studentBalances: Record<string, bigint>;
  activeSessionIds: Record<string, bigint>;
  sessions: Record<string, Session>;
  nextSessionId: bigint;
};

const emptyTutor = (wallet = ZERO_ADDRESS): Tutor => ({
  wallet,
  name: "",
  bio: "",
  languages: "",
  ratePerSecond: 0n,
  active: false,
  totalEarned: 0n,
  totalClaimed: 0n,
});

const emptySession = (): Session => ({
  student: ZERO_ADDRESS,
  tutor: ZERO_ADDRESS,
  ratePerSecond: 0n,
  startTime: 0n,
  stopTime: 0n,
  maxDuration: 0n,
  depositAmount: 0n,
  earnedAmount: 0n,
  claimedAmount: 0n,
  refundedAmount: 0n,
  status: 0,
});

const normalizeAddress = (address?: string) => (address || ZERO_ADDRESS).toLowerCase();

const makeInitialStore = (): DemoStore => {
  const firstAiTutor = AI_TEACHERS[0];

  return {
    tutors: {
      [normalizeAddress(AI_TUTOR_POOL_ADDRESS)]: {
        wallet: AI_TUTOR_POOL_ADDRESS,
        name: firstAiTutor.name,
        bio: "Shared demo pool for AI tutor sessions.",
        languages: "en,tr,es",
        ratePerSecond: firstAiTutor.ratePerSecond,
        active: true,
        totalEarned: 0n,
        totalClaimed: 0n,
      },
    },
    tutorList: [AI_TUTOR_POOL_ADDRESS],
    studentBalances: {},
    activeSessionIds: {},
    sessions: {},
    nextSessionId: 1n,
  };
};

const revive = (_key: string, value: unknown) => {
  if (typeof value === "string" && /^-?\d+n$/.test(value)) {
    return BigInt(value.slice(0, -1));
  }
  return value;
};

const replacer = (_key: string, value: unknown) => (typeof value === "bigint" ? `${value.toString()}n` : value);

const readStore = (): DemoStore => {
  if (typeof window === "undefined") {
    return makeInitialStore();
  }

  const raw = window.localStorage.getItem(STORE_KEY);
  if (!raw) {
    const initial = makeInitialStore();
    writeStore(initial);
    return initial;
  }

  try {
    const parsed = JSON.parse(raw, revive) as DemoStore;
    return {
      ...makeInitialStore(),
      ...parsed,
      tutors: { ...makeInitialStore().tutors, ...(parsed.tutors || {}) },
      tutorList: parsed.tutorList || makeInitialStore().tutorList,
      nextSessionId: BigInt(parsed.nextSessionId || 1n),
    };
  } catch {
    const initial = makeInitialStore();
    writeStore(initial);
    return initial;
  }
};

const writeStore = (store: DemoStore) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORE_KEY, JSON.stringify(store, replacer));
};

const notifyChange = () => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(CHANGE_EVENT));
};

const emitContractEvent = (eventName: string, args: Record<string, unknown>) => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(CONTRACT_EVENT, { detail: { eventName, args } }));
};

const mutateStore = (mutator: (store: DemoStore) => void) => {
  const store = readStore();
  mutator(store);
  writeStore(store);
  notifyChange();
};

const getReadValue = (functionName: string, args?: readonly unknown[]) => {
  const store = readStore();
  const [firstArg] = args || [];

  switch (functionName) {
    case "studentBalances":
      return store.studentBalances[normalizeAddress(firstArg as string)] || 0n;
    case "activeSessionIds":
      return store.activeSessionIds[normalizeAddress(firstArg as string)] || 0n;
    case "getAllTutors":
      return store.tutorList;
    case "getTutor":
      return store.tutors[normalizeAddress(firstArg as string)] || emptyTutor(firstArg as string | undefined);
    case "getTutorCount":
      return BigInt(store.tutorList.length);
    case "getTutorClaimable": {
      const tutor = store.tutors[normalizeAddress(firstArg as string)];
      return tutor ? tutor.totalEarned - tutor.totalClaimed : 0n;
    }
    case "getSession":
      return store.sessions[(firstArg as bigint | undefined)?.toString() || "0"] || emptySession();
    default:
      return undefined;
  }
};

export const useDemoEscrowReadContract = ({ functionName, args }: { functionName: string; args?: readonly unknown[] }) => {
  const [version, setVersion] = useState(0);
  const data = useMemo(() => getReadValue(functionName, args), [functionName, args, version]);

  useEffect(() => {
    const onChange = () => setVersion(current => current + 1);
    window.addEventListener(CHANGE_EVENT, onChange);
    return () => window.removeEventListener(CHANGE_EVENT, onChange);
  }, []);

  const refetch = useCallback(async () => {
    setVersion(current => current + 1);
    return { data: getReadValue(functionName, args) };
  }, [functionName, args]);

  return {
    data,
    isLoading: false,
    isError: false,
    error: null,
    status: "success",
    refetch,
    queryKey: ["demoEscrow", functionName, args],
  };
};

export const useDemoEscrowWriteContract = (connectedAddress?: string) => {
  const writeContractAsync = useCallback(
    async ({ functionName, args, value }: { functionName: string; args?: readonly unknown[]; value?: bigint }) => {
      const sender = connectedAddress || "0xdEAD000000000000000000000000000000000001";
      const senderKey = normalizeAddress(sender);

      if (functionName === "deposit") {
        const amount = value || 0n;
        mutateStore(store => {
          store.studentBalances[senderKey] = (store.studentBalances[senderKey] || 0n) + amount;
        });
        return "0xdemo-deposit";
      }

      if (functionName === "registerTutor") {
        const [name, bio, languages, ratePerSecond] = args || [];
        mutateStore(store => {
          const isNewTutor = !store.tutors[senderKey] || store.tutors[senderKey].wallet === ZERO_ADDRESS;
          store.tutors[senderKey] = {
            wallet: sender,
            name: String(name || "Demo Teacher"),
            bio: String(bio || ""),
            languages: String(languages || "en"),
            ratePerSecond: BigInt(ratePerSecond as bigint),
            active: true,
            totalEarned: store.tutors[senderKey]?.totalEarned || 0n,
            totalClaimed: store.tutors[senderKey]?.totalClaimed || 0n,
          };
          if (isNewTutor) {
            store.tutorList.push(sender);
          }
        });
        return "0xdemo-register";
      }

      if (functionName === "startSession") {
        const [tutorAddress, maxDuration] = args || [];
        let newSessionId = 0n;
        mutateStore(store => {
          const tutorKey = normalizeAddress(tutorAddress as string);
          const tutor = store.tutors[tutorKey] || store.tutors[normalizeAddress(AI_TUTOR_POOL_ADDRESS)];
          const duration = BigInt(maxDuration as bigint);
          const depositAmount = tutor.ratePerSecond * duration;

          if ((store.studentBalances[senderKey] || 0n) < depositAmount) {
            throw new Error("Insufficient demo balance");
          }

          store.studentBalances[senderKey] -= depositAmount;
          newSessionId = store.nextSessionId;
          store.nextSessionId += 1n;
          store.sessions[newSessionId.toString()] = {
            student: sender,
            tutor: tutor.wallet,
            ratePerSecond: tutor.ratePerSecond,
            startTime: BigInt(Math.floor(Date.now() / 1000)),
            stopTime: 0n,
            maxDuration: duration,
            depositAmount,
            earnedAmount: 0n,
            claimedAmount: 0n,
            refundedAmount: 0n,
            status: 1,
          };
          store.activeSessionIds[senderKey] = newSessionId;
        });
        emitContractEvent("SessionStarted", { student: sender, sessionId: newSessionId });
        return newSessionId;
      }

      if (functionName === "stopSession") {
        const [sessionId] = args || [];
        mutateStore(store => {
          const session = store.sessions[BigInt(sessionId as bigint).toString()];
          if (!session || session.status !== 1) return;

          const elapsed = BigInt(
            Math.min(
              Math.max(0, Math.floor(Date.now() / 1000) - Number(session.startTime)),
              Number(session.maxDuration),
            ),
          );
          const earnedAmount = session.ratePerSecond * elapsed > session.depositAmount
            ? session.depositAmount
            : session.ratePerSecond * elapsed;

          session.stopTime = session.startTime + elapsed;
          session.earnedAmount = earnedAmount;
          session.status = 2;
          store.activeSessionIds[normalizeAddress(session.student)] = 0n;
          const tutor = store.tutors[normalizeAddress(session.tutor)];
          if (tutor) tutor.totalEarned += earnedAmount;
        });
        return "0xdemo-stop";
      }

      if (functionName === "refundUnused") {
        const [sessionId] = args || [];
        mutateStore(store => {
          const session = store.sessions[BigInt(sessionId as bigint).toString()];
          if (!session || session.status !== 2) return;
          const refundable = session.depositAmount - session.earnedAmount - session.refundedAmount;
          session.refundedAmount += refundable;
          store.studentBalances[normalizeAddress(session.student)] =
            (store.studentBalances[normalizeAddress(session.student)] || 0n) + refundable;
        });
        return "0xdemo-refund";
      }

      if (functionName === "claim") {
        const [sessionId] = args || [];
        mutateStore(store => {
          const session = store.sessions[BigInt(sessionId as bigint).toString()];
          if (!session || session.status !== 2) return;
          const claimable = session.earnedAmount - session.claimedAmount;
          session.claimedAmount += claimable;
          const tutor = store.tutors[normalizeAddress(session.tutor)];
          if (tutor) tutor.totalClaimed += claimable;
        });
        return "0xdemo-claim";
      }

      return "0xdemo";
    },
    [connectedAddress],
  );

  return {
    writeContractAsync,
    writeContract: (variables: any) => void writeContractAsync(variables),
    isMining: false,
    isPending: false,
    isSuccess: false,
    error: null,
  };
};

export const useDemoEscrowWatchContractEvent = ({
  eventName,
  onLogs,
}: {
  eventName: string;
  onLogs: (logs: { args: Record<string, unknown>; eventName: string }[]) => void;
}) => {
  useEffect(() => {
    const onEvent = (event: Event) => {
      const detail = (event as CustomEvent<{ eventName: string; args: Record<string, unknown> }>).detail;
      if (detail?.eventName === eventName) {
        onLogs([{ eventName, args: detail.args }]);
      }
    };
    window.addEventListener(CONTRACT_EVENT, onEvent);
    return () => window.removeEventListener(CONTRACT_EVENT, onEvent);
  }, [eventName, onLogs]);
};
