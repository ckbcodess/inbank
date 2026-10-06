import Image from "next/image";

/** A country's flag as a round mark (`public/flags/<CODE>.svg`, Ghana included). The one place that draws it. */
export function CountryFlag({ code, size = 28 }: { code: string; size?: number }) {
  return (
    <Image
      src={`/flags/${code}.svg`}
      alt=""
      width={size}
      height={size}
      unoptimized
      className="shrink-0 rounded-full border border-border/60 object-cover"
      style={{ width: size, height: size }}
    />
  );
}
