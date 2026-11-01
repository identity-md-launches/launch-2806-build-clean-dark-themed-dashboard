export function Brand({ small = false }: { small?: boolean }) {
  return <span className={`brand ${small ? 'brand-small' : ''}`}>
    <svg className="brand-mark" viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <path d="M32.7 27.2A15 15 0 1 0 20 35" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M28 23.8a9 9 0 1 0-8 5.2" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      <path d="m16 17 5.7-4.3 5 4.1-3.2 7.8h-6l3-5.2M26.6 17h5.1m-7.4-3.7 1-3" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="28.3" cy="30.7" r="3" fill="currentColor" />
    </svg>
    <span>Squeekchain<span className="brand-period">.</span></span>
  </span>;
}
