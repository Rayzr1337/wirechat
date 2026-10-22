export function GroupIcon({ size = 26, colorIndex = 0 }: { size?: number; colorIndex?: number }) {
  const GROUP_PALETTE = ["#7c6ff0", "#4fb3a9", "#d98a5f", "#5f9dd9", "#c97bb0", "#e0b64f"];
  const bg = GROUP_PALETTE[colorIndex % GROUP_PALETTE.length];

  return (
    <div className="flex items-center justify-center rounded-md shrink-0"
         style={{ width: size, height: size, backgroundColor: bg }}>
      <svg width={size * 0.64} height={size * 0.64} viewBox="0 0 24 24" fill="#ffffff">
        <circle cx="12" cy="7.2" r="3" />
        <path d="M12 11.3c-3.1 0-5.6 1.8-5.6 4.1V18h11.2v-2.6c0-2.3-2.5-4.1-5.6-4.1z" />
        <g>
          <circle cx="4.8" cy="9.3" r="2.2" />
          <path d="M8.3 18v-3.5c0-1.9-1.6-3.2-3.5-3.2S1.3 12.6 1.3 14.5V18z" />
        </g>
        <g transform="translate(24,0) scale(-1,1)">
          <circle cx="4.8" cy="9.3" r="2.2" />
          <path d="M8.3 18v-3.5c0-1.9-1.6-3.2-3.5-3.2S1.3 12.6 1.3 14.5V18z" />
        </g>
      </svg>
    </div>
  );
}
