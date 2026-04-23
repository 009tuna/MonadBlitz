# SpeakStream — Setup & Deployment Guide
# SpeakStream — Setup & Deployment Guide

## Overview

SpeakStream is a decentralized language learning platform on Monad where students pay teachers **per second they actually speak**, verified by AI. Built with Scaffold-ETH 2 + Foundry + Next.js.

### Round 2 Additions
- **Gemini Live API** — Real-time bidirectional audio with AI tutors
- **3 AI Tutor Personas** — Ayse (English), Mehmet (Business English), Elena (Spanish)
- **Premium UI** — framer-motion animations, glass morphism, gradient text, recharts
- **Dual Session Mode** — AI tutor sessions + human teacher sessions

---

## Prerequisites

- Node.js >= 20.18.3
- Yarn 4 (corepack)
- Foundry (forge, cast, anvil)
- A wallet with Monad Testnet MON (faucet: https://faucet.monad.xyz)

---

## Quick Start

```bash
# 1. Clone & install
git clone <your-repo-url>
cd MonadBlitz
corepack enable
yarn install

# 2. Set environment variables
# packages/foundry/.env
DEPLOYER_PRIVATE_KEY=0xYOUR_PRIVATE_KEY

# packages/nextjs/.env.local
GEMINI_API_KEY=your_gemini_api_key_here

# 3. Run tests
yarn test
# Expected: 12 tests passing (11 SpeakStream + 1 YourContract)

# 4. Generate deployer account (alternative to .env)
yarn generate

# 5. Deploy to Monad Testnet
yarn deploy --network monadTestnet

# 6. Start frontend
yarn start
# Open http://localhost:3000
```

---

## Architecture

```
Frontend (Next.js)
├── Teachers Page ──── AI Tutors (Gemini Live) + Human Teachers (on-chain)
├── Session Page ───── Dual Mode:
│   ├── AI Mode: Gemini Live bidirectional audio + chat bubbles
│   └── Human Mode: Web Speech API + LiveTranscript
├── /api/live ──────── Ephemeral token for Gemini Live API
├── /api/verify ────── Gemini 2.5 Flash transcript verification
└── Payment Flow ───── Real-time escrow visualization

Smart Contract (SpeakStream.sol on Monad Testnet)
├── registerTeacher()
├── startSession() ──── Lock MON in escrow
├── releaseElapsed() ── Release verified seconds
├── endSession() ────── Refund remainder
└── withdraw() ──────── Teacher withdraws earnings
```

---

## File Structure (SpeakStream-specific files)

```
packages/
├── foundry/
│   ├── contracts/
│   │   └── SpeakStream.sol              # Main smart contract
│   ├── test/
│   │   └── SpeakStream.t.sol            # 11 Foundry tests
│   └── script/
│       ├── Deploy.s.sol                 # Entry point
│       └── DeploySpeakStream.s.sol      # Deploy + seed data
│
└── nextjs/
    ├── app/
    │   ├── page.tsx                      # Homepage (hero + how it works + AI demo)
    │   ├── teachers/
    │   │   ├── page.tsx                  # Teacher listing (AI + Human sections)
    │   │   └── [address]/page.tsx        # Teacher detail + session start
    │   ├── session/
    │   │   └── [id]/page.tsx             # Live session (AI or Human mode)
    │   ├── become-teacher/page.tsx       # Teacher registration form
    │   ├── leaderboard/page.tsx          # Stats + recharts + rankings
    │   └── api/
    │       ├── verify/route.ts           # Gemini AI transcript verification
    │       └── live/route.ts             # Gemini Live ephemeral token
    │
    ├── components/speakstream/
    │   ├── AITutorSession.tsx            # AI tutor chat with Gemini Live
    │   ├── LiveTranscript.tsx            # Human session transcript display
    │   ├── PaymentFlow.tsx               # Real-time payment visualization
    │   ├── MicRecorder.tsx               # Microphone control
    │   └── TeacherCard.tsx               # Teacher card (AI/Human variants)
    │
    ├── hooks/speakstream/
    │   ├── useGeminiLive.ts              # Gemini Live API bidirectional audio
    │   ├── useGeminiVerify.ts            # AI transcript verification
    │   └── useSpeechRecognition.ts       # Web Speech API wrapper
    │
    ├── lib/
    │   ├── aiTeachers.ts                 # AI teacher definitions (3 personas)
    │   └── teacherUtils.ts               # Teacher helper functions
    │
    ├── styles/globals.css                # Premium CSS (animations, glass, orbs)
    └── scaffold.config.ts                # Monad Testnet chain config
```

---

## Smart Contract: SpeakStream.sol

### Key Functions

| Function | Description |
|----------|-------------|
| `registerTeacher(name, bio, languages, ratePerSecond)` | Register as teacher |
| `startSession(teacher, maxDuration)` | Start session, lock MON in escrow |
| `releaseElapsed(sessionId, elapsed, verifiedSeconds)` | Release payment for verified speech |
| `endSession(sessionId)` | End session, refund remainder |
| `withdraw()` | Teacher withdraws earned MON |

### Events

| Event | Description |
|-------|-------------|
| `TeacherRegistered(wallet, name)` | New teacher registered |
| `SessionStarted(sessionId, student, teacher, deposit)` | Session started |
| `PaymentReleased(sessionId, amount)` | Payment released to teacher |
| `RefundIssued(sessionId, amount)` | Refund issued to student |
| `SessionEnded(sessionId)` | Session ended |

---

## AI Tutor System

### How It Works

1. Student selects an AI tutor from the Teachers page
2. Session is started on-chain (payment goes to AI_TUTOR_POOL_ADDRESS)
3. Frontend connects to Gemini Live API via ephemeral token
4. Bidirectional audio: student speaks, AI responds in real-time
5. Every 30 seconds, transcript is verified by Gemini 2.5 Flash
6. Verified seconds are released on-chain

### AI Teachers

| Name | Specialty | Languages | Persona |
|------|-----------|-----------|---------|
| Ayse — AI English Tutor | Daily conversation | EN, TR | Warm, patient |
| Mehmet — AI Business English | Business meetings, emails | EN, TR | Professional, direct |
| Elena — AI Travel Spanish | Travel situations | ES, TR, EN | Friendly, casual |

### Configuration

After deployment, update `AI_TUTOR_POOL_ADDRESS` in `packages/nextjs/lib/aiTeachers.ts` with your deployer address.

---

## Pages

| Page | URL | Description |
|------|-----|-------------|
| Homepage | `/` | Hero with gradient text, how it works, AI demo mockup, why Monad stats |
| Teachers | `/teachers` | AI tutors section + human teachers, search + language filter |
| Teacher Detail | `/teachers/[address]` | 2-column layout, session planner with cost preview |
| Become Teacher | `/become-teacher` | Registration form with language selector |
| Session | `/session/[id]` | **MAIN DEMO** — 3-column: teacher + conversation + payment |
| Leaderboard | `/leaderboard` | Stats cards, recharts (bar + area), teacher rankings |
| Debug | `/debug` | Scaffold-ETH contract debug interface |

---

## Environment Variables

### packages/foundry/.env
```
DEPLOYER_PRIVATE_KEY=0x...
MONAD_RPC_URL=https://testnet-rpc.monad.xyz
```

### packages/nextjs/.env.local
```
GEMINI_API_KEY=your_gemini_api_key
NEXT_PUBLIC_CHAIN_ID=10143
```

---

## Deployment

```bash
# Local (anvil)
yarn chain          # Terminal 1
yarn deploy         # Terminal 2
yarn start          # Terminal 3

# Monad Testnet
yarn deploy --network monadTestnet
yarn start
```

After deployment:
1. Note the deployed contract address from console output
2. Note the deployer address (= AI_TUTOR_POOL_ADDRESS)
3. Update `AI_TUTOR_POOL_ADDRESS` in `lib/aiTeachers.ts`
4. The ABI is auto-exported to `packages/nextjs/contracts/deployedContracts.ts`

---

## Demo Scenario (3 Minutes)

### AI Tutor Demo (recommended)
1. Show homepage — gradient text, "Konus. Ogren. Kazan."
2. `/teachers` — Show AI tutors section with Gemini Live badge
3. Click "Ayse — AI English Tutor"
4. Start 5 min session (lock ~0.003 MON)
5. Click "AI Ogretmenle Konusmaya Basla"
6. Have a short conversation — show chat bubbles appearing
7. Wait 30s — AI verification runs, payment released
8. End session — show refund of unused time
9. Show leaderboard with charts

### Human Teacher Demo
1. `/become-teacher` — Register as teacher
2. From another wallet, start session with that teacher
3. Speak into microphone — show live transcript
4. AI verifies every 30s — green/red badges
5. End session, teacher withdraws

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Smart Contract | Solidity 0.8.19 + OpenZeppelin |
| Testing | Foundry (forge test) — 12 tests |
| Frontend | Next.js 15 + React 19 + TypeScript |
| Styling | TailwindCSS + DaisyUI + framer-motion |
| Icons | lucide-react |
| Charts | recharts |
| Wallet | RainbowKit + wagmi + viem |
| AI Voice | Gemini Live API (native audio) |
| AI Verify | Gemini 2.5 Flash |
| Speech | Web Speech API (human sessions) |
| Chain | Monad Testnet (Chain ID: 10143) |

---

## Important Notes

- **Chrome/Chromium required** — Web Speech API only works in Chrome
- **Microphone permission** — Browser will ask for mic access, accept it
- **Gemini API Key** — Without it, fallback scoring system activates (demo still works)
- **Monad Testnet** — Gas is nearly zero, blocks every 400ms
- **ReentrancyGuard** — Security on withdraw and endSession functions
- **AI Tutor Pool** — All AI sessions route payments to a single pool address

---

## Checklist

- [ ] Contract deployed on Monad Testnet
- [ ] `yarn start` runs without errors
- [ ] MetaMask connected to Monad Testnet
- [ ] AI tutors visible on `/teachers`
- [ ] AI session works: connect → speak → AI responds → verify → payment
- [ ] Human session works: start → speak → transcript → verify → end
- [ ] Leaderboard shows charts
- [ ] Chrome microphone permission works
- [ ] Demo backup video recorded
