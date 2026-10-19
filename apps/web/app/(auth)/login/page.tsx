"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShieldAlert, Lock, Mail, ArrowRight } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("analyst@omniscan.local");
  const [password, setPassword] = useState("••••••••••••");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      router.push("/dashboard");
    }, 600);
  };

  return (
    <div className="min-h-screen bg-omni-bg flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-6 sm:p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-omni-primary/10 border border-omni-primary/30 flex items-center justify-center text-omni-primary mx-auto">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-omni-text">
            OmniScan Analyst Access
          </h1>
          <p className="text-xs text-omni-muted">
            Authenticate to access synthetic media forensic investigation tools.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-omni-text block">Analyst Email</label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-3 text-omni-muted" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-lg bg-omni-bg border border-omni-border text-xs text-omni-text focus:outline-none focus:border-omni-primary font-mono"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-omni-text block">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-3 text-omni-muted" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-lg bg-omni-bg border border-omni-border text-xs text-omni-text focus:outline-none focus:border-omni-primary font-mono"
              />
            </div>
          </div>

          <Button type="submit" className="w-full gap-2" isLoading={isLoading}>
            <span>Sign In to Dashboard</span>
            <ArrowRight className="w-4 h-4" />
          </Button>
        </form>

        <div className="pt-2 text-center text-xs text-omni-muted">
          <span>New forensic analyst? </span>
          <Link href="/register" className="text-omni-primary hover:underline font-medium">
            Register workspace
          </Link>
        </div>
      </Card>
    </div>
  );
}
