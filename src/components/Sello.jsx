// Sello festoneado con tiendita (compartido por login y panel)
export default function Sello({ className = "lg-sello" }) {
  const puntos = Array.from({ length: 16 }, (_, i) => {
    const a = (i / 16) * Math.PI * 2;
    return `<circle cx="${50 + 42 * Math.cos(a)}" cy="${50 + 42 * Math.sin(a)}" r="9"/>`;
  }).join("");
  return (
    <svg className={className} viewBox="0 0 100 100" aria-hidden="true">
      <g fill="#4b5230" dangerouslySetInnerHTML={{ __html: `<circle cx="50" cy="50" r="42"/>${puntos}` }} />
      <path d="M30 40 L34 28 H66 L70 40 Z" fill="#e6e2b8" />
      <path d="M30 40 q5 7 10 0 q5 7 10 0 q5 7 10 0 q5 7 10 0 z" fill="#d3cf9d" />
      <rect x="33" y="47" width="34" height="24" fill="#e6e2b8" />
      <rect x="37" y="52" width="14" height="19" fill="#4b5230" />
      <rect x="55" y="52" width="9" height="10" fill="#4b5230" />
    </svg>
  );
}
