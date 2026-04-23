# SpeakStream MVP — Kurulum ve Kullanim Rehberi

## Proje Ozeti

SpeakStream, dil ogrenmek isteyen kullanicilarin sectikleri bir ogretmenle canli konusma seansi yaptiklari ve **sadece gercekten konustuklari saniye kadar odeme yaptiklari** bir dApp. Monad Testnet uzerinde calisir.

---

## Dosya Yapisi (Yeni Eklenenler)

```
packages/
├── foundry/
│   ├── contracts/
│   │   └── SpeakStream.sol              ← Ana smart contract
│   ├── script/
│   │   ├── Deploy.s.sol                 ← Guncellendi (SpeakStream'i deploy eder)
│   │   └── DeploySpeakStream.s.sol      ← SpeakStream deploy + seed data
│   ├── test/
│   │   └── SpeakStream.t.sol            ← 11 test (hepsi yesil)
│   ├── foundry.toml                     ← monadTestnet RPC eklendi
│   └── .env                             ← DEPLOYER_PRIVATE_KEY buraya
└── nextjs/
    ├── app/
    │   ├── page.tsx                      ← Homepage (hero + 3 adim + neden Monad)
    │   ├── teachers/page.tsx             ← Ogretmen listesi
    │   ├── teachers/[address]/page.tsx   ← Ogretmen detay + seans baslat
    │   ├── become-teacher/page.tsx       ← Ogretmen kayit formu
    │   ├── session/[id]/page.tsx         ← ANA DEMO EKRANI (3 sutun)
    │   ├── leaderboard/page.tsx          ← Leaderboard
    │   ├── api/verify/route.ts           ← Gemini AI dogrulama endpoint
    │   └── layout.tsx                    ← Guncellendi (SpeakStream metadata)
    ├── components/
    │   ├── Header.tsx                    ← Guncellendi (SpeakStream nav)
    │   ├── Footer.tsx                    ← Guncellendi (SpeakStream branding)
    │   └── speakstream/
    │       ├── TeacherCard.tsx           ← Ogretmen kart componenti
    │       ├── LiveTranscript.tsx        ← Canli transcript gorunumu
    │       ├── PaymentFlow.tsx           ← Odeme akisi gorunumu
    │       ├── MicRecorder.tsx           ← Mikrofon butonu
    │       └── index.ts
    ├── hooks/
    │   └── speakstream/
    │       ├── useSpeechRecognition.ts   ← Web Speech API hook
    │       ├── useGeminiVerify.ts        ← AI dogrulama hook
    │       └── index.ts
    ├── scaffold.config.ts                ← Guncellendi (Monad Testnet)
    ├── styles/globals.css                ← Guncellendi (indigo/purple tema)
    └── .env.local                        ← GEMINI_API_KEY buraya
```

---

## Kurulum Adimlari

### 1. Bagimliliklari Kur

```bash
cd MonadBlitz
yarn install
```

### 2. Environment Degiskenleri

**`packages/foundry/.env`:**
```
DEPLOYER_PRIVATE_KEY=senin_testnet_private_keyin
MONAD_RPC_URL=https://testnet-rpc.monad.xyz
```

**`packages/nextjs/.env.local`:**
```
NEXT_PUBLIC_CHAIN_ID=10143
GEMINI_API_KEY=senin_gemini_api_keyin
```

### 3. Testleri Calistir

```bash
yarn test
```

Beklenen sonuc: **12 test passed** (11 SpeakStream + 1 YourContract)

### 4. Monad Testnet'e Deploy Et

Oncelikle bir Foundry keystore olustur:
```bash
yarn generate
```

Faucet'tan MON al: https://faucet.monad.xyz

Deploy et:
```bash
yarn deploy --network monadTestnet
```

Bu komut:
- SpeakStream kontratini deploy eder
- 1 test ogretmenini (Ayse Yilmaz) seed'ler
- ABI'lari frontend'e export eder

### 5. Frontend'i Baslat

```bash
yarn start
```

Tarayicida http://localhost:3000 ac.

---

## Sayfalar ve Islevleri

| Sayfa | URL | Islev |
|-------|-----|-------|
| Homepage | `/` | Hero, 3 adim aciklama, neden Monad, CTA |
| Ogretmenler | `/teachers` | Ogretmen listesi, dil filtresi |
| Ogretmen Detay | `/teachers/[address]` | Bilgiler, sure secimi, seans baslat |
| Ogretmen Ol | `/become-teacher` | Kayit formu |
| Seans | `/session/[id]` | **ANA DEMO EKRANI** — mikrofon, transcript, odeme |
| Leaderboard | `/leaderboard` | Top ogretmenler, son seanslar |
| Debug | `/debug` | Scaffold-ETH contract debug |

---

## Smart Contract Fonksiyonlari

| Fonksiyon | Aciklama |
|-----------|----------|
| `registerTeacher(name, bio, languages, ratePerSecond)` | Ogretmen kaydi |
| `updateTeacher(name, bio, languages, ratePerSecond)` | Bilgi guncelleme |
| `setTeacherActive(bool)` | Aktif/pasif durumu |
| `startSession(teacher, maxDurationSeconds)` | Seans baslat (payable) |
| `releaseElapsed(sessionId, elapsedSeconds, verifiedSeconds)` | Odeme serbest birak |
| `endSession(sessionId)` | Seans bitir, kalan iade |
| `withdraw()` | Ogretmen para cekme |
| `getTeacher(address)` | Ogretmen bilgisi (view) |
| `getSession(uint256)` | Seans bilgisi (view) |
| `getAllTeachers()` | Tum ogretmen adresleri (view) |

---

## Demo Senaryosu (2 Dakika)

1. Homepage'i goster — "Konustugu saniye kadar ode"
2. `/teachers` — Kayitli ogretmenleri goster
3. Bir ogretmen sec, 5 dk seans baslat (0.03 MON kilitle)
4. `/session/[id]` — Mikrofonu ac, konusmaya basla
5. Canli transcript akisini goster
6. 30 sn sonra AI dogrulama — yesil badge
7. 10 sn sessiz kal — AI reddeder, kirmizi badge, para iade
8. "Seansi bitir" — kalan bakiye iade
9. Ogretmen `withdraw()` ile kazancini ceker

---

## Onemli Notlar

- **Chrome/Chromium zorunlu** — Web Speech API sadece Chrome'da calisir
- **Mikrofon izni** — Tarayici mikrofon izni isteyecek, kabul edin
- **Gemini API Key** — Yoksa fallback skor sistemi devreye girer (demo icin calismaya devam eder)
- **Monad Testnet** — Gas neredeyse sifir, bloklar 400ms
- **ReentrancyGuard** — withdraw ve endSession fonksiyonlarinda guvenlik

---

## Kontrol Listesi

- [ ] Contract Monad testnet'te deployed
- [ ] `yarn start` hatasiz calisiyor
- [ ] MetaMask Monad testnet'e baglaniyor
- [ ] Test ogretmenler seed'lenmis, `/teachers`'da gorunuyor
- [ ] Bir seans tam dongusu calisiyor: baslat → konus → AI dogrula → bitir → withdraw
- [ ] Chrome'da mikrofon izni calisiyor
- [ ] Demo yedek video var
