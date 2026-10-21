"use client";

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
  LogIn,
  LogOut,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Token } from "@/components/ui/token";
import { useAuth } from "@/lib/auth-context";

export default function HomePage() {
  const { isAuthenticated, logout, user } = useAuth();

  const capabilities = [
    {
      title: "1. Multi-Modal Architecture",
      desc: "Isolated detection pipelines for image frequencies, vocoder acoustics, and temporal video stability.",
      icon: Layers,
      color: "green" as const,
    },
    {
      title: "2. Calibrated Probabilities",
      desc: "Deterministic confidence bounds, explicit unconfigured detector states, and zero-hallucination disclaimers.",
      icon: Cpu,
      color: "bronze" as const,
    },
    {
      title: "3. Computer Vision & Signal Analysis",
      desc: "2D Fast Fourier Transform (FFT) spectrums, Error Level Analysis (ELA), and inter-frame optical flow analysis.",
      icon: ScanEye,
      color: "blue" as const,
    },
    {
      title: "4. Cryptographic Chain of Custody",
      desc: "Magic byte validation, SHA-256 media fingerprinting, isolated storage vaults, and permanent hard deletion.",
      icon: Lock,
      color: "red" as const,
    },
    {
      title: "5. Grounded Forensic Reporting",
      desc: "Evidence-synthesized inspection dossiers and printable forensic reports tailored for institutional review.",
      icon: FileCheck2,
      color: "bronze" as const,
    },
    {
      title: "6. Production Cloud & Storage",
      desc: "Asynchronous background orchestrator, PostgreSQL audit persistence, and private object storage integrations.",
      icon: Cloud,
      color: "purple" as const,
    },
  ];

  return (
    <div className="min-h-screen wood-backdrop text-[#F0DDB8] flex flex-col justify-between selection:bg-[#B58A4C]/35">
      {/* Top Header Bar */}
      <header className="skeuo-wood-header px-6 py-4 flex items-center justify-between select-none">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-b from-[#28734A] to-[#173D2D] border border-[#B58A4C] flex items-center justify-center text-[#F0DDB8] shadow-[0_2px_5px_rgba(18,11,7,0.5),inset_0_1px_0_rgba(229,201,149,0.3)]">
            <ShieldAlert className="w-6 h-6 text-[#E5C995] drop-shadow-[0_0_6px_rgba(229,201,149,0.5)]" />
          </div>
          <div>
            <span className="font-extrabold tracking-wider text-base text-[#F0DDB8] drop-shadow-[0_1px_2px_rgba(18,11,7,0.8)]">
              OMNISCAN
            </span>
            <span className="ml-2 text-xs text-[#E5C995] font-mono font-bold">
              Forensic Station
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <>
              <Link
                href="/dashboard"
                className="text-xs text-[#D8B98A] hover:text-[#F0DDB8] transition-colors font-bold px-3 py-1.5"
              >
                Dashboard
              </Link>
              <span className="text-xs font-mono text-[#E5C995] hidden md:inline truncate max-w-[150px]">
                {user?.email}
              </span>
              <button
                onClick={() => logout()}
                className="text-xs text-[#D8B98A] hover:text-[#FFF] transition-colors font-bold px-3 py-1.5 cursor-pointer flex items-center gap-1"
              >
                <LogOut className="w-3.5 h-3.5 text-[#E5C995]" />
                <span>Log out</span>
              </button>
              <Link href="/analyze">
                <Button variant="primary" size="sm" className="gap-2 shadow-md">
                  <span>Open Console</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </>
          ) : (
            <>
              <Link href="/login">
                <Button variant="parchment" size="sm" className="gap-1.5 shadow-md">
                  <LogIn className="w-3.5 h-3.5 text-[#173D2D]" />
                  <span>Sign In</span>
                </Button>
              </Link>
              <Link href="/register">
                <Button variant="primary" size="sm" className="gap-2 shadow-md">
                  <span>Register</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-6xl mx-auto px-6 py-14 flex-1 flex flex-col items-center text-center justify-center">
        {/* Hardware Plaque Badge */}
        <div className="skeuo-recessed px-4 py-1.5 rounded-full text-xs text-[#302013] mb-6 font-mono font-bold flex items-center gap-2 select-none border border-[#B58A4C]/70 shadow-[inset_0_2px_4px_rgba(36,23,15,0.3)]">
          <Terminal className="w-3.5 h-3.5 text-[#173D2D]" />
          <span>Multi-Modal Forensic Media Inspection Station</span>
        </div>

        <h1 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight max-w-4xl leading-tight text-[#F0DDB8] drop-shadow-[0_2px_4px_rgba(18,11,7,0.8)]">
          AI Deepfake, Voice Clone & <br />
          <span className="bg-gradient-to-r from-[#E5C995] via-[#D8B98A] to-[#B58A4C] bg-clip-text text-transparent">
            Synthetic Media Forensics
          </span>
        </h1>

        <p className="mt-5 text-base md:text-lg text-[#D8B98A] max-w-2xl leading-relaxed">
          Tactile forensic workstation for scrutinizing synthetic images, cloned speech, and manipulated video streams. Evidence-grounded analysis with calibrated certainty bounds.
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

        {/* Forensic Capabilities Grid */}
        <div className="mt-16 w-full text-left">
          <div className="mb-6 flex items-center justify-between border-b-2 border-[#B58A4C]/60 pb-3">
            <div>
              <h2 className="text-sm font-extrabold text-[#F0DDB8] uppercase tracking-wider font-mono">
                Forensic Pipeline Capabilities
              </h2>
              <p className="text-xs text-[#D8B98A]">
                Modular forensic implementations verified across multi-modal domains.
              </p>
            </div>
            <Badge variant="success">All Channels Online</Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {capabilities.map((cap, i) => {
              const Icon = cap.icon;
              return (
                <Card key={i} rivets={true} hoverEffect={true} className="p-2 sm:p-2.5">
                  <div className="flex items-start gap-3.5">
                    <Token color={cap.color} size="md">
                      <Icon className="w-5 h-5 text-white" />
                    </Token>
                    <div>
                      <h3 className="font-extrabold text-sm text-[#302013]">{cap.title}</h3>
                      <p className="text-xs text-[#604A34] leading-relaxed mt-1">{cap.desc}</p>
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
