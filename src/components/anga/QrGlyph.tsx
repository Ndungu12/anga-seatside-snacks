// Illustrative QR artwork for signage previews. It is NOT a scannable code: production
// signage is generated from the URL by a QR encoder. Keeps the 4-module quiet zone.
const N = 25;
const QUIET = 4;

function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193) >>> 0;
  return h;
}

export function QrGlyph({
  value,
  size = 200,
  className,
}: {
  value: string;
  size?: number;
  className?: string;
}) {
  let seed = hash(value) || 1;
  const rnd = () => {
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    return (seed >>> 0) / 4294967296;
  };
  const finder = (x: number, y: number) =>
    (x < 8 && y < 8) || (x >= N - 8 && y < 8) || (x < 8 && y >= N - 8);
  const cells: [number, number][] = [];
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) if (!finder(x, y) && rnd() > 0.5) cells.push([x, y]);
  const F = ({ x, y }: { x: number; y: number }) => (
    <g transform={`translate(${x} ${y})`}>
      <rect width="7" height="7" fill="#000" />
      <rect x="1" y="1" width="5" height="5" fill="#fff" />
      <rect x="2" y="2" width="3" height="3" fill="#000" />
    </g>
  );
  const total = N + QUIET * 2;
  return (
    <svg
      width={size}
      height={size}
      viewBox={`${-QUIET} ${-QUIET} ${total} ${total}`}
      shapeRendering="crispEdges"
      role="img"
      aria-label={`QR code for ${value} (illustration)`}
      className={className}
    >
      <rect x={-QUIET} y={-QUIET} width={total} height={total} fill="#fff" />
      <path d={cells.map(([x, y]) => `M${x} ${y}h1v1h-1z`).join("")} fill="#000" />
      <F x={0} y={0} />
      <F x={N - 7} y={0} />
      <F x={0} y={N - 7} />
    </svg>
  );
}
