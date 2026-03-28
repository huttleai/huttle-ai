/**
 * Minimal card-network marks (no third-party icon packs).
 * Text labels + simple geometric marks only.
 */
export function CardNetworkMark({ brand, className = '' }) {
  const b = String(brand || '').toLowerCase();

  if (b === 'visa') {
    return (
      <span className={`inline-flex min-w-[2.25rem] items-center justify-center text-[10px] font-bold tracking-tight text-[#1A1F71] ${className}`} aria-hidden>
        VISA
      </span>
    );
  }

  if (b === 'mastercard') {
    return (
      <span className={`inline-flex items-center ${className}`} aria-hidden>
        <svg viewBox="0 0 40 24" className="h-5 w-8 shrink-0" xmlns="http://www.w3.org/2000/svg">
          <circle cx="15" cy="12" r="10" fill="#EB001B" />
          <circle cx="25" cy="12" r="10" fill="#F79E1B" fillOpacity="0.95" />
        </svg>
      </span>
    );
  }

  if (b === 'amex' || b === 'american express') {
    return (
      <span
        className={`inline-flex min-w-[2.5rem] items-center justify-center rounded px-1 py-0.5 text-[9px] font-bold tracking-wide text-white bg-[#006FCF] ${className}`}
        aria-hidden
      >
        AMEX
      </span>
    );
  }

  if (b === 'discover') {
    return (
      <span className={`text-[10px] font-bold tracking-tight text-orange-600 ${className}`} aria-hidden>
        DISCOVER
      </span>
    );
  }

  const label = b ? b.replace(/_/g, ' ').slice(0, 10).toUpperCase() : 'CARD';
  return (
    <span className={`text-[10px] font-bold tracking-wide text-gray-600 ${className}`} aria-hidden>
      {label}
    </span>
  );
}
