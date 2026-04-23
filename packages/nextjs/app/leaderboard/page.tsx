"use client";

import { useState } from "react";
import type { NextPage } from "next";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";
import { Trophy, TrendingUp, Clock, Users, Bot, Crown, Medal, Award } from "lucide-react";
import { motion } from "framer-motion";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";

// Demo data — gercek kontrat verisi olmasa bile gorsellestirme icin
const demoWeeklyData = [
  { day: "Pzt", sessions: 12, volume: 0.45 },
  { day: "Sal", sessions: 18, volume: 0.72 },
  { day: "Car", sessions: 24, volume: 0.91 },
  { day: "Per", sessions: 15, volume: 0.58 },
  { day: "Cum", sessions: 31, volume: 1.24 },
  { day: "Cmt", sessions: 42, volume: 1.68 },
  { day: "Paz", sessions: 38, volume: 1.52 },
];

const demoRecentSessions = [
  { student: "0x1a2b...3c4d", teacher: "Ayse Yilmaz", duration: 420, cost: "0.042", lang: "en", isAI: false },
  { student: "0x5e6f...7g8h", teacher: "Ayse — AI English", duration: 600, cost: "0.006", lang: "en", isAI: true },
  { student: "0x9i0j...1k2l", teacher: "Mehmet — AI Business", duration: 300, cost: "0.006", lang: "en", isAI: true },
  { student: "0x3m4n...5o6p", teacher: "Elena — AI Spanish", duration: 900, cost: "0.0135", lang: "es", isAI: true },
  { student: "0x7q8r...9s0t", teacher: "Ayse Yilmaz", duration: 1800, cost: "0.18", lang: "en", isAI: false },
];

