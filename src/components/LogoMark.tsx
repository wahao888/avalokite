export default function LogoMark({ size = 34 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <g transform="translate(32,33)">
        <circle
          r="24" fill="none" stroke="#A98467" strokeWidth="2" strokeLinecap="round"
          strokeDasharray="94 14 32 10" transform="rotate(-30)" opacity="0.85"
        />
        <circle
          r="18" fill="none" stroke="#8A9A7B" strokeWidth="2" strokeLinecap="round"
          strokeDasharray="46 11 41 16" transform="rotate(40)" opacity="0.8"
        />
        <g stroke="#5F7155" strokeWidth="4" strokeLinecap="round" fill="none">
          <path d="M0,-11 L-7.5,11" />
          <path d="M0,-11 L7.5,11" />
          <path d="M-4.3,3.8 Q0,1.3 4.3,3.8" />
        </g>
      </g>
    </svg>
  );
}
