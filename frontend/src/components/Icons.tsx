import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement> & { size?: number };

function Svg({ size = 20, children, ...rest }: P) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  );
}

export const IconArrow = (p: P) => (<Svg {...p}><path d="M5 12h14M13 6l6 6-6 6" /></Svg>);
export const IconCheck = (p: P) => (<Svg {...p}><path d="M20 6 9 17l-5-5" /></Svg>);
export const IconX = (p: P) => (<Svg {...p}><path d="M18 6 6 18M6 6l12 12" /></Svg>);
export const IconHelp = (p: P) => (<Svg {...p}><circle cx="12" cy="12" r="9" /><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 1-1 1.7M12 17h.01" /></Svg>);
export const IconSearch = (p: P) => (<Svg {...p}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></Svg>);
export const IconSwords = (p: P) => (<Svg {...p}><path d="m14.5 17.5 5-5M4 4l7 7M20 4l-7 7M9.5 17.5l-5-5M3 21l3-3M21 21l-3-3" /></Svg>);
export const IconShield = (p: P) => (<Svg {...p}><path d="M12 3 4 6v6c0 4.5 3.2 7.8 8 9 4.8-1.2 8-4.5 8-9V6l-8-3Z" /><path d="m9 12 2 2 4-4" /></Svg>);
export const IconScale = (p: P) => (<Svg {...p}><path d="M12 3v18M5 21h14M5 7l-3 7a4 4 0 0 0 6 0L5 7ZM19 7l-3 7a4 4 0 0 0 6 0l-3-7ZM5 7h14" /></Svg>);
export const IconTrendUp = (p: P) => (<Svg {...p}><path d="m3 17 6-6 4 4 8-8M15 7h6v6" /></Svg>);
export const IconTrendDown = (p: P) => (<Svg {...p}><path d="m3 7 6 6 4-4 8 8M15 17h6v-6" /></Svg>);
export const IconAlert = (p: P) => (<Svg {...p}><path d="M12 3 2 20h20L12 3ZM12 10v4M12 17h.01" /></Svg>);
export const IconEye = (p: P) => (<Svg {...p}><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></Svg>);
export const IconClock = (p: P) => (<Svg {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></Svg>);
export const IconSend = (p: P) => (<Svg {...p}><path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7Z" /></Svg>);
export const IconCopy = (p: P) => (<Svg {...p}><rect x="9" y="9" width="12" height="12" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h8" /></Svg>);
export const IconSun = (p: P) => (<Svg {...p}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></Svg>);
export const IconMoon = (p: P) => (<Svg {...p}><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" /></Svg>);
export const IconChat = (p: P) => (<Svg {...p}><path d="M21 12a8 8 0 0 1-11.6 7.1L3 21l1.9-5.4A8 8 0 1 1 21 12Z" /></Svg>);
export const IconHome = (p: P) => (<Svg {...p}><path d="M3 11.5 12 4l9 7.5M5 10v10h5v-6h4v6h5V10" /></Svg>);
export const IconHistory = (p: P) => (<Svg {...p}><path d="M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5M12 7v5l3 2" /></Svg>);
export const IconGithub = (p: P) => (<Svg {...p}><path d="M9 19c-4.3 1.4-4.3-2.5-6-3m12 5v-3.5c0-1 .1-1.4-.5-2 2.8-.3 5.5-1.4 5.5-6a4.6 4.6 0 0 0-1.3-3.2 4.2 4.2 0 0 0-.1-3.2s-1.1-.3-3.5 1.3a12 12 0 0 0-6.2 0C6.5 2.8 5.4 3.1 5.4 3.1a4.2 4.2 0 0 0-.1 3.2A4.6 4.6 0 0 0 4 9.5c0 4.6 2.700 5.700 5.500 6-.6.6-.6 1.200-.5 2V21" /></Svg>);
export const IconPlus = (p: P) => (<Svg {...p}><path d="M12 5v14M5 12h14" /></Svg>);
export const IconChevron = (p: P) => (<Svg {...p}><path d="m6 9 6 6 6-6" /></Svg>);
export const IconFile = (p: P) => (<Svg {...p}><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5ZM14 3v5h5M9 13h6M9 17h6" /></Svg>);
export const IconPulse = (p: P) => (<Svg {...p}><path d="M3 12h4l2-7 4 14 2-7h6" /></Svg>);
export const IconBot = (p: P) => (<Svg {...p}><rect x="4" y="8" width="16" height="12" rx="2" /><path d="M12 8V4H8M2 14h2M20 14h2M15 13v2M9 13v2" /></Svg>);
export const IconUser = (p: P) => (<Svg {...p}><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></Svg>);

export function Logo({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" fill="var(--accent)" />
      <path d="M8 8l16 16M24 8 8 24" stroke="var(--accent-ink)" strokeWidth="3" strokeLinecap="round" />
      <circle cx="8" cy="8" r="2.4" fill="var(--a)" stroke="var(--accent)" strokeWidth="1.2" />
      <circle cx="24" cy="8" r="2.4" fill="var(--b)" stroke="var(--accent)" strokeWidth="1.2" />
    </svg>
  );
}