const LeaderboardPage: NextPage = () => {
  const [activeTab, setActiveTab] = useState<"teachers" | "activity">("teachers");

  const { data: teacherAddresses, isLoading } = useScaffoldReadContract({
    contractName: "StreamingTutorEscrow",
    functionName: "getAllTutors",
  });

  // Platform stats
  const totalSessions = 180;
  const totalVolume = "7.1";
  const avgDuration = "12:30";
  const activeTeachers = 4;

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-10"
      >
        <h1 className="text-4xl md:text-5xl font-bold mb-3">Leaderboard</h1>
        <p className="text-base-content/60 text-lg">Platform istatistikleri ve en iyi ogretmenler</p>
      </motion.div>

      {/* Stats Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10"
      >
        {[
          { icon: <Users className="h-5 w-5" />, label: "Toplam Seans", value: totalSessions.toString(), color: "from-indigo-500 to-blue-500" },
          { icon: <TrendingUp className="h-5 w-5" />, label: "Toplam Hacim", value: `${totalVolume} MON`, color: "from-purple-500 to-pink-500" },
          { icon: <Clock className="h-5 w-5" />, label: "Ort. Sure", value: avgDuration, color: "from-green-500 to-emerald-500" },
          { icon: <Trophy className="h-5 w-5" />, label: "Aktif Ogretmen", value: activeTeachers.toString(), color: "from-orange-500 to-amber-500" },
        ].map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.05 }}
            className="card bg-base-100 shadow-xl"
          >
            <div className="card-body p-4">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center text-white mb-2`}>
                {stat.icon}
              </div>
              <div className="text-2xl font-bold">{stat.value}</div>
              <div className="text-xs text-base-content/50">{stat.label}</div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Charts */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10"
      >
        {/* Sessions chart */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h3 className="font-bold text-lg mb-4">Haftalik Seanslar</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={demoWeeklyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(129,140,248,0.1)" />
                  <XAxis dataKey="day" stroke="rgba(129,140,248,0.5)" fontSize={12} />
                  <YAxis stroke="rgba(129,140,248,0.5)" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      background: "rgba(15,10,46,0.9)",
                      border: "1px solid rgba(129,140,248,0.2)",
                      borderRadius: "12px",
                      color: "#e0e7ff",
                    }}
                  />
                  <Bar dataKey="sessions" fill="url(#barGradient)" radius={[6, 6, 0, 0]} />
                  <defs>
                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#818cf8" />
                      <stop offset="100%" stopColor="#6366f1" />
                    </linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Volume chart */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h3 className="font-bold text-lg mb-4">Haftalik Hacim (MON)</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={demoWeeklyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(129,140,248,0.1)" />
                  <XAxis dataKey="day" stroke="rgba(129,140,248,0.5)" fontSize={12} />
                  <YAxis stroke="rgba(129,140,248,0.5)" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      background: "rgba(15,10,46,0.9)",
                      border: "1px solid rgba(129,140,248,0.2)",
                      borderRadius: "12px",
                      color: "#e0e7ff",
                    }}
                  />
                  <defs>
                    <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#a855f7" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#a855f7" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area
                    type="monotone"
                    dataKey="volume"
                    stroke="#a855f7"
                    strokeWidth={2}
                    fill="url(#areaGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          className={`btn btn-sm rounded-full ${
            activeTab === "teachers"
              ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white border-none"
              : "btn-outline"
          }`}
          onClick={() => setActiveTab("teachers")}
        >
          <Trophy className="h-4 w-4" />
          Top Ogretmenler
        </button>
        <button
          className={`btn btn-sm rounded-full ${
            activeTab === "activity"
              ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white border-none"
              : "btn-outline"
          }`}
          onClick={() => setActiveTab("activity")}
        >
          <Clock className="h-4 w-4" />
          Son Seanslar
        </button>
      </div>

      {/* Content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        {activeTab === "teachers" ? (
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body p-0">
              {isLoading ? (
                <div className="flex justify-center py-20">
                  <span className="loading loading-spinner loading-lg text-primary" />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="table">
                    <thead>
                      <tr className="text-base-content/50">
                        <th>Sira</th>
                        <th>Ogretmen</th>
                        <th>Tip</th>
                        <th>Diller</th>
                        <th>Durum</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* AI Teachers */}
                      <tr className="hover:bg-indigo-500/5">
                        <td>
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center">
                            <Crown className="h-4 w-4 text-white" />
                          </div>
                        </td>
                        <td>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
                              <Bot className="h-5 w-5 text-white" />
                            </div>
                            <div>
                              <div className="font-bold">Ayse — AI English Tutor</div>
                              <div className="text-xs text-base-content/40">Gemini Live</div>
                            </div>
                          </div>
                        </td>
                        <td><span className="badge badge-primary badge-sm">AI</span></td>
                        <td>EN, TR</td>
                        <td><div className="flex items-center gap-1"><div className="w-2 h-2 bg-green-500 rounded-full" /><span className="text-xs text-green-500">Active</span></div></td>
                      </tr>
                      <tr className="hover:bg-indigo-500/5">
                        <td>
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center">
                            <Medal className="h-4 w-4 text-white" />
                          </div>
                        </td>
                        <td>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                              <Bot className="h-5 w-5 text-white" />
                            </div>
                            <div>
                              <div className="font-bold">Mehmet — AI Business English</div>
                              <div className="text-xs text-base-content/40">Gemini Live</div>
                            </div>
                          </div>
                        </td>
                        <td><span className="badge badge-primary badge-sm">AI</span></td>
                        <td>EN, TR</td>
                        <td><div className="flex items-center gap-1"><div className="w-2 h-2 bg-green-500 rounded-full" /><span className="text-xs text-green-500">Active</span></div></td>
                      </tr>
                      <tr className="hover:bg-indigo-500/5">
                        <td>
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-600 to-amber-700 flex items-center justify-center">
                            <Award className="h-4 w-4 text-white" />
                          </div>
                        </td>
                        <td>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                              <Bot className="h-5 w-5 text-white" />
                            </div>
                            <div>
                              <div className="font-bold">Elena — AI Travel Spanish</div>
                              <div className="text-xs text-base-content/40">Gemini Live</div>
                            </div>
                          </div>
                        </td>
                        <td><span className="badge badge-primary badge-sm">AI</span></td>
                        <td>ES, TR, EN</td>
                        <td><div className="flex items-center gap-1"><div className="w-2 h-2 bg-green-500 rounded-full" /><span className="text-xs text-green-500">Active</span></div></td>
                      </tr>
                      {/* Contract teachers */}
                      {teacherAddresses && (teacherAddresses as string[]).map((addr, i) => (
                        <TeacherRow key={addr} address={addr} rank={i + 4} />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body p-0">
              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr className="text-base-content/50">
                      <th>Ogrenci</th>
                      <th>Ogretmen</th>
                      <th>Sure</th>
                      <th>Maliyet</th>
                      <th>Dil</th>
                    </tr>
                  </thead>
                  <tbody>
                    {demoRecentSessions.map((s, i) => (
                      <tr key={i} className="hover:bg-indigo-500/5">
                        <td className="font-mono text-sm">{s.student}</td>
                        <td>
                          <div className="flex items-center gap-2">
                            {s.isAI && <Bot className="h-4 w-4 text-indigo-400" />}
                            <span className="text-sm">{s.teacher}</span>
                          </div>
                        </td>
                        <td>{Math.floor(s.duration / 60)}:{(s.duration % 60).toString().padStart(2, "0")}</td>
                        <td className="text-primary font-semibold">{s.cost} MON</td>
                        <td><span className="badge badge-outline badge-sm">{s.lang.toUpperCase()}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};

function TeacherRow({ address, rank }: { address: string; rank: number }) {
  const { data: teacher } = useScaffoldReadContract({
    contractName: "StreamingTutorEscrow",
    functionName: "getTutor",
    args: [address],
  });

  if (!teacher || !teacher.wallet || teacher.wallet === "0x0000000000000000000000000000000000000000") return null;

  return (
    <tr className="hover:bg-indigo-500/5">
      <td>
        <div className="w-8 h-8 rounded-full bg-base-300 flex items-center justify-center text-sm font-bold">
          {rank}
        </div>
      </td>
      <td>
        <div className="flex items-center gap-3">
          <div className="avatar placeholder">
            <div className="bg-gradient-to-br from-indigo-500 to-purple-500 text-white rounded-full w-10 h-10">
              <span className="text-sm font-bold">{teacher.name.charAt(0)}</span>
            </div>
          </div>
          <div>
            <div className="font-bold">{teacher.name}</div>
            <div className="text-xs text-base-content/40 font-mono">
              {address.slice(0, 6)}...{address.slice(-4)}
            </div>
          </div>
        </div>
      </td>
      <td><span className="badge badge-outline badge-sm">Human</span></td>
      <td>{teacher.languages.toUpperCase()}</td>
      <td>
        <div className="flex items-center gap-1">
          <div className={`w-2 h-2 rounded-full ${teacher.active ? "bg-green-500" : "bg-red-500"}`} />
          <span className={`text-xs ${teacher.active ? "text-green-500" : "text-red-500"}`}>
            {teacher.active ? "Active" : "Inactive"}
          </span>
        </div>
      </td>
    </tr>
  );
}

export default LeaderboardPage;
