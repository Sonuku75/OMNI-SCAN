"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  Lock,
  Mail,
  ArrowRight,
  User,
  Eye,
  EyeOff,
  AlertCircle,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TextInput } from "@/components/ui/inputs";
import { ApiError } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@") || !cleanEmail.includes(".")) {
      setErrorMsg("Please enter a valid institutional email address.");
      return;
    }

    if (password.length < 8) {
      setErrorMsg("Password must be at least 8 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg("Passwords do not match.");
      return;
    }

    setIsLoading(true);

    try {
      await register({
        email: cleanEmail,
        password,
        full_name: fullName.trim() || undefined,
      });

      router.push("/dashboard");
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 409) {
          setErrorMsg(`An account with email '${cleanEmail}' is already registered.`);
        } else {
          setErrorMsg(err.message || "Registration failed. Please check parameters.");
        }
      } else {
        setErrorMsg("Unable to connect to authentication service. Please verify that the backend is running.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen wood-backdrop flex flex-col items-center justify-center p-4 selection:bg-[#B58A4C]/35">
      <div className="w-full max-w-md">
        <Card rivets={true} className="p-3 sm:p-4 shadow-2xl">
          <div className="space-y-6">
            {/* Header Shield & Wordmark */}
            <div className="text-center space-y-2 pb-4 border-b border-[#B58A4C]/35">
              <div className="mx-auto flex justify-center">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-b from-[#B58A4C] to-[#7A5B2E] border-2 border-[#E5C995] flex items-center justify-center text-[#F0DDB8] shadow-[0_4px_10px_rgba(18,11,7,0.5),inset_0_1px_1px_rgba(255,255,255,0.6)]">
                  <ShieldCheck className="w-7 h-7 text-[#24170F] drop-shadow-[0_1px_1px_rgba(255,255,255,0.7)]" />
                </div>
              </div>

              <div className="space-y-1">
                <h1 className="text-xl font-black tracking-tight text-[#302013] drop-shadow-[0_1px_1px_rgba(255,255,255,0.7)]">
                  Provision Analyst Workspace
                </h1>
                <p className="text-xs text-[#604A34]">
                  Create an isolated forensic account and credentials profile.
                </p>
              </div>
            </div>

            {/* Error Banner */}
            {errorMsg && (
              <div
                role="alert"
                className="p-3.5 rounded-xl bg-gradient-to-r from-[#C43E32] to-[#A9362B] border border-[#7A241B] text-[#FFF5F5] text-xs flex items-start gap-2.5 shadow-[inset_0_1px_1px_rgba(255,200,200,0.3)] animate-in fade-in"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-white" />
                <span className="font-semibold leading-relaxed">{errorMsg}</span>
              </div>
            )}

            {/* Register Form */}
            <form onSubmit={handleSubmit} className="space-y-3.5">
              <TextInput
                label="Analyst Name / Call-sign"
                type="text"
                placeholder="e.g. Lead Analyst Sarah Connor"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                leftIcon={<User className="w-4 h-4" />}
                disabled={isLoading}
              />

              <TextInput
                label="Institutional Email Address"
                type="email"
                required
                autoComplete="email"
                placeholder="analyst@domain.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                leftIcon={<Mail className="w-4 h-4" />}
                disabled={isLoading}
              />

              <TextInput
                label="Password (min. 8 characters)"
                type={showPassword ? "text" : "password"}
                required
                autoComplete="new-password"
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
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                }
                disabled={isLoading}
              />

              <TextInput
                label="Confirm Password"
                type={showPassword ? "text" : "password"}
                required
                autoComplete="new-password"
                placeholder="Repeat password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                leftIcon={<Lock className="w-4 h-4" />}
                disabled={isLoading}
              />

              <Button
                type="submit"
                variant="primary"
                className="w-full gap-2 py-2.5 mt-2 shadow-md text-sm"
                isLoading={isLoading}
              >
                <span>{isLoading ? "Provisioning Workspace..." : "Create Analyst Account"}</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </form>

            {/* Back to Login */}
            <div className="pt-3 border-t border-[#B58A4C]/35 text-center text-xs text-[#604A34]">
              <span>Already registered? </span>
              <Link
                href="/login"
                className="text-[#173D2D] hover:text-[#28734A] hover:underline font-bold"
              >
                Sign in to station
              </Link>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
