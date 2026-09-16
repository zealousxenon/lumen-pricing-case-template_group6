const SECTIONS = [
  ["cockpit", "Scenario"],
  ["price", "Price"],
  ["positioning", "Positioning"],
  ["segments", "Segments"],
  ["regions", "Where"],
  ["timing", "When"],
  ["method", "Method"],
];

export default function PageNav() {
  return (
    <nav className="page-nav" aria-label="Personal analysis sections">
      <span>e263031 · personal analysis</span>
      <div>
        {SECTIONS.map(([id, label]) => (
          <a key={id} href={`#${id}`}>
            {label}
          </a>
        ))}
      </div>
    </nav>
  );
}
