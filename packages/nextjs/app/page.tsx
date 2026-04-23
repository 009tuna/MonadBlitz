"use client";

import Link from "next/link";
import type { NextPage } from "next";
import { motion } from "framer-motion";
import { Bot, Mic, Shield, Globe, ArrowRight, Radio, DollarSign, CheckCircle } from "lucide-react";

const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.6, ease: "easeOut" },
  }),
};

const Home: NextPage = () => {
  return (
    <div className="relative overflow-hidden">
      {/* Background orbs */}
      <div className="fixed inset-0 pointer-events-none -z-10">
        <div className="orb orb-indigo absolute top-20 left-1/4 w-96 h-96 opacity-20" />
        <div className="orb orb-purple absolute top-60 right-1/4 w-80 h-80 opacity-15" style={{ animationDelay: "2s" }} />
        <div className="orb orb-blue absolute bottom-40 left-1/3 w-72 h-72 opacity-10" style={{ animationDelay: "4s" }} />
      </div>

      {/* Hero Section */}
      <section className="min-h-[85vh] flex items-center justify-center px-4 py-20">
        <div className="max-w-6xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
          >
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 rounded-full px-4 py-2 mb-8">
              <Radio className="h-4 w-4 text-indigo-400 animate-pulse" />
              <span className="text-sm font-medium text-indigo-300">Monad Testnet Uzerinde Canli</span>
            </div>

            {/* Title */}
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-black mb-6 leading-tight">
              <span className="text-gradient">Konus.</span>{" "}
              <span className="text-base-content">Ogren.</span>{" "}
              <span className="text-gradient">Kazan.</span>
            </h1>

            {/* Subtitle */}
            <p className="text-xl md:text-2xl text-base-content/60 max-w-3xl mx-auto mb-10 leading-relaxed">
              Dil ogretmenlerine{" "}
              <span className="text-primary font-semibold">saniye basina</span>{" "}
              ode. AI dogrulama ile sadece gercekten konustugunda odeme yapilir.
              Monad&apos;in 400ms bloklariyla aninda stream.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
              <Link
                href="/teachers"
                className="btn btn-lg bg-gradient-to-r from-indigo-500 to-purple-500 text-white border-none shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/40 transition-all hover:scale-105"
              >
                <Bot className="h-5 w-5" />
                AI Tutor ile Baslat
                <ArrowRight className="h-5 w-5" />
              </Link>
              <Link
                href="/become-teacher"
                className="btn btn-lg btn-outline border-indigo-500/30 hover:bg-indigo-500/10 transition-all"
              >
                <Mic className="h-5 w-5" />
                Ogretmen Ol
              </Link>
            </div>

            {/* Live Demo Indicator */}
            <div className="flex items-center justify-center gap-6 text-sm text-base-content/40">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span>Monad Testnet</span>
              </div>
              <span className="text-base-content/20">|</span>
              <div className="flex items-center gap-2">
                <Bot className="h-4 w-4" />
                <span>Gemini Live API</span>
              </div>
              <span className="text-base-content/20">|</span>
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                <span>Escrow Korumasi</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            className="text-center mb-16"
          >
            <motion.h2 variants={fadeInUp} custom={0} className="text-4xl md:text-5xl font-bold mb-4">
              Nasil Calisiyor?
            </motion.h2>
            <motion.p variants={fadeInUp} custom={1} className="text-lg text-base-content/50 max-w-2xl mx-auto">
              3 adimda dil ogrenmeye basla
            </motion.p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                icon: <Globe className="h-8 w-8" />,
                title: "Ogretmen Sec",
                desc: "AI tutor veya insan ogretmen sec. Dil, fiyat ve uzmanlik alanina gore filtrele.",
                color: "from-indigo-500 to-blue-500",
              },
              {
                step: "02",
                icon: <Mic className="h-8 w-8" />,
                title: "Konus & Ogren",
                desc: "Gercek zamanli sesli konusma. AI ogretmenle Gemini Live, insan ogretmenle Web Speech API.",
                color: "from-purple-500 to-pink-500",
              },
              {
                step: "03",
                icon: <DollarSign className="h-8 w-8" />,
                title: "Sadece Konustuguna Ode",
                desc: "AI her 30 saniyede konusmanizi dogrular. Sadece dogrulanan saniyeler icin odeme yapilir.",
                color: "from-green-500 to-emerald-500",
              },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeInUp}
                custom={i + 2}
                className="relative group"
              >
                <div className="card bg-base-100 shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 glow-card h-full">
                  <div className="card-body relative z-10">
                    <div className="text-6xl font-black text-base-content/5 absolute top-4 right-4">
                      {item.step}
                    </div>
                    <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${item.color} flex items-center justify-center text-white mb-4 group-hover:scale-110 transition-transform`}>
                      {item.icon}
                    </div>
                    <h3 className="text-xl font-bold mb-2">{item.title}</h3>
                    <p className="text-base-content/60">{item.desc}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* AI Tutor Feature */}
      <section className="py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 rounded-full px-3 py-1 mb-4">
                <Bot className="h-4 w-4 text-indigo-400" />
                <span className="text-sm font-medium text-indigo-300">Yeni Ozellik</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-bold mb-6">
                AI Tutor ile<br />
                <span className="text-gradient">Sesli Konusma</span>
              </h2>
              <p className="text-lg text-base-content/60 mb-8 leading-relaxed">
                Gemini Live API ile gercek zamanli sesli konusma. AI ogretmen sizi dinler,
                hatalari duzeltir ve konusmayi devam ettirir. 7/24 aktif, sabir siniri yok.
              </p>
              <div className="space-y-4">
                {[
                  "Gercek zamanli ses-sese konusma",
                  "Otomatik hata duzeltme ve geri bildirim",
                  "3 farkli persona: Gunluk, Is, Seyahat",
                  "Transcript otomatik kaydedilir",
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                    <span className="text-base-content/70">{item}</span>
                  </div>
                ))}
              </div>
              <div className="mt-8">
                <Link
                  href="/teachers"
                  className="btn bg-gradient-to-r from-indigo-500 to-purple-500 text-white border-none shadow-lg shadow-indigo-500/25"
                >
                  AI Tutorlerle Tani
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="relative"
            >
              {/* Mock chat UI */}
              <div className="bg-base-100 rounded-2xl shadow-2xl p-6 border border-base-content/5">
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-base-content/10">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span className="ml-2 text-sm text-base-content/40">SpeakStream Session</span>
                </div>

                <div className="space-y-3">
                  {/* AI message */}
                  <div className="flex gap-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center flex-shrink-0">
                      <Bot className="h-4 w-4 text-white" />
                    </div>
                    <div className="bg-indigo-500/20 text-indigo-100 px-4 py-2.5 rounded-2xl rounded-tl-sm text-sm max-w-[80%]">
                      Hello! I&apos;m Ayse, your English tutor. What would you like to talk about today?
                    </div>
                  </div>

                  {/* Student message */}
                  <div className="flex gap-2 justify-end">
                    <div className="bg-base-300 px-4 py-2.5 rounded-2xl rounded-tr-sm text-sm max-w-[80%]">
                      I want to practice ordering food at a restaurant.
                    </div>
                  </div>

                  {/* AI message */}
                  <div className="flex gap-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center flex-shrink-0">
                      <Bot className="h-4 w-4 text-white" />
                    </div>
                    <div className="bg-indigo-500/20 text-indigo-100 px-4 py-2.5 rounded-2xl rounded-tl-sm text-sm max-w-[80%]">
                      Great choice! Let&apos;s role-play. I&apos;ll be the waiter. &quot;Good evening! Welcome to our restaurant. May I take your order?&quot;
                    </div>
                  </div>

                  {/* Typing indicator */}
                  <div className="flex gap-2">
                    <div className="w-8 h-8 rounded-full bg-base-300 flex items-center justify-center flex-shrink-0">
                      <Mic className="h-4 w-4 text-base-content/50" />
                    </div>
                    <div className="bg-base-300 px-4 py-3 rounded-2xl rounded-tl-sm">
                      <span className="flex gap-1">
                        <span className="w-2 h-2 bg-base-content/30 rounded-full typing-dot" />
                        <span className="w-2 h-2 bg-base-content/30 rounded-full typing-dot" style={{ animationDelay: "0.2s" }} />
                        <span className="w-2 h-2 bg-base-content/30 rounded-full typing-dot" style={{ animationDelay: "0.4s" }} />
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bottom bar */}
                <div className="mt-4 pt-3 border-t border-base-content/10 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-base-content/40">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <span>AI dogrulama aktif</span>
                  </div>
                  <div className="text-xs text-primary font-mono">0.0023 MON streamed</div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Why Monad */}
      <section className="py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <motion.h2 variants={fadeInUp} custom={0} className="text-4xl md:text-5xl font-bold mb-4">
              Neden <span className="text-gradient">Monad</span>?
            </motion.h2>
            <motion.p variants={fadeInUp} custom={1} className="text-lg text-base-content/50 max-w-2xl mx-auto">
              Saniye basina odeme icin en hizli EVM zinciri
            </motion.p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { value: "400ms", label: "Blok Suresi", desc: "Aninda odeme onaylari" },
              { value: "10K+", label: "TPS", desc: "Paralel islem kapasitesi" },
              { value: "~$0", label: "Gas Ucreti", desc: "Mikro odemeler icin ideal" },
              { value: "EVM", label: "Uyumluluk", desc: "Solidity + tum araclar" },
            ].map((stat, i) => (
              <motion.div
                key={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeInUp}
                custom={i + 2}
                className="card bg-base-100 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1"
              >
                <div className="card-body items-center text-center">
                  <div className="text-4xl font-black text-gradient mb-1">{stat.value}</div>
                  <div className="font-semibold">{stat.label}</div>
                  <div className="text-sm text-base-content/50">{stat.desc}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="card bg-gradient-to-br from-indigo-950/80 to-purple-950/80 border border-indigo-500/20 shadow-2xl"
          >
            <div className="card-body items-center text-center py-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Dil Ogrenmenin Yeni Yolu
              </h2>
              <p className="text-lg text-base-content/60 max-w-xl mb-8">
                Cuzdanini bagla, ogretmenini sec ve konusmaya basla.
                Sadece gercekten konustugunda ode.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  href="/teachers"
                  className="btn btn-lg bg-gradient-to-r from-indigo-500 to-purple-500 text-white border-none shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/40 transition-all"
                >
                  Ogretmenleri Gor
                  <ArrowRight className="h-5 w-5" />
                </Link>
                <Link
                  href="/leaderboard"
                  className="btn btn-lg btn-outline border-indigo-500/30 hover:bg-indigo-500/10"
                >
                  Leaderboard
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default Home;
