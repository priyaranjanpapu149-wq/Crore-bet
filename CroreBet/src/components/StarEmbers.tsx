export default function StarEmbers({ count = 72 }: { count?: number }) {
  return (
    <div className="champagne-sparkles" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <span key={i} style={{ left: `${3 + (i * 37) % 94}%`, top: `${((i + 0.5) / count) * 100}%`, animationDelay: `${(i % 11) * -0.6}s` }} />
      ))}
    </div>
  );
}
