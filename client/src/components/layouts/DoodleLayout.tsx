import type { ReactNode } from 'react';
import {
  SunDoodle,
  ScribbleDoodle,
  StarDoodle,
  BrushDoodle,
  PaletteDoodle,
} from '@/components/doodles/Doodles';

interface DoodleLayoutProps {
  children: ReactNode;
}

export default function DoodleLayout({ children }: DoodleLayoutProps) {
  return (
    <div className="font-display relative h-screen w-full overflow-hidden bg-white text-[#111318]">
      <svg width="0" height="0" className="invisible absolute" aria-hidden>
        <defs>
          <filter id="wavy">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.02"
              numOctaves={5}
              result="noise"
            />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale={3} />
          </filter>
        </defs>
      </svg>

      <div className="absolute inset-0 bg-[linear-gradient(to_right,#e5e7eb_1px,transparent_1px),linear-gradient(to_bottom,#e5e7eb_1px,transparent_1px)] bg-size-[24px_24px]" />

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <SunDoodle />
        <ScribbleDoodle />
        <StarDoodle />
        <BrushDoodle />
        <PaletteDoodle />
      </div>

      <div className="relative z-10 h-full w-full">{children}</div>
    </div>
  );
}
