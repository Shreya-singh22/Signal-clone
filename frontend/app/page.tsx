"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/store";

export default function Home() {
  const { user, authLoading } = useApp();
  const router = useRouter();

  useEffect(() => {
    if (authLoading) return;
    router.replace(user ? "/chat" : "/login");
  }, [authLoading, user, router]);

  return (
    <div className="h-full flex items-center justify-center bg-[var(--color-bg)]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-14 h-14 rounded-2xl bg-[var(--color-signal-blue)] flex items-center justify-center text-white text-2xl font-bold">
          S
        </div>
        <p className="text-sm text-[var(--color-text-secondary)]">Loading Signal…</p>
      </div>
    </div>
  );
}
