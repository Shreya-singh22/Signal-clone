/**
 * Sticker packs. There's no custom sticker artwork in this project, so each
 * "sticker" is a single emoji rendered large — sent as a standalone message
 * the same way a lone emoji renders big or a real sticker would (no bubble
 * chrome), rather than pretending these are licensed sticker art.
 */
export interface StickerPack {
  name: string;
  stickers: string[];
}

export const STICKER_PACKS: StickerPack[] = [
  {
    name: "Mood Pack",
    stickers: ["😎", "🥳", "😭", "🤯", "😴", "🥲", "😇", "🫡", "🙃", "😤", "🤩", "🫠"],
  },
  {
    name: "Reactions",
    stickers: ["🔥", "💯", "🙌", "👏", "🎉", "✨", "💪", "🤝", "👀", "💀", "🤡", "🫶"],
  },
  {
    name: "Critters",
    stickers: ["🐶", "🐱", "🐼", "🦊", "🐸", "🐧", "🦄", "🐙", "🐢", "🦖", "🐝", "🦋"],
  },
];
