"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatPhoneInput, stripPhoneFormatting } from "@/lib/format";
import { useApp, ApiError } from "@/lib/store";

const DEMO_ACCOUNTS = [
  { name: "Alice", phone: "+919876543201" },
  { name: "Bob", phone: "+919876543202" },
  { name: "Carol", phone: "+919876543203" },
  { name: "Dave", phone: "+919876543204" },
  { name: "Erin", phone: "+919876543205" },
];

export default function LoginPage() {
  const { login } = useApp();
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(stripPhoneFormatting(identifier.trim()), password);
      router.replace("/chat");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  function fillDemo(phone: string) {
    setIdentifier(formatPhoneInput(phone));
    setPassword("password123");
  }

  return (
    <div className="h-full flex items-center justify-center bg-[var(--color-bg-secondary)] px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-3xl bg-[var(--color-signal-blue)] flex items-center justify-center text-white text-3xl font-bold mb-4 shadow-lg shadow-blue-500/20">
            S
          </div>
          <h1 className="text-2xl font-semibold text-[var(--color-text-primary)]">Signam</h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">Simple. Private. Yours.</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-2xl p-6 shadow-sm flex flex-col gap-4"
        >
          <div>
            <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">
              Phone number
            </label>
            <input
              autoFocus
              value={identifier}
              onChange={(e) => setIdentifier(formatPhoneInput(e.target.value))}
              className="w-full rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2.5 text-sm outline-none focus:border-[var(--color-signal-blue)] transition"
              placeholder="+91 98765 43210"
              required
            />
            <p className="text-xs text-[var(--color-text-secondary)] mt-1.5">
              You can also sign in with your @username.
            </p>
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
              required
            />
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="mt-1 rounded-lg bg-[var(--color-signal-blue)] text-white text-sm font-medium py-2.5 hover:bg-[var(--color-signal-blue-dark)] transition disabled:opacity-60"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <div className="mt-4 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-2xl p-4">
          <p className="text-xs text-[var(--color-text-secondary)] mb-2">
            Demo accounts (password: password123)
          </p>
          <div className="flex flex-wrap gap-2">
            {DEMO_ACCOUNTS.map((account) => (
              <button
                key={account.phone}
                onClick={() => fillDemo(account.phone)}
                type="button"
                className="text-xs px-2.5 py-1 rounded-full bg-[var(--color-bg-tertiary)] hover:opacity-80 transition"
              >
                {account.name}
              </button>
            ))}
          </div>
        </div>

        <p className="text-center text-sm text-[var(--color-text-secondary)] mt-6">
          New to Signam?{" "}
          <Link href="/register" className="text-[var(--color-signal-blue)] font-medium">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
