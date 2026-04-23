/**
 * Ogretmen helper fonksiyonlari.
 * Kontrat + AI ogretmenleri birlestiren utility'ler.
 */

import { AI_TEACHERS, AI_TUTOR_POOL_ADDRESS, isAITeacher, getAITeacher } from "./aiTeachers";
import type { AITeacher } from "./aiTeachers";

export interface UnifiedTeacher {
  address: string;
  name: string;
  bio: string;
  languages: string;
  ratePerSecond: bigint;
  active: boolean;
  totalEarned: bigint;
  isAI: boolean;
  avatar?: string;
  persona?: string;
  targetLanguage?: string;
}

/**
 * AI ogretmen bilgisini UnifiedTeacher formatina cevir
 */
export function aiTeacherToUnified(ai: AITeacher): UnifiedTeacher {
  return {
    address: ai.address,
    name: ai.name,
    bio: ai.bio,
    languages: ai.languages,
    ratePerSecond: ai.ratePerSecond,
    active: ai.active,
    totalEarned: BigInt(0),
    isAI: true,
    avatar: ai.avatar,
    persona: ai.persona,
    targetLanguage: ai.targetLanguage,
  };
}

/**
 * Tum AI ogretmenleri UnifiedTeacher formatinda dondur
 */
export function getAllAITeachers(): UnifiedTeacher[] {
  return AI_TEACHERS.map(aiTeacherToUnified);
}

/**
 * Adrese gore AI veya insan ogretmen oldugunu belirle
 */
export function getTeacherType(address: string): "ai" | "human" {
  return isAITeacher(address) ? "ai" : "human";
}

/**
 * AI ogretmen seansi icin kullanilacak gercek kontrat adresi
 * (AI Tutor Pool adresi)
 */
export function getContractAddressForTeacher(teacherAddress: string): string {
  if (isAITeacher(teacherAddress)) {
    return AI_TUTOR_POOL_ADDRESS;
  }
  return teacherAddress;
}

export { isAITeacher, getAITeacher, AI_TUTOR_POOL_ADDRESS };
