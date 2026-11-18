import { cn } from "@/lib/utils";

/** The official ANGA Cinemas logo (public/brand). Never redrawn in CSS. */
export function AngaLogo({ size = 36, className }: { size?: number; className?: string }) {
  return (
    <img
      src={size > 96 ? "/brand/anga-logo-512.png" : "/brand/anga-logo-192.png"}
      alt="Anga Cinemas"
      width={size}
      height={Math.round(size * 1.18)}
      className={cn("shrink-0 select-none object-contain", className)}
      style={{ width: size, height: Math.round(size * 1.18) }}
      draggable={false}
    />
  );
}

/** Logo plus product name, used in every header. */
export function BrandLockup({ sub = "In-Seat", size = 30 }: { sub?: string; size?: number }) {
  return (
    <span className="flex items-center gap-2.5">
      <AngaLogo size={size} />
      <span className="flex flex-col leading-none">
        <span className="font-display text-[15px] font-extrabold tracking-[0.18em]">ANGA</span>
        <span className="mt-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-highlight">
          {sub}
        </span>
      </span>
    </span>
  );
}
