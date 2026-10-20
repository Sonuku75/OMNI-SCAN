"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShieldCheck, Lock, Mail, ArrowRight, User, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Token } from "@/components/ui/token";
import { apiClient, ApiError } from "@/lib/api-client";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsLoading(true);

    try {
      await apiClient.register({
        email,
        password,
        full_name: fullName.trim() || undefined,
      });
      router.push("/dashboard");
    } catch (err) {
      if (err instanceof ApiError) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg("Failed to connect to authentication service. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#24170F] flex items-center justify-center p-4 selection:bg-[#B58A4C]/20">
      <div className="w-full max-w-md">
        <Card rivets={true} className="p-3 sm:p-4">
          <div className="space-y-6">
            {/* Header Plate */}
            <div className="text-center space-y-2 pb-4 border-b border-[#B58A4C]/35">
              <div className="mx-auto flex justify-center">
                <Token color="bronze" size="lg">
                  <ShieldCheck className="w-7 h-7 text-white" />
                </Token>
              </div>
              <h1 className="text-xl font-black tracking-tight text-[#24170F] drop-shadow-[0_1px_1px_rgba(255,255,255,0.7)]">
                PROVISION ANALYST WORKSPACE
              </h1>
              <p className="text-xs text-[#664830]">
                Establish an isolated forensic workstation credentials profile.
              </p>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-gradient-to-r from-[#C43E32] to-[#A9362B] border border-[#7A241B] text-[#FFF5F5] text-xs flex items-start gap-2 shadow-[inset_0_1px_1px_rgba(255,200,200,0.3)]">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-white" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#24170F] block">
                  Analyst Name / Call-sign
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-3 text-[#664830]" />
                  <input
                    type="text"
                    placeholder="e.g. Lead Analyst Jane Doe"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-lg bg-[#D8B98A]/50 border border-[#B58A4C] text-xs font-semibold text-[#24170F] placeholder-[#664830]/70 focus:outline-none focus:border-[#28734A] shadow-[inset_0_2px_4px_rgba(36,23,15,0.2)]"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#24170F] block">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-3 text-[#664830]" />
                  <input
                    type="email"
                    required
                    placeholder="analyst@domain.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-lg bg-[#D8B98A]/50 border border-[#B58A4C] text-xs font-semibold text-[#24170F] placeholder-[#664830]/70 focus:outline-none focus:border-[#28734A] shadow-[inset_0_2px_4px_rgba(36,23,15,0.2)] font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#24170F] block">Password (min 8 characters)</label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-3 text-[#664830]" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-lg bg-[#D8B98A]/50 border border-[#B58A4C] text-xs font-semibold text-[#24170F] placeholder-[#664830]/70 focus:outline-none focus:border-[#28734A] shadow-[inset_0_2px_4px_rgba(36,23,15,0.2)] font-mono"
                  />
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                className="w-full gap-2 py-2.5 mt-2 shadow-md"
                isLoading={isLoading}
              >
                <span>Create Workspace</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </form>

            <div className="pt-3 border-t border-[#B58A4C]/35 text-center text-xs text-[#664830]">
              <span>Already registered? </span>
              <Link href="/login" className="text-[#173D2D] hover:text-[#28734A] hover:underline font-bold">
                Sign in to station
              </Link>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
