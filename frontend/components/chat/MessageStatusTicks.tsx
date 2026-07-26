import type { MessageDeliveryStatus } from "@/lib/types";

export default function MessageStatusTicks({ status }: { status: MessageDeliveryStatus }) {
  if (status === "sending") {
    return (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="opacity-70">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 3" />
      </svg>
    );
  }
  if (status === "failed") {
    return (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#ff6b6b" strokeWidth="2.5">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 8v5" />
        <path d="M12 16h.01" />
      </svg>
    );
  }

  const color = status === "read" ? "#8ec4ff" : "currentColor";

  if (status === "sent") {
    return (
      <svg width="15" height="12" viewBox="0 0 16 12" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 6 L6 10 L14 2" />
      </svg>
    );
  }

  return (
    <svg width="19" height="12" viewBox="0 0 20 12" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 6 L5 10 L13 2" />
      <path d="M7 6 L11 10 L19 2" />
    </svg>
  );
}
