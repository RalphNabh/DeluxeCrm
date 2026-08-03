"use client";

import Image from "next/image";

export type TradePortrait = {
  src: string;
  trade: string;
};

/** Three independent strips — each column has its own trades, no overlap. */
const STRIP_A: TradePortrait[] = [
  { src: "/marketing/crew/electrician.jpg", trade: "Electrician" },
  { src: "/marketing/crew/plumber.jpg", trade: "Plumber" },
  { src: "/marketing/crew/hvac.jpg", trade: "HVAC" },
];

const STRIP_B: TradePortrait[] = [
  { src: "/marketing/crew/framing.jpg", trade: "Framing" },
  { src: "/marketing/crew/landscaping.jpg", trade: "Landscaping" },
  { src: "/marketing/crew/carpentry.jpg", trade: "Carpentry" },
];

const STRIP_C: TradePortrait[] = [
  { src: "/marketing/crew/painting.jpg", trade: "Painting" },
  { src: "/marketing/crew/welding.jpg", trade: "Welding" },
  { src: "/marketing/crew/flooring.jpg", trade: "Flooring" },
];

function Column({
  items,
  duration,
  reverse,
}: {
  items: TradePortrait[];
  duration: string;
  reverse?: boolean;
}) {
  // Duplicate only within the strip so the loop is seamless and self-contained
  const loop = [...items, ...items];
  return (
    <div className="relative h-full overflow-hidden">
      <div
        className={`flex flex-col gap-4 will-change-transform ${
          reverse ? "mkt-marquee-up" : "mkt-marquee-down"
        }`}
        style={{ animationDuration: duration }}
      >
        {loop.map((item, i) => (
          <figure
            key={`${item.src}-${item.trade}-${i}`}
            className="relative w-[200px] sm:w-[220px] lg:w-[240px] aspect-[4/5] overflow-hidden rounded-md shadow-[0_18px_40px_rgba(0,0,0,0.45)] ring-1 ring-white/10"
          >
            <Image
              src={item.src}
              alt={item.trade}
              fill
              sizes="240px"
              className="object-cover"
              priority={i < 3}
            />
            <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/45 to-transparent px-3 pb-3 pt-10">
              <p className="text-sm font-semibold text-white leading-tight tracking-wide">
                {item.trade}
              </p>
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}

export function ContractorMarquee() {
  return (
    <div
      className="relative h-[520px] sm:h-[580px] lg:h-[640px] w-full max-w-[760px] mx-auto lg:mx-0"
      aria-hidden="true"
    >
      <div className="absolute inset-0 flex justify-center lg:justify-end gap-3 sm:gap-4 px-2">
        <Column items={STRIP_A} duration="40s" />
        <Column items={STRIP_B} duration="50s" reverse />
        <div className="hidden sm:block">
          <Column items={STRIP_C} duration="45s" />
        </div>
      </div>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-[var(--mkt-ink)] to-transparent z-10" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[var(--mkt-ink)] to-transparent z-10" />
    </div>
  );
}
