import Image from "next/image";

type Variant = "card" | "detail" | "spotlight";

type Props = {
  src: string | null | undefined;
  alt: string;
  variant?: Variant;
  sizes: string;
  priority?: boolean;
  className?: string;
};

/**
 * Program flyer presentation: preserve full artwork (no destructive crop).
 * Uses object-fit: contain inside a neutral frame so portrait/square/landscape
 * sources remain readable without forcing Media to one exact dimension.
 */
export function ProgramFlyerMedia({
  src,
  alt,
  variant = "card",
  sizes,
  priority = false,
  className = "",
}: Props) {
  const frame =
    variant === "detail"
      ? "relative mx-auto aspect-[3/4] w-full max-w-2xl max-h-[min(85vh,44rem)]"
      : variant === "spotlight"
        ? "relative min-h-64 w-full sm:min-h-80 lg:min-h-[28rem] lg:h-full"
        : "relative aspect-[3/4] w-full";

  return (
    <div
      className={`overflow-hidden bg-[var(--color-surface-tint)] ${frame} ${className}`.trim()}
      data-program-flyer={variant}
    >
      {src ? (
        <Image
          src={src}
          alt={alt}
          fill
          className="object-contain object-center"
          sizes={sizes}
          priority={priority}
        />
      ) : (
        <div
          className="absolute inset-0 bg-gradient-to-br from-[var(--kcmi-violet)] via-[color-mix(in_srgb,var(--kcmi-red)_40%,var(--kcmi-violet))] to-[var(--kcmi-lavender)]"
          aria-hidden
        />
      )}
    </div>
  );
}
