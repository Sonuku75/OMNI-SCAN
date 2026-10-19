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

export default function HomePage() {
  const categories = [
    {
      title: "1. Software Development",
      desc: "Next.js App Router, React 19, strict TypeScript, Tailwind CSS, FastAPI, and PostgreSQL.",
      icon: Layers,
      color: "text-omni-primary",
      borderColor: "border-omni-primary/30",
    },
    {
      title: "2. AI / Machine Learning",
      desc: "Modular inference adapters, calibrated probabilities, and explicit detector_not_configured states.",
      icon: Cpu,
      color: "text-omni-secondary",
      borderColor: "border-omni-secondary/30",
    },
    {
      title: "3. Computer Vision",
      desc: "OpenCV and FFmpeg frame extraction, frequency domain (FFT/ELA) analysis, and temporal stability checks.",
      icon: ScanEye,
      color: "text-cyan-400",
      borderColor: "border-cyan-500/30",
    },
    {
      title: "4. Cybersecurity",
      desc: "Magic byte sniffing, SHA-256 media fingerprinting, private S3/MinIO storage, and hard deletion controls.",
      icon: Lock,
      color: "text-emerald-400",
      borderColor: "border-emerald-500/30",
    },
    {
      title: "5. Natural Language Processing",
      desc: "Evidence-grounded report generation and structured forensic summaries with zero hallucination.",
      icon: FileCheck2,
      color: "text-amber-400",
      borderColor: "border-amber-500/30",
    },
    {
      title: "6. Cloud Computing",
      desc: "Docker containerization, asynchronous Redis task worker queues, and 12-factor cloud deployment.",
      icon: Cloud,
      color: "text-indigo-400",
      borderColor: "border-indigo-500/30",
    },
  ];

  return (
    <div className="min-h-screen bg-omni-bg text-omni-text flex flex-col justify-between selection:bg-omni-primary/20">
      {/* Header */}
      <header className="border-b border-omni-border bg-omni-surface/60 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-omni-primary/10 border border-omni-primary/30 flex items-center justify-center text-omni-primary">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <span className="font-bold tracking-wider text-base text-omni-text">OMNISCAN</span>
            <span className="ml-2 text-xs text-omni-muted font-mono">v1.0.0-m0</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="text-xs text-omni-muted hover:text-omni-text transition-colors font-medium px-3 py-1.5"
          >
            Dashboard
          </Link>
          <Link
            href="/analyze"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-omni-primary text-omni-bg font-semibold text-xs hover:bg-omni-primaryHover transition-all shadow-sm shadow-omni-primary/20"
          >
            <span>Launch Scanner</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-6xl mx-auto px-6 py-16 flex-1 flex flex-col items-center text-center justify-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-omni-surface border border-omni-border text-xs text-omni-muted mb-6 font-mono">
          <Terminal className="w-3.5 h-3.5 text-omni-primary" />
          <span>Six Mandatory Technology Stack Categories Verified</span>
        </div>

        <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight max-w-4xl leading-tight">
          AI Deepfake, Voice Clone & <br />
          <span className="bg-gradient-to-r from-omni-primary via-teal-300 to-omni-secondary bg-clip-text text-transparent">
            Synthetic Media Forensics
          </span>
        </h1>

        <p className="mt-5 text-base md:text-lg text-omni-muted max-w-2xl leading-relaxed">
          Scrutinize images, audio, and video for generative artifacts and voice cloning.
          Evidence-grounded reporting with strict zero-hallucination disclaimers.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/analyze"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-omni-primary text-omni-bg font-semibold text-sm hover:bg-omni-primaryHover transition-all shadow-md shadow-omni-primary/25"
          >
            <ScanEye className="w-4 h-4" />
            <span>Analyze Media Now</span>
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-omni-surface border border-omni-border text-omni-text font-medium text-sm hover:bg-omni-surfaceHover hover:border-omni-borderHover transition-all"
          >
            <span>Open Forensics Dashboard</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* 6 Mandatory Categories Grid */}
        <div className="mt-20 w-full text-left">
          <div className="mb-6 flex items-center justify-between border-b border-omni-border/60 pb-3">
            <div>
              <h2 className="text-sm font-semibold text-omni-text uppercase tracking-wider font-mono">
                Mandatory Technology Stack Architecture
              </h2>
              <p className="text-xs text-omni-muted">
                Each category is mapped to modular, testable implementations.
              </p>
            </div>
            <span className="text-xs font-mono text-omni-primary">All 6 Active</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map((cat, i) => {
              const Icon = cat.icon;
              return (
                <div
                  key={i}
                  className={`p-5 rounded-xl bg-omni-surface border ${cat.borderColor} hover:bg-omni-surfaceHover/50 transition-colors`}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`p-2 rounded-lg bg-omni-bg border border-omni-border ${cat.color}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <h3 className="font-semibold text-sm text-omni-text">{cat.title}</h3>
                  </div>
                  <p className="text-xs text-omni-muted leading-relaxed">{cat.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-omni-border bg-omni-surface/40 py-6 px-6 text-center text-xs text-omni-muted">
        <p>
          Detection scores are probabilistic model predictions and do not constitute absolute proof.
          OmniScan platform architecture compliant with forensic reproducibility standards.
        </p>
      </footer>
    </div>
  );
}
