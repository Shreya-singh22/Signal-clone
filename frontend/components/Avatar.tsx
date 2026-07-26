import { initials } from "@/lib/format";

interface AvatarProps {
  name: string;
  color: string;
  emoji?: string | null;
  size?: number;
  online?: boolean;
  showPresence?: boolean;
}

export default function Avatar({ name, color, emoji, size = 40, online, showPresence }: AvatarProps) {
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <div
        className="flex items-center justify-center rounded-full text-white font-medium select-none"
        style={{
          width: size,
          height: size,
          backgroundColor: color,
          fontSize: size * 0.42,
        }}
      >
        {emoji ? <span style={{ fontSize: size * 0.5 }}>{emoji}</span> : initials(name)}
      </div>
      {showPresence && (
        <span
          className={`absolute bottom-0 right-0 rounded-full border-2 border-[var(--color-bg)] ${
            online ? "bg-emerald-500" : "bg-zinc-400 dark:bg-zinc-500"
          }`}
          style={{ width: size * 0.28, height: size * 0.28 }}
        />
      )}
    </div>
  );
}
