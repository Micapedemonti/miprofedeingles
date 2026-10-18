/** Speech bubble with a highlighted word: the phrase you heard, and the part that got away. */
export function LogoMark({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" className={className} aria-hidden="true" focusable="false">
      <rect width="512" height="512" rx="120" fill="var(--logo-bg, #15171C)" />
      <path d="M152 128h208a56 56 0 0 1 56 56v96a56 56 0 0 1-56 56H232l-80 64v-64a56 56 0 0 1-56-56v-96a56 56 0 0 1 56-56z" fill="var(--logo-paper, #FFFFFF)" />
      <path d="M168 198h176" stroke="var(--logo-bg, #15171C)" strokeWidth="30" strokeLinecap="round" />
      <rect x="150" y="238" width="148" height="52" rx="12" fill="var(--accent, #FFD84D)" />
      <path d="M168 264h110" stroke="var(--logo-bg, #15171C)" strokeWidth="30" strokeLinecap="round" />
      <path d="M332 264h12" stroke="var(--logo-bg, #15171C)" strokeWidth="30" strokeLinecap="round" />
    </svg>
  );
}

export function Logo() {
  return (
    <span className="brand">
      <LogoMark size={32} />
      <span className="brand-name">Mi profe de inglés</span>
    </span>
  );
}
