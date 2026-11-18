import { cn } from "@/lib/utils";

// Typographic film posters: no third-party artwork, consistent with the brand.
const PALETTES = [
  ["#0757b5", "#0b1a33"],
  ["#7a1f2b", "#1a0b10"],
  ["#1f5d4a", "#0a1a14"],
  ["#6b4a12", "#1b1307"],
  ["#3b2a6b", "#100b20"],
  ["#20323f", "#0b1116"],
];

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

export function Poster({
  title,
  rating,
  className,
}: {
  title: string;
  rating?: string;
  className?: string;
}) {
  const [a, b] = PALETTES[hash(title) % PALETTES.length]!;
  return (
    <div
      className={cn(
        "relative flex aspect-[2/3] flex-col justify-end overflow-hidden rounded-xl p-3",
        className,
      )}
      style={{ background: `radial-gradient(120% 80% at 30% 15%, ${a} 0%, ${b} 70%)` }}
      aria-hidden
    >
      <span className="absolute right-2 top-2 h-1 w-6 rounded-full bg-highlight/80" />
      <span className="font-display text-[15px] font-extrabold leading-tight text-white [text-wrap:balance]">
        {title}
      </span>
      {rating ? (
        <span className="mt-1 text-[11px] font-semibold text-white/70">{rating}</span>
      ) : null}
    </div>
  );
}
