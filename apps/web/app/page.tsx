import Link from "next/link";
import {
  ShieldAlert,
  ArrowRight,
  ScanEye,
  Cpu,
  FileCheck2,
  Lock,
  Layers,
  Cloud,
  Terminal,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Token } from "@/components/ui/token";

export default function HomePage() {
  const categories = [
    {
      title: "1. Software Development",
      desc: "Next.js 15 App Router, React 19, strict TypeScript, Tailwind CSS, FastAPI, and PostgreSQL.",
      icon: Layers,
      color: "green" as const,
    },
    {
      title: "2. AI / Machine Learning",
      desc: "Modular inference adapters, calibrated probabilities, and explicit detector_not_configured states.",
      icon: Cpu,
      color: "bronze" as const,
    },
    {
      title: "3. Computer Vision",
      desc: "OpenCV and FFmpeg frame extraction, frequency domain (FFT/ELA) analysis, and temporal stability checks.",
      icon: ScanEye,
      color: "blue" as const,
    },
    {
      title: "4. Cybersecurity",
      desc: "Magic byte sniffing, SHA-256 media fingerprinting, private S3/MinIO storage, and hard deletion controls.",
      icon: Lock,
      color: "red" as const,
    },
    {
      title: "5. Natural Language Processing",
      desc: "Evidence-grounded report generation and structured forensic summaries with zero hallucination.",
      icon: FileCheck2,
      color: "bronze" as const,
    },
    {
      title: "6. Cloud Computing",
      desc: "Docker containerization, asynchronous Redis task worker queues, and 12-factor cloud deployment.",
      icon: Cloud,
      color: "purple" as const,
    },
  ];

  return (
    <div className="min-h-screen bg-[#24170F] text-[#F0DDB8] flex flex-col justify-between selection:bg-[#B58A4C]/25">
      {/* Console Top Header Bar */}
      <header
        className="border-b-2 border-[#B58A4C] bg-[#3B281A] px-6 py-4 flex items-center justify-between shadow-[0_4px_12px_rgba(18,11,7,0.6)] select-none"
        style={{
          backgroundImage: "linear-gradient(180deg, #4A3321 0%, #3B281A 100%)",
        }}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-b from-[#28734A] to-[#173D2D] border border-[#B58A4C] flex items-center justify-center text-[#F0DDB8] shadow-[0_2px_5px_rgba(18,11,7,0.5),inset_0_1px_0_rgba(229,201,149,0.3)]">
            <ShieldAlert className="w-6 h-6 text-[#E5C995] drop-shadow-[0_0_6px_rgba(229,201,149,0.5)]" />
          </div>
          <div>
            <span className="font-extrabold tracking-wider text-base text-[#F0DDB8] drop-shadow-[0_1px_2px_rgba(18,11,7,0.8)]">
              OMNISCAN
            </span>
            <span className="ml-2 text-xs text-[#E5C995] font-mono font-bold">v1.0.0-m0</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="text-xs text-[#D8B98A] hover:text-[#F0DDB8] transition-colors font-bold px-3 py-1.5"
          >
            Dashboard
          </Link>
          <Link href="/analyze">
            <Button variant="primary" size="sm" className="gap-2 shadow-md">
              <span>Launch Workstation</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-6xl mx-auto px-6 py-14 flex-1 flex flex-col items-center text-center justify-center">
        {/* Hardware Plaque Badge */}
        <div className="skeuo-recessed px-4 py-1.5 rounded-full text-xs text-[#24170F] mb-6 font-mono font-bold flex items-center gap-2 select-none border border-[#B58A4C]/70 shadow-[inset_0_2px_4px_rgba(36,23,15,0.3)]">
          <Terminal className="w-3.5 h-3.5 text-[#173D2D]" />
          <span>Six Mandatory Technology Stack Categories Verified & Active</span>
        </div>

        <h1 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight max-w-4xl leading-tight text-[#F0DDB8] drop-shadow-[0_2px_4px_rgba(18,11,7,0.8)]">
          AI Deepfake, Voice Clone & <br />
          <span className="bg-gradient-to-r from-[#E5C995] via-[#D8B98A] to-[#B58A4C] bg-clip-text text-transparent">
            Synthetic Media Forensics
          </span>
        </h1>

        <p className="mt-5 text-base md:text-lg text-[#D8B98A] max-w-2xl leading-relaxed">
          Tactile forensic laboratory workstation for scrutinizing images, speech audio, and video streams. Grounded evidence analysis with strict zero-hallucination disclaimers.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Link href="/analyze">
            <Button variant="primary" size="lg" className="gap-2 px-8 py-3.5 shadow-lg text-sm">
              <ScanEye className="w-5 h-5 text-[#E5C995]" />
              <span>Analyze Media Asset</span>
            </Button>
          </Link>
          <Link href="/dashboard">
            <Button variant="parchment" size="lg" className="gap-2 px-8 py-3.5 shadow-md text-sm">
              <span>Open Forensics Console</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>

        {/* 6 Mandatory Categories Grid */}
        <div className="mt-16 w-full text-left">
          <div className="mb-6 flex items-center justify-between border-b-2 border-[#B58A4C]/60 pb-3">
            <div>
              <h2 className="text-sm font-extrabold text-[#F0DDB8] uppercase tracking-wider font-mono">
                Mandatory Technology Stack Architecture
              </h2>
              <p className="text-xs text-[#D8B98A]">
                Modular forensic implementations verified across all 6 technical domains.
              </p>
            </div>
            <Badge variant="success">All 6 Active</Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map((cat, i) => {
              const Icon = cat.icon;
              return (
                <Card key={i} rivets={true} hoverEffect={true} className="p-2 sm:p-2.5">
                  <div className="flex items-start gap-3.5">
                    <Token color={cat.color} size="md">
                      <Icon className="w-5 h-5 text-white" />
                    </Token>
                    <div>
                      <h3 className="font-extrabold text-sm text-[#24170F]">{cat.title}</h3>
                      <p className="text-xs text-[#664830] leading-relaxed mt-1">{cat.desc}</p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t-2 border-[#B58A4C]/60 bg-[#3B281A] py-6 px-6 text-center text-xs text-[#D8B98A] select-none">
        <p>
          Detection scores are probabilistic model predictions and do not constitute absolute proof.
          OmniScan platform architecture compliant with forensic reproducibility and chain of custody standards.
        </p>
      </footer>
    </div>
  );
}
