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
    <AnimatePresence mode="wait" initial={false}>
      {category === "sending" && (
        <motion.svg
          key="sending"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 0.7, scale: 1 }}
          exit={{ opacity: 0, scale: 0.5 }}
          transition={{ duration: 0.1 }}
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
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.5 }}
          transition={{ duration: 0.1 }}
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
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.5 }}
          transition={{ duration: 0.1 }}
          width="19"
          height="12"
          viewBox="0 0 20 12"
          fill="none"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <motion.path animate={{ stroke: color }} transition={{ duration: 0.15 }} d="M1 6 L5 10 L13 2" />
          <motion.path
            animate={{ stroke: color, opacity: showSecondTick ? 1 : 0 }}
            transition={{ duration: 0.15 }}
            d="M7 6 L11 10 L19 2"
          />
        </motion.svg>
      )}
    </AnimatePresence>
  );
}
