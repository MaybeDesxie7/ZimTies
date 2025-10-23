"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: form.email,
        password: form.password,
      });

      if (error) throw error;

      // Check email confirmation
      if (!data.user?.email_confirmed_at) {
        setError("Email not confirmed. Please check your inbox.");
        setLoading(false);
        return;
      }

      // Successful login
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Failed to log in.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-cover bg-center relative" style={{ backgroundImage: "url('/home.jpg')" }}>
      <div className="absolute inset-0 bg-black/50"></div>
      <div className="relative bg-white/30 backdrop-blur-lg border border-gray-300/50 p-10 rounded-3xl shadow-2xl w-full max-w-md">
        <h1 className="text-3xl font-extrabold text-center mb-6 bg-clip-text text-transparent bg-gradient-to-r from-green-600 via-yellow-400 to-red-600">
          Welcome Back 💕
        </h1>

        {error && <p className="text-red-500 text-center mb-4">{error}</p>}

        <form onSubmit={handleLogin} className="space-y-5">
          <input type="email" name="email" placeholder="Email Address" value={form.email} onChange={handleChange} className="w-full px-5 py-3 rounded-xl border border-gray-200/50" required />
          <input type="password" name="password" placeholder="Password" value={form.password} onChange={handleChange} className="w-full px-5 py-3 rounded-xl border border-gray-200/50" required />

          <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-green-600 via-yellow-400 to-red-600 text-white py-3 rounded-xl font-semibold shadow-lg">
            {loading ? "Logging In..." : "Log In"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-200">
          Don’t have an account? <a href="/signup" className="text-yellow-400 font-semibold hover:underline">Sign Up</a>
        </p>
      </div>
    </div>
  );
}
