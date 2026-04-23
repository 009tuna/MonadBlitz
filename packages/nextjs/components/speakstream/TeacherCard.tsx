"use client";

import Link from "next/link";
import { Bot, DollarSign, Globe, Sparkles } from "lucide-react";
import { formatEther } from "viem";

interface TeacherCardProps {
  address: string;
  name: string;
  bio: string;
  languages: string;
  ratePerSecond: bigint;
  active: boolean;
  totalEarned: bigint;
  isAI?: boolean;
  avatar?: string;
}

const languageNames: Record<string, string> = {
  en: "English",
  tr: "Turkish",
  de: "German",
  fr: "French",
  es: "Spanish",
  it: "Italian",
  ja: "Japanese",
  ko: "Korean",
  zh: "Chinese",
  ar: "Arabic",
  ru: "Russian",
  pt: "Portuguese",
};

export const TeacherCard = ({
  address,
  name,
  bio,
  languages,
  ratePerSecond,
  active,
  totalEarned,
  isAI = false,
  avatar,
}: TeacherCardProps) => {
  const ratePerHour = ratePerSecond * BigInt(3600);
  const ratePerHourStr = Number(formatEther(ratePerHour)).toFixed(4);

  const langList = languages
    .split(",")
    .map(l => l.trim())
    .filter(Boolean);

  return (
    <div
      className={`card shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 hover:scale-[1.02] ${
        !active ? "opacity-50" : ""
      } ${isAI ? "bg-gradient-to-br from-indigo-950/80 to-purple-950/80 border border-indigo-500/20" : "bg-base-100"}`}
    >
      <div className="card-body">
        {/* AI Badge */}
        {isAI && (
          <div className="absolute top-3 right-3">
            <div className="flex items-center gap-1 bg-indigo-500/20 text-indigo-300 px-2 py-1 rounded-full text-xs font-semibold">
              <Bot className="h-3 w-3" />
              AI Tutor
            </div>
          </div>
        )}

        {/* Avatar ve isim */}
        <div className="flex items-center gap-3 mb-3">
          {avatar ? (
            <div className="w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-indigo-500 to-purple-500 flex-shrink-0">
              <img src={avatar} alt={name} className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className="avatar placeholder flex-shrink-0">
              <div className="bg-gradient-to-br from-indigo-500 to-purple-500 text-white rounded-full w-12 h-12">
                <span className="text-xl font-bold">{name.charAt(0).toUpperCase()}</span>
              </div>
            </div>
          )}
          <div className="min-w-0">
            <h3 className="font-bold text-lg truncate">{name}</h3>
            <div className="flex items-center gap-1">
              {active ? (
                <>
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-xs text-green-500">{isAI ? "Her zaman aktif" : "Active"}</span>
                </>
              ) : (
                <span className="text-xs text-error">Inactive</span>
              )}
            </div>
          </div>
        </div>

        {/* Bio */}
        <p className="text-sm text-base-content/70 line-clamp-2 mb-3">{bio}</p>

        {/* Diller */}
        <div className="flex items-center gap-1 flex-wrap mb-3">
          <Globe className="h-4 w-4 text-base-content/50 flex-shrink-0" />
          {langList.map(lang => (
            <span key={lang} className={`badge badge-sm ${isAI ? "badge-primary badge-outline" : "badge-outline"}`}>
              {languageNames[lang] || lang}
            </span>
          ))}
        </div>

        {/* Rate */}
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-1">
            <DollarSign className="h-4 w-4 text-primary" />
            <span className="font-semibold text-primary">{ratePerHourStr} MON</span>
            <span className="text-xs text-base-content/50">/saat</span>
          </div>
          {!isAI && (
            <div className="text-xs text-base-content/50">
              Toplam: {Number(formatEther(totalEarned)).toFixed(4)} MON
            </div>
          )}
          {isAI && (
            <div className="flex items-center gap-1 text-xs text-indigo-400">
              <Sparkles className="h-3 w-3" />
              Gemini Live
            </div>
          )}
        </div>

        {/* CTA */}
        <Link
          href={`/teachers/${address}`}
          className={`btn btn-block ${!active ? "btn-disabled" : ""} ${
            isAI
              ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white border-none hover:from-indigo-600 hover:to-purple-600"
              : "btn-primary"
          }`}
        >
          {isAI ? (
            <>
              <Bot className="h-5 w-5" />
              AI ile Konus
            </>
          ) : (
            <>
              <Sparkles className="h-5 w-5" />
              Seans Baslat
            </>
          )}
        </Link>
      </div>
    </div>
  );
};
