"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ShieldAlert,
  Lock,
  Mail,
  ArrowRight,
  Eye,
  EyeOff,
  AlertCircle,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TextInput, Checkbox } from "@/components/ui/inputs";
import { ApiError } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTarget = searchParams.get("redirect") || "/dashboard";
  const { login, isAuthenticated, isLoading: authLoading } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedEmail = localStorage.getItem("omniscan_remember_email");
      if (savedEmail) {
        setEmail(savedEmail);
        setRememberMe(true);
      }
    }
  }, []);

  // Redirect if already authenticated
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.push(redirectTarget);
    }
  }, [authLoading, isAuthenticated, router, redirectTarget]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password) {
      setErrorMsg("Please enter both email and password.");
      return;
    }

    if (!cleanEmail.includes("@") || !cleanEmail.includes(".")) {
      setErrorMsg("Please enter a valid institutional email address.");
      return;
    }

    setIsSubmitting(true);

    try {
      await login({ email: cleanEmail, password });

      if (rememberMe) {
        localStorage.setItem("omniscan_remember_email", cleanEmail);
      } else {
        localStorage.removeItem("omniscan_remember_email");
      }

      router.push(redirectTarget);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 401) {
          setErrorMsg("Invalid email or password. Please verify your credentials.");
        } else if (err.status === 403) {
          setErrorMsg("Account is inactive or disabled. Contact system administrator.");
        } else {
          setErrorMsg(err.message || "Authentication failed. Please check credentials.");
        }
      } else {
        setErrorMsg("Unable to connect to authentication service. Please verify that the backend is running at http://localhost:8000.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      <Card rivets={true} className="p-3 sm:p-4 shadow-2xl">
        <div className="space-y-6">
          {/* Header Shield & Wordmark */}
          <div className="text-center space-y-2 pb-4 border-b border-[#B58A4C]/35">
            <div className="mx-auto flex justify-center">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-b from-[#28734A] to-[#173D2D] border-2 border-[#B58A4C] flex items-center justify-center text-[#F0DDB8] shadow-[0_4px_10px_rgba(18,11,7,0.5),inset_0_1px_1px_rgba(229,201,149,0.5)]">
                <ShieldAlert className="w-7 h-7 text-[#E5C995] drop-shadow-[0_0_6px_rgba(229,201,149,0.6)]" />
              </div>
            </div>

            <div className="space-y-1">
              <h1 className="text-xl font-black tracking-tight text-[#302013] drop-shadow-[0_1px_1px_rgba(255,255,255,0.7)]">
                Sign in to OmniScan
              </h1>
              <p className="text-xs text-[#604A34]">
                Access your media analysis workspace.
              </p>
            </div>
          </div>

          {/* Error Message Alert */}
          {errorMsg && (
            <div
              role="alert"
              className="p-3.5 rounded-xl bg-gradient-to-r from-[#C43E32] to-[#A9362B] border border-[#7A241B] text-[#FFF5F5] text-xs flex items-start gap-2.5 shadow-[inset_0_1px_1px_rgba(255,200,200,0.3)] animate-in fade-in"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-white" />
              <span className="font-semibold leading-relaxed">{errorMsg}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <TextInput
              label="Analyst Email"
              type="email"
              required
              autoComplete="email"
              placeholder="analyst@omniscan.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              leftIcon={<Mail className="w-4 h-4" />}
              disabled={isSubmitting}
            />

            <TextInput
              label="Password"
              type={showPassword ? "text" : "password"}
              required
              autoComplete="current-password"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              leftIcon={<Lock className="w-4 h-4" />}
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="p-1 text-[#604A34] hover:text-[#302013] transition-colors focus:outline-none cursor-pointer"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              }
              disabled={isSubmitting}
            />

            <div className="flex items-center justify-between pt-1">
              <Checkbox
                label="Remember email on this machine"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                disabled={isSubmitting}
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              className="w-full gap-2 py-2.5 mt-2 shadow-md text-sm"
              isLoading={isSubmitting}
            >
              <span>{isSubmitting ? "Authenticating..." : "Sign in"}</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </form>

          {/* Registration Link (Only because registration is supported in backend) */}
          <div className="pt-3 border-t border-[#B58A4C]/35 text-center text-xs text-[#604A34]">
            <span>Need an analyst workspace? </span>
            <Link
              href="/register"
              className="text-[#173D2D] hover:text-[#28734A] hover:underline font-bold"
            >
              Create account
            </Link>
          </div>

          {/* Discreet Privacy & Security Notice */}
          <div className="p-2.5 rounded-lg skeuo-recessed text-[11px] text-[#604A34] leading-relaxed flex items-center gap-2 border border-[#B58A4C]/60">
            <ShieldCheck className="w-4 h-4 text-[#28734A] shrink-0" />
            <span>
              Access to forensic inspection logs and media storage is restricted to authorized analysts.
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen wood-backdrop flex flex-col items-center justify-center p-4 selection:bg-[#B58A4C]/35">
      <Suspense
        fallback={
          <div className="p-8 text-center text-xs font-mono font-bold text-[#F0DDB8] flex items-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-[#E5C995]" />
            <span>Loading station interface...</span>
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </div>
  );
}
