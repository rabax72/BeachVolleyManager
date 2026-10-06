/** Logo vettoriale: pallone su sfondo mare. */
export function Logo({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
      <rect width="32" height="32" rx="7" fill="#0e7a8f" />
      <path d="M0 24 Q8 20 16 24 T32 24 V32 H0Z" fill="#e5ca93" />
      <circle cx="16" cy="14" r="8.5" fill="#fdfaf3" stroke="#3d2c10" strokeWidth="1.3" />
      <path
        d="M7.8 12.5c4-2.5 12.4-2.5 16.4 0M16 5.5c-2.6 3.2-2.6 13.8 0 17M10 19.5c1.5-4 9-8 12.8-6.5"
        stroke="#3d2c10"
        strokeWidth="1.1"
        fill="none"
      />
    </svg>
  );
}
