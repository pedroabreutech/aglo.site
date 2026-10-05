export function Logo({ tamanho = 36 }: { tamanho?: number }) {
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 39 39" fill="none" aria-hidden="true">
      <rect width="39" height="39" rx="10" fill="#137FEC" />
      <circle cx="19.5" cy="11.5" r="3.6" fill="#FFFFFF" />
      <circle cx="11" cy="17.5" r="3.1" fill="#FFFFFF" fillOpacity="0.9" />
      <circle cx="28" cy="17.5" r="3.1" fill="#FFFFFF" fillOpacity="0.9" />
      <circle cx="19.5" cy="20.5" r="2.6" fill="#FFFFFF" fillOpacity="0.75" />
      <circle cx="13.5" cy="27" r="3.1" fill="#FFFFFF" fillOpacity="0.9" />
      <circle cx="25.5" cy="27" r="3.1" fill="#FFFFFF" fillOpacity="0.9" />
    </svg>
  );
}
