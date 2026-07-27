"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { searchGifs, type GifResult } from "@/lib/gifs";
import { STICKER_PACKS } from "@/lib/stickers";
import { REACTION_EMOJIS } from "@/lib/format";

const EMOJI_GRID = [
  "😀", "😁", "😂", "🤣", "😊", "😍", "🥰", "😘", "😜", "🤪", "🤨", "🧐",
  "😎", "🥳", "😏", "😢", "😭", "😤", "😡", "🤯", "😱", "🥵", "🥶", "😴",
  "🤤", "😷", "🤒", "🤢", "🤮", "🥴", "😇", "🤠", "🥸", "🤓", "😈", "👻",
  "💀", "👽", "🤖", "🎃", "😺", "😹", "😻", "🙀", "👍", "👎", "👏", "🙌",
  "🙏", "🤝", "💪", "✌️", "🤞", "👋", "🫶", "❤️", "🧡", "💛", "💚", "💙",
  "💜", "🖤", "🤍", "💔", "❣️", "💕", "💞", "🔥", "✨", "🎉", "🎊", "💯",
  "⚡", "💥", "🌟", "🌈", "☀️", "🌙", "⭐", "☁️", "🌸", "🌺", "🍀", "🎈",
  ...REACTION_EMOJIS,
].filter((v, i, arr) => arr.indexOf(v) === i);

type Tab = "emoji" | "stickers" | "gifs";

const containerVariants = {
  hidden: { opacity: 0, scale: 0.92, y: 8 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 320, damping: 30, mass: 1, staggerChildren: 0.008 },
  },
  exit: { opacity: 0, scale: 0.95, y: 4, transition: { duration: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, scale: 0.3 },
  visible: { opacity: 1, scale: 1, transition: { type: "spring" as const, stiffness: 500, damping: 16 } },
};

interface Props {
  onPickEmoji: (emoji: string) => void;
  onPickSticker: (emoji: string) => void;
  onPickGif: (gif: GifResult) => void;
  onClose: () => void;
}

