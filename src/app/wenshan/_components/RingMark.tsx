// 年輪 logo mark（品牌識別，nav / footer / FAB 共用）
export default function RingMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
        <path d="M32 8a24 24 0 1 1-.01 0" transform="rotate(-14 32 32)" opacity="0.9" />
        <path d="M32 16a16 16 0 1 1-.01 0" transform="rotate(22 32 32)" opacity="0.65" />
        <path d="M32 24a8 8 0 1 1-.01 0" transform="rotate(-40 32 32)" opacity="0.9" />
      </g>
      <circle cx="32" cy="32" r="2.6" fill="currentColor" />
    </svg>
  );
}
