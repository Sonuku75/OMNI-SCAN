"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShieldCheck, Lock, Mail, ArrowRight, User } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [organization, setOrganization] = useState("");
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
          <div className="w-12 h-12 rounded-xl bg-omni-secondary/10 border border-omni-secondary/30 flex items-center justify-center text-omni-secondary mx-auto">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-omni-text">
            Register Analyst Workspace
          </h1>
          <p className="text-xs text-omni-muted">
            Provision an isolated workspace for forensic media review.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-omni-text block">Organization / Unit</label>
            <div className="relative">
              <User className="w-4 h-4 absolute left-3 top-3 text-omni-muted" />
              <input
                type="text"
                required
                placeholder="e.g. Media Integrity Lab"
                value={organization}
                onChange={(e) => setOrganization(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-lg bg-omni-bg border border-omni-border text-xs text-omni-text focus:outline-none focus:border-omni-primary"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-omni-text block">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-3 text-omni-muted" />
              <input
                type="email"
                required
                placeholder="analyst@domain.com"
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
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-lg bg-omni-bg border border-omni-border text-xs text-omni-text focus:outline-none focus:border-omni-primary font-mono"
              />
            </div>
          </div>

          <Button type="submit" className="w-full gap-2" isLoading={isLoading}>
            <span>Create Workspace</span>
            <ArrowRight className="w-4 h-4" />
          </Button>
        </form>

        <div className="pt-2 text-center text-xs text-omni-muted">
          <span>Already have an account? </span>
          <Link href="/login" className="text-omni-primary hover:underline font-medium">
            Sign in
          </Link>
        </div>
      </Card>
    </div>
  );
}
