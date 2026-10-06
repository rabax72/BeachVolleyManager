/** Immagini del marchio, generate da design/logo.png con scripts/build-icons.py. */
const base = import.meta.env.BASE_URL;

/** Icona del pallone (barra laterale, intestazioni piccole). Decorativa: il nome è sempre scritto accanto. */
export function Logo({ size = 40 }: { size?: number }) {
  return (
    <img
      src={`${base}brand/icon-192.png`}
      width={size}
      height={size}
      alt=""
      aria-hidden
      className="shrink-0"
    />
  );
}

/** Logo completo con la scritta, per la home. */
export function LogoFull({ size = 320, alt }: { size?: number; alt: string }) {
  return (
    <picture>
      <source srcSet={`${base}brand/logo.webp`} type="image/webp" />
      <img
        src={`${base}brand/logo.png`}
        width={size}
        height={size}
        alt={alt}
        className="h-auto max-w-[80vw] drop-shadow-lg"
        style={{ width: size }}
      />
    </picture>
  );
}
