"use client";
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001";

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!email || !password) {
      setError("Please fill in all fields.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Invalid email or password");
      }

      // Store token & user info
      localStorage.setItem("authToken", data.token);
      localStorage.setItem("userEmail", data.user.email);
      localStorage.setItem("userFullName", data.user.fullName || "");
      localStorage.setItem("userId", data.user.id);

      // Redirect to dashboard
      window.location.href = "/dashboard";
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#F8F4EE] px-4">
      <div className="w-full max-w-md bg-[#FFFDF9] border border-[#EFE7DD] rounded-xl p-8 shadow-lg space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-[#2F2F2F] tracking-wider">
            Smart<span className="text-[#8B5E3C]">ERP</span>
          </h1>
          <p className="text-sm text-[#2F2F2F]/70 mt-2">Sign in to your account</p>
        </div>

        {error && (
          <div className="p-3 bg-red-900/30 border border-red-500/30 text-red-600 text-sm rounded text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-[#2F2F2F]/90 block mb-1">Email Address</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@example.com"
              className="bg-[#F8F4EE] border-[#EFE7DD] text-[#2F2F2F] placeholder:text-[#2F2F2F]/50"
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium text-[#2F2F2F]/90 block mb-1">Password</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="bg-[#F8F4EE] border-[#EFE7DD] text-[#2F2F2F] placeholder:text-[#2F2F2F]/50"
              required
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-[#C68642] to-[#8B5E3C] hover:bg-[#C68642] text-[#FFFDF9] border-none py-2.5 rounded-full font-medium transition-colors"
          >
            {loading ? "Signing in..." : "Sign In"}
          </Button>
        </form>

        <div className="text-center text-sm text-[#2F2F2F]/70 pt-2 border-t border-[#EFE7DD]">
          Don't have an account?{" "}
          <Link href="/register" className="text-[#8B5E3C] hover:text-indigo-300 font-medium transition-colors">
            Register Here
          </Link>
        </div>
      </div>
    </div>
  );
}
