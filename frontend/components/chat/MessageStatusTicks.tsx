"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { MessageDeliveryStatus } from "@/lib/types";

export default function MessageStatusTicks({ status }: { status: MessageDeliveryStatus }) {
  const color = status === "read" ? "#8ec4ff" : "currentColor";
  const showSecondTick = status === "delivered" || status === "read";
  // "sending"/"failed" are structurally different icons, so they get a full
  // icon-swap (remount) animation; sent -> delivered -> read stay the same SVG
  // and just animate the second checkmark's opacity + stroke color in place.
  const category = status === "sending" || status === "failed" ? status : "ticks";

  return (
    // Fixed-size box so swapping between the differently-sized clock (13×13)
    // and ticks (19×12) icons doesn't visibly jump — both render centered,
    // absolutely positioned, inside this stable frame. Default (non-"wait")
    // AnimatePresence mode lets the old icon fade out while the new one fades
    // in at the same time, a proper crossfade instead of a disappear-then-pop.
    <span className="relative inline-flex shrink-0" style={{ width: 19, height: 13 }}>
      <AnimatePresence initial={false}>
        {category === "sending" && (
          <motion.svg
            key="sending"
            className="absolute inset-0 m-auto"
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 0.7, scale: 1 }}
            exit={{ opacity: 0, scale: 0.7 }}
            transition={{ duration: 0.18 }}
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 3" />
          </motion.svg>
        )}
        {category === "failed" && (
          <motion.svg
            key="failed"
            className="absolute inset-0 m-auto"
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.7 }}
            transition={{ duration: 0.18 }}
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#ff6b6b"
            strokeWidth="2.5"
          >
            <circle cx="12" cy="12" r="9" />
            <path d="M12 8v5" />
            <path d="M12 16h.01" />
          </motion.svg>
        )}
        {category === "ticks" && (
          <motion.svg
            key="ticks"
            className="absolute inset-0 m-auto"
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.7 }}
            transition={{ duration: 0.18 }}
            width="19"
            height="12"
            viewBox="0 0 20 12"
            fill="none"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <motion.path animate={{ stroke: color }} transition={{ duration: 0.2 }} d="M1 6 L5 10 L13 2" />
            <motion.path
              animate={{ stroke: color, opacity: showSecondTick ? 1 : 0 }}
              transition={{ duration: 0.2 }}
              d="M7 6 L11 10 L19 2"
            />
          </motion.svg>
        )}
      </AnimatePresence>
    </span>
  );
}
