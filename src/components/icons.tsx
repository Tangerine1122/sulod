import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function base({ size = 22, ...rest }: IconProps) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    ...rest,
  };
}

export const HomeIcon = (p: IconProps) => (
  <svg {...base(p)}><path d="M4 11l8-6 8 6v9H4z" /></svg>
);
export const ListIcon = (p: IconProps) => (
  <svg {...base(p)}><path d="M5 6h14M5 12h14M5 18h9" /></svg>
);
export const BriefcaseIcon = (p: IconProps) => (
  <svg {...base(p)}><path d="M4 8h16v11H4zM9 8V5h6v3" /></svg>
);
export const BarsIcon = (p: IconProps) => (
  <svg {...base(p)}><path d="M5 20V12M12 20V5M19 20v-6" /></svg>
);
export const TargetIcon = (p: IconProps) => (
  <svg {...base(p)}><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="3" /></svg>
);
export const SlidersIcon = (p: IconProps) => (
  <svg {...base(p)}><path d="M4 7h10M18 7h2M4 17h4M12 17h8" /><circle cx="16" cy="7" r="2" /><circle cx="10" cy="17" r="2" /></svg>
);
export const ArrowRightIcon = (p: IconProps) => (
  <svg {...base(p)}><path d="M5 12h14M13 6l6 6-6 6" /></svg>
);
export const ArrowLeftIcon = (p: IconProps) => (
  <svg {...base(p)}><path d="M19 12H5M11 6l-6 6 6 6" /></svg>
);
export const ScanIcon = (p: IconProps) => (
  <svg {...base(p)}><path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2" /><path d="M8 10h8M8 14h5" /></svg>
);
export const TransferIcon = (p: IconProps) => (
  <svg {...base(p)}><path d="M4 8h14l-3-3M20 16H6l3 3" /></svg>
);
export const PlusIcon = (p: IconProps) => (
  <svg {...base(p)}><path d="M12 5v14M5 12h14" /></svg>
);
