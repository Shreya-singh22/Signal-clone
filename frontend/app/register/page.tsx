"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { useApp } from "@/lib/store";

const AVATAR_COLORS = [
  "#2C6BED", "#3AA3E3", "#D0895F", "#6C63C7", "#4CAF7D", "#E0A030", "#E35D6A", "#8854D0",
];
const AVATAR_EMOJIS = ["🙂", "😎", "🌟", "🚀", "🎧", "📚", "🌿", "🎨", "🧑‍💻", "🐱", "☕", "⚡"];

type Step = "phone" | "otp" | "profile";

export default function RegisterPage() {
  const { setSession } = useApp();
  const router = useRouter();
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("+91");
  const [devOtp, setDevOtp] = useState("");
  const [otp, setOtp] = useState("");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [avatarColor, setAvatarColor] = useState(AVATAR_COLORS[0]);
  const [avatarEmoji, setAvatarEmoji] = useState(AVATAR_EMOJIS[0]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function requestOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api.requestOtp(phone.trim());
      setDevOtp(res.dev_otp);
      setOtp(res.dev_otp);
      setStep("otp");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  function confirmOtp(e: React.FormEvent) {
    e.preventDefault();
    setStep("profile");
  }

  async function completeRegistration(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api.register({
        phone_number: phone.trim(),
        otp,
        username: username.trim(),
        display_name: displayName.trim(),
        password,
        avatar_color: avatarColor,
        avatar_emoji: avatarEmoji,
      });
      setSession(res.token, res.user);
      router.replace("/chat");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="h-full flex items-center justify-center bg-[var(--color-bg-secondary)] px-4 overflow-y-auto py-8">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-6">
          <div className="w-16 h-16 rounded-3xl bg-[var(--color-signal-blue)] flex items-center justify-center text-white text-3xl font-bold mb-4 shadow-lg shadow-blue-500/20">
            S
          </div>
          <h1 className="text-2xl font-semibold text-[var(--color-text-primary)]">Create your account</h1>
          <div className="flex gap-1.5 mt-3">
            {(["phone", "otp", "profile"] as Step[]).map((s) => (
              <span
                key={s}
                className={`h-1.5 w-8 rounded-full ${
                  step === s ? "bg-[var(--color-signal-blue)]" : "bg-[var(--color-bg-tertiary)]"
                }`}
              />
            ))}
          </div>
        </div>

        <div className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-2xl p-6 shadow-sm">
          {step === "phone" && (
            <form onSubmit={requestOtp} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">
                  Phone number
                </label>
                <input
                  autoFocus
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2.5 text-sm outline-none focus:border-[var(--color-signal-blue)] transition"
                  placeholder="+91 98765 43210"
                  required
                />
                <p className="text-xs text-[var(--color-text-secondary)] mt-1.5">
                  We&apos;ll send a verification code. This is mocked for the demo.
                </p>
              </div>
              {error && <p className="text-xs text-red-500">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="rounded-lg bg-[var(--color-signal-blue)] text-white text-sm font-medium py-2.5 hover:bg-[var(--color-signal-blue-dark)] transition disabled:opacity-60"
              >
                {loading ? "Sending code…" : "Send code"}
              </button>
            </form>
          )}

          {step === "otp" && (
            <form onSubmit={confirmOtp} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">
                  Enter verification code
                </label>
                <input
                  autoFocus
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="w-full rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2.5 text-sm text-center tracking-[0.5em] outline-none focus:border-[var(--color-signal-blue)] transition"
                  maxLength={6}
                  required
                />
                <p className="text-xs text-[var(--color-text-secondary)] mt-1.5">
                  Demo code auto-filled: <span className="font-mono">{devOtp}</span>
                </p>
              </div>
              <button
                type="submit"
                className="rounded-lg bg-[var(--color-signal-blue)] text-white text-sm font-medium py-2.5 hover:bg-[var(--color-signal-blue-dark)] transition"
              >
                Verify
              </button>
              <button
                type="button"
                onClick={() => setStep("phone")}
                className="text-xs text-[var(--color-text-secondary)] hover:underline"
              >
                Use a different number
              </button>
            </form>
          )}

          {step === "profile" && (
            <form onSubmit={completeRegistration} className="flex flex-col gap-4">
              <div className="flex justify-center">
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center text-3xl"
                  style={{ backgroundColor: avatarColor }}
                >
                  {avatarEmoji}
                </div>
              </div>
              <div className="flex justify-center gap-1.5 flex-wrap">
                {AVATAR_COLORS.map((c) => (
                  <button
                    type="button"
                    key={c}
                    onClick={() => setAvatarColor(c)}
                    className={`w-6 h-6 rounded-full ${avatarColor === c ? "ring-2 ring-offset-2 ring-[var(--color-signal-blue)] ring-offset-[var(--color-bg)]" : ""}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
              <div className="flex justify-center gap-1.5 flex-wrap">
                {AVATAR_EMOJIS.map((em) => (
                  <button
                    type="button"
                    key={em}
                    onClick={() => setAvatarEmoji(em)}
                    className={`w-8 h-8 rounded-full text-base flex items-center justify-center hover:bg-[var(--color-bg-tertiary)] ${avatarEmoji === em ? "bg-[var(--color-bg-tertiary)]" : ""}`}
                  >
                    {em}
                  </button>
                ))}
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">
                  Display name
                </label>
                <input
                  autoFocus
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2.5 text-sm outline-none focus:border-[var(--color-signal-blue)] transition"
                  placeholder="Jane Doe"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">
                  Username
                </label>
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                  className="w-full rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2.5 text-sm outline-none focus:border-[var(--color-signal-blue)] transition"
                  placeholder="janedoe"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2.5 text-sm outline-none focus:border-[var(--color-signal-blue)] transition"
                  placeholder="••••••••"
                  minLength={4}
                  required
                />
              </div>
              {error && <p className="text-xs text-red-500">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="rounded-lg bg-[var(--color-signal-blue)] text-white text-sm font-medium py-2.5 hover:bg-[var(--color-signal-blue-dark)] transition disabled:opacity-60"
              >
                {loading ? "Creating account…" : "Create account"}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-sm text-[var(--color-text-secondary)] mt-6">
          Already have an account?{" "}
          <Link href="/login" className="text-[var(--color-signal-blue)] font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
