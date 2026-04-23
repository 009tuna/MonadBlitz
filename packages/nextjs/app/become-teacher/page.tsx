"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { parseEther } from "viem";
import { useAccount } from "wagmi";
import { useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { GraduationCap, Globe, DollarSign, FileText, ArrowRight, CheckCircle, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

const languageOptions = [
  { code: "en", name: "English" },
  { code: "tr", name: "Turkish" },
  { code: "de", name: "German" },
  { code: "fr", name: "French" },
  { code: "es", name: "Spanish" },
  { code: "it", name: "Italian" },
  { code: "ja", name: "Japanese" },
  { code: "ko", name: "Korean" },
  { code: "zh", name: "Chinese" },
  { code: "ar", name: "Arabic" },
  { code: "ru", name: "Russian" },
  { code: "pt", name: "Portuguese" },
];

export default function BecomeTeacherPage() {
  const router = useRouter();
  const { address } = useAccount();

  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [selectedLangs, setSelectedLangs] = useState<string[]>([]);
  const [ratePerMinute, setRatePerMinute] = useState("0.006");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { writeContractAsync: registerTeacher } = useScaffoldWriteContract("SpeakStream");

  const toggleLang = (code: string) => {
    setSelectedLangs(prev =>
      prev.includes(code) ? prev.filter(l => l !== code) : [...prev, code]
    );
  };

  const handleSubmit = async () => {
    if (!address || !name || !bio || selectedLangs.length === 0) return;
    setIsSubmitting(true);
    try {
      const ratePerSecond = parseEther(ratePerMinute) / BigInt(60);
      await registerTeacher({
        functionName: "registerTeacher",
        args: [name, bio, selectedLangs.join(","), ratePerSecond],
      });
      router.push("/teachers");
    } catch (e) {
      console.error("Kayit hatasi:", e);
    }
    setIsSubmitting(false);
  };

  const isValid = name.length > 0 && bio.length > 0 && selectedLangs.length > 0 && address;

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Sol: Bilgi */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:col-span-2"
        >
          <div className="sticky top-24">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white mb-4">
              <GraduationCap className="h-7 w-7" />
            </div>
            <h1 className="text-3xl font-bold mb-3">Ogretmen Ol</h1>
            <p className="text-base-content/60 mb-8">
              Dil bilgini paylasarak MON kazan. Ogrenciler sana saniye basina ode.
            </p>

            <div className="space-y-4">
              {[
                "Kendi ucretini belirle",
                "Sadece dogrulanan konusma icin odeme alirsin",
                "Escrow ile odeme garantisi",
                "Istedigin zaman aktif/pasif ol",
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-base-content/70">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Sag: Form */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-3"
        >
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              {/* Ad */}
              <div className="form-control mb-4">
                <label className="label">
                  <span className="label-text font-semibold flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    Goruntulenecek Ad
                  </span>
                </label>
                <input
                  type="text"
                  placeholder="Ornegin: Ayse Yilmaz"
                  className="input input-bordered"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  maxLength={50}
                />
              </div>

              {/* Bio */}
              <div className="form-control mb-4">
                <label className="label">
                  <span className="label-text font-semibold flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    Hakkinda
                  </span>
                </label>
                <textarea
                  placeholder="Deneyiminizi ve ogretme tarzinizi anlatin..."
                  className="textarea textarea-bordered h-28 resize-none"
                  value={bio}
                  onChange={e => setBio(e.target.value)}
                  maxLength={300}
                />
                <label className="label">
                  <span className="label-text-alt text-base-content/40">{bio.length}/300</span>
                </label>
              </div>

              {/* Diller */}
              <div className="form-control mb-4">
                <label className="label">
                  <span className="label-text font-semibold flex items-center gap-2">
                    <Globe className="h-4 w-4 text-primary" />
                    Ogrettigin Diller
                  </span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {languageOptions.map(lang => (
                    <button
                      key={lang.code}
                      className={`btn btn-sm rounded-full transition-all ${
                        selectedLangs.includes(lang.code)
                          ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white border-none"
                          : "btn-outline"
                      }`}
                      onClick={() => toggleLang(lang.code)}
                    >
                      {lang.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Ucret */}
              <div className="form-control mb-6">
                <label className="label">
                  <span className="label-text font-semibold flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-primary" />
                    Ucret (MON / dakika)
                  </span>
                </label>
                <input
                  type="number"
                  step="0.001"
                  min="0.001"
                  placeholder="0.006"
                  className="input input-bordered"
                  value={ratePerMinute}
                  onChange={e => setRatePerMinute(e.target.value)}
                />
                <label className="label">
                  <span className="label-text-alt text-base-content/40">
                    = {(parseFloat(ratePerMinute || "0") * 60).toFixed(4)} MON/saat
                  </span>
                </label>
              </div>

              {/* Submit */}
              <button
                className="btn btn-lg btn-block bg-gradient-to-r from-indigo-500 to-purple-500 text-white border-none shadow-lg shadow-indigo-500/25 hover:shadow-xl hover:shadow-indigo-500/35 transition-all"
                onClick={handleSubmit}
                disabled={!isValid || isSubmitting}
              >
                {isSubmitting ? (
                  <span className="loading loading-spinner" />
                ) : (
                  <>
                    <GraduationCap className="h-5 w-5" />
                    Ogretmen Olarak Kaydol
                    <ArrowRight className="h-5 w-5" />
                  </>
                )}
              </button>

              {!address && (
                <p className="text-center text-sm text-warning mt-2">
                  Kayit icin cuzdaninizi baglayin
                </p>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
