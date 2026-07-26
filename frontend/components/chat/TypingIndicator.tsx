export default function TypingIndicator({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-start px-4 sm:px-8 mb-2">
      {label && <span className="text-xs text-[var(--color-text-secondary)] ml-1 mb-0.5">{label}</span>}
      <div className="bg-[var(--color-bubble-in)] rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-1">
        <span className="typing-dot w-1.5 h-1.5 rounded-full bg-[var(--color-text-secondary)]" style={{ animationDelay: "0ms" }} />
        <span className="typing-dot w-1.5 h-1.5 rounded-full bg-[var(--color-text-secondary)]" style={{ animationDelay: "150ms" }} />
        <span className="typing-dot w-1.5 h-1.5 rounded-full bg-[var(--color-text-secondary)]" style={{ animationDelay: "300ms" }} />
      </div>
    </div>
  );
}
