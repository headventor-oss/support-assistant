/**
 * Mitsubishi Fuso logo: the red three-diamond mark above the "FUSO" wordmark.
 * The wordmark uses currentColor so it stays legible on the dark theme.
 */
export default function FusoLogo({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 104 72"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Mitsubishi Fuso"
    >
      <g fill="#E60012">
        <polygon points="52,26 45,17 52,8 59,17" />
        <polygon points="52,26 45,17 52,8 59,17" transform="rotate(120 52 26)" />
        <polygon points="52,26 45,17 52,8 59,17" transform="rotate(240 52 26)" />
      </g>
      <text
        x="52"
        y="64"
        textAnchor="middle"
        fontFamily="Arial, Helvetica, sans-serif"
        fontWeight="700"
        fontSize="17"
        letterSpacing="1.5"
        fill="currentColor"
      >
        FUSO
      </text>
    </svg>
  );
}
