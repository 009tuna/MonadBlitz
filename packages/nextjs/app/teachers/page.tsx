"use client";

import { useState } from "react";
import type { NextPage } from "next";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";
import { TeacherCard } from "~~/components/speakstream/TeacherCard";
import { AI_TEACHERS } from "~~/lib/aiTeachers";
import { Bot, Search, GraduationCap } from "lucide-react";
import { motion } from "framer-motion";

const languageNames: Record<string, string> = {
  all: "Tumu",
  en: "English",
  tr: "Turkish",
  de: "German",
  fr: "French",
  es: "Spanish",
  it: "Italian",
  ja: "Japanese",
};

const TeachersPage: NextPage = () => {
  const [filterLang, setFilterLang] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: teacherAddresses, isLoading: loadingAddresses } = useScaffoldReadContract({
    contractName: "SpeakStream",
    functionName: "getAllTeachers",
  });

  const filteredAITeachers = AI_TEACHERS.filter(t => {
    if (filterLang !== "all" && !t.languages.includes(filterLang)) return false;
    if (searchQuery && !t.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-10"
      >
        <h1 className="text-4xl md:text-5xl font-bold mb-3">Ogretmenler</h1>
        <p className="text-base-content/60 text-lg max-w-2xl mx-auto">
          AI tutor veya insan ogretmen sec, seansini baslat ve konusmaya basla
        </p>
      </motion.div>

      <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-10">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-base-content/30" />
          <input
            type="text"
            placeholder="Ogretmen ara..."
            className="input input-bordered w-full pl-10"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-2 justify-center">
          {Object.entries(languageNames).map(([code, name]) => (
            <button
              key={code}
              className={`btn btn-sm rounded-full transition-all ${
                filterLang === code
                  ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white border-none"
                  : "btn-outline"
              }`}
              onClick={() => setFilterLang(code)}
            >
              {name}
            </button>
          ))}
        </div>
      </div>

      {filteredAITeachers.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-12"
        >
          <div className="flex items-center gap-2 mb-6">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
              <Bot className="h-4 w-4 text-white" />
            </div>
            <h2 className="text-2xl font-bold">AI Tutorler</h2>
            <div className="badge badge-primary badge-sm">Gemini Live</div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAITeachers.map((teacher, i) => (
              <motion.div
                key={teacher.address}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.05 }}
              >
                <TeacherCard
                  address={teacher.address}
                  name={teacher.name}
                  bio={teacher.bio}
                  languages={teacher.languages}
                  ratePerSecond={teacher.ratePerSecond}
                  active={teacher.active}
                  totalEarned={BigInt(0)}
                  isAI={true}
                  avatar={teacher.avatar}
                />
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="flex items-center gap-2 mb-6">
          <div className="w-8 h-8 rounded-lg bg-base-300 flex items-center justify-center">
            <GraduationCap className="h-4 w-4 text-base-content/60" />
          </div>
          <h2 className="text-2xl font-bold">Insan Ogretmenler</h2>
        </div>

        {loadingAddresses ? (
          <div className="flex justify-center py-20">
            <span className="loading loading-spinner loading-lg text-primary" />
          </div>
        ) : !teacherAddresses || teacherAddresses.length === 0 ? (
          <div className="text-center py-16 bg-base-200 rounded-2xl">
            <GraduationCap className="h-16 w-16 mx-auto text-base-content/20 mb-4" />
            <p className="text-xl text-base-content/50 mb-2">Henuz kayitli ogretmen yok</p>
            <p className="text-base-content/30 mb-4">Ilk ogretmen sen ol!</p>
            <a href="/become-teacher" className="btn btn-primary btn-sm">Ogretmen Ol</a>
          </div>
        ) : (
          <TeacherGrid addresses={teacherAddresses as string[]} filterLang={filterLang} searchQuery={searchQuery} />
        )}
      </motion.div>
    </div>
  );
};

function TeacherGrid({ addresses, filterLang, searchQuery }: { addresses: string[]; filterLang: string; searchQuery: string }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {addresses.map((addr, i) => (
        <motion.div
          key={addr}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 * i }}
        >
          <TeacherCardWrapper address={addr} filterLang={filterLang} searchQuery={searchQuery} />
        </motion.div>
      ))}
    </div>
  );
}

function TeacherCardWrapper({ address, filterLang, searchQuery }: { address: string; filterLang: string; searchQuery: string }) {
  const { data: teacher } = useScaffoldReadContract({
    contractName: "SpeakStream",
    functionName: "getTeacher",
    args: [address],
  });

  if (!teacher || !teacher.wallet || teacher.wallet === "0x0000000000000000000000000000000000000000") return null;
  if (filterLang !== "all" && !teacher.languages.toLowerCase().includes(filterLang)) return null;
  if (searchQuery && !teacher.name.toLowerCase().includes(searchQuery.toLowerCase())) return null;

  return (
    <TeacherCard
      address={address}
      name={teacher.name}
      bio={teacher.bio}
      languages={teacher.languages}
      ratePerSecond={teacher.ratePerSecond}
      active={teacher.active}
      totalEarned={teacher.totalEarned}
    />
  );
}

export default TeachersPage;