export default function EmojiGifStickerPicker({ onPickEmoji, onPickSticker, onPickGif, onClose }: Props) {
  const [tab, setTab] = useState<Tab>("emoji");
  const [stickerQuery, setStickerQuery] = useState("");
  const [gifQuery, setGifQuery] = useState("");
  const [gifResults, setGifResults] = useState<GifResult[]>([]);
  const [gifsAvailable, setGifsAvailable] = useState(true);
  const [loadingGifs, setLoadingGifs] = useState(false);

  useEffect(() => {
    if (tab !== "gifs") return;
    let cancelled = false;
    // Direct response to the tab/query changing (kicking off a debounced search),
    // not a render-cascade concern.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoadingGifs(true);
    const t = setTimeout(async () => {
      try {
        const { available, results } = await searchGifs(gifQuery);
        if (!cancelled) {
          setGifsAvailable(available);
          setGifResults(results);
        }
      } catch {
        if (!cancelled) {
          setGifsAvailable(false);
          setGifResults([]);
        }
      } finally {
        if (!cancelled) setLoadingGifs(false);
      }
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [tab, gifQuery]);

  const filteredPacks = STICKER_PACKS.map((pack) => ({
    ...pack,
    stickers: stickerQuery.trim() && !pack.name.toLowerCase().includes(stickerQuery.trim().toLowerCase())
      ? []
      : pack.stickers,
  })).filter((pack) => pack.stickers.length > 0);

  return (
    <>
      <div className="fixed inset-0 z-10" onClick={onClose} />
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        className="fixed inset-x-2 bottom-16 sm:absolute sm:inset-x-auto sm:bottom-12 sm:right-0 z-20 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl shadow-lg w-auto sm:w-80 flex flex-col overflow-hidden"
        style={{ height: 360, maxHeight: "60vh" }}
      >
        <div className="flex items-center gap-1 px-2 pt-2">
          {(["emoji", "stickers", "gifs"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 text-sm font-medium py-1.5 rounded-full capitalize transition ${
                tab === t
                  ? "bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)]"
                  : "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)]/60"
              }`}
            >
              {t === "gifs" ? "GIFs" : t}
            </button>
          ))}
        </div>

        {tab === "stickers" && (
          <div className="px-3 pt-2">
            <div className="flex items-center gap-2 bg-[var(--color-bg-tertiary)] rounded-lg px-2.5 py-1.5">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--color-text-secondary)] shrink-0">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              <input
                autoFocus
                value={stickerQuery}
                onChange={(e) => setStickerQuery(e.target.value)}
                placeholder="Search stickers"
                className="flex-1 bg-transparent text-xs outline-none text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)]"
              />
            </div>
          </div>
        )}

        {tab === "gifs" && (
          <div className="px-3 pt-2">
            <div className="flex items-center gap-2 bg-[var(--color-bg-tertiary)] rounded-lg px-2.5 py-1.5">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--color-text-secondary)] shrink-0">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              <input
                autoFocus
                value={gifQuery}
                onChange={(e) => setGifQuery(e.target.value)}
                placeholder="Search GIFs"
                className="flex-1 bg-transparent text-xs outline-none text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)]"
              />
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-3 py-2">
          <AnimatePresence mode="wait">
            {tab === "emoji" && (
              <motion.div
                key="emoji"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="grid grid-cols-7 gap-0.5"
              >
                {EMOJI_GRID.map((emoji) => (
                  <motion.button
                    key={emoji}
                    variants={itemVariants}
                    whileHover={{ scale: 1.2 }}
                    whileTap={{ scale: 1.4 }}
                    onClick={() => onPickEmoji(emoji)}
                    className="text-xl leading-none p-1.5 rounded-lg hover:bg-[var(--color-bg-tertiary)]"
                  >
                    {emoji}
                  </motion.button>
                ))}
              </motion.div>
            )}

            {tab === "stickers" && (
              <motion.div key="stickers" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {filteredPacks.length === 0 && (
                  <p className="text-xs text-[var(--color-text-secondary)] text-center py-6">No sticker packs found.</p>
                )}
                {filteredPacks.map((pack) => (
                  <div key={pack.name} className="mb-3">
                    <p className="text-xs font-semibold text-[var(--color-text-secondary)] mb-1">{pack.name}</p>
                    <motion.div
                      variants={containerVariants}
                      initial="hidden"
                      animate="visible"
                      className="grid grid-cols-6 gap-1"
                    >
                      {pack.stickers.map((sticker, i) => (
                        <motion.button
                          key={`${pack.name}-${i}`}
                          variants={itemVariants}
                          whileHover={{ scale: 1.15 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => onPickSticker(sticker)}
                          className="text-3xl leading-none p-1.5 rounded-lg hover:bg-[var(--color-bg-tertiary)]"
                        >
                          {sticker}
                        </motion.button>
                      ))}
                    </motion.div>
                  </div>
                ))}
              </motion.div>
            )}

            {tab === "gifs" && (
              <motion.div key="gifs" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {!gifsAvailable && (
                  <p className="text-xs text-[var(--color-text-secondary)] text-center py-6 px-2">
                    GIF search is currently unavailable (the shared demo API key is rate-limited). Set a real{" "}
                    <code className="text-[10px]">GIPHY_API_KEY</code> on the backend to enable it.
                  </p>
                )}
                {gifsAvailable && loadingGifs && (
                  <p className="text-xs text-[var(--color-text-secondary)] text-center py-6">Loading…</p>
                )}
                {gifsAvailable && !loadingGifs && gifResults.length === 0 && (
                  <p className="text-xs text-[var(--color-text-secondary)] text-center py-6">No GIFs found.</p>
                )}
                {gifsAvailable && !loadingGifs && gifResults.length > 0 && (
                  <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className="grid grid-cols-2 gap-1.5"
                  >
                    {gifResults.map((gif) => (
                      <motion.button
                        key={gif.id}
                        variants={itemVariants}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => onPickGif(gif)}
                        className="rounded-lg overflow-hidden bg-[var(--color-bg-tertiary)] aspect-video"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element -- external animated GIF preview, not a Next-optimizable asset */}
                        <img src={gif.previewUrl} alt={gif.title} className="w-full h-full object-cover" />
                      </motion.button>
                    ))}
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </>
  );
}
