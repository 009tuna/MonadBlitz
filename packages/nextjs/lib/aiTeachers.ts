/**
 * AI Tutor ogretmen tanimlari (static).
 * Kontratta degisiklik gerektirmez — frontend-only kavram.
 * Tum AI seanslari AI_TUTOR_POOL_ADDRESS'e akar.
 */

export interface AITeacher {
  address: string;
  name: string;
  bio: string;
  languages: string;
  ratePerSecond: bigint;
  avatar: string;
  isAI: true;
  persona: string;
  targetLanguage: string;
  active: boolean;
}

/**
 * AI Tutor Pool adresi — deploy sirasinda kontrata register edilen adres.
 * Tum AI ogretmen seanslari bu adrese akar.
 * Monad deploy sonrasi bu adresi env ile override edin.
 */
export const AI_TUTOR_POOL_ADDRESS =
  process.env.NEXT_PUBLIC_AI_TUTOR_POOL_ADDRESS || "0x706E8a839f0708860cf47A7625580C316ee8D7F3";

export const AI_TEACHERS: AITeacher[] = [
  {
    address: "0xAI00000000000000000000000000000000000001",
    name: "Ayse — AI English Tutor",
    bio: "Patient native speaker, great for beginners. Specializes in daily conversation and grammar fundamentals.",
    languages: "en,tr",
    ratePerSecond: BigInt(5e15),
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Ayse&backgroundColor=6366f1",
    isAI: true,
    persona: "warm, patient, encouraging",
    targetLanguage: "English",
    active: true,
  },
  {
    address: "0xAI00000000000000000000000000000000000002",
    name: "Mehmet — AI Business English",
    bio: "Professional tone. Helps with business meetings, emails, presentations, and interviews.",
    languages: "en,tr",
    ratePerSecond: BigInt(5e15),
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Mehmet&backgroundColor=a855f7",
    isAI: true,
    persona: "professional, structured, direct",
    targetLanguage: "English",
    active: true,
  },
  {
    address: "0xAI00000000000000000000000000000000000003",
    name: "Elena — AI Travel Spanish",
    bio: "Casual conversation partner for travelers. Teaches practical Spanish for daily situations.",
    languages: "es,tr,en",
    ratePerSecond: BigInt(5e15),
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Elena&backgroundColor=22c55e",
    isAI: true,
    persona: "friendly, casual, cultural",
    targetLanguage: "Spanish",
    active: true,
  },
];

/**
 * Adresin AI ogretmen olup olmadigini kontrol et
 */
export function isAITeacher(address: string): boolean {
  return address.startsWith("0xAI");
}

/**
 * AI ogretmeni adresine gore bul
 */
export function getAITeacher(address: string): AITeacher | undefined {
  return AI_TEACHERS.find(t => t.address.toLowerCase() === address.toLowerCase());
}
