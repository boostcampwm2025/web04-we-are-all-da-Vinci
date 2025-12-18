export const SunDoodle = () => (
  <svg
    className="pointer-events-none absolute top-10 left-[10%] hidden h-24 w-24 rotate-[-15deg] text-yellow-500/50 md:block"
    fill="none"
    stroke="currentColor"
    strokeLinecap="round"
    strokeWidth="2"
    viewBox="0 0 100 100"
  >
    <circle cx="50" cy="50" r="30" />
    <path d="M50 10V5 M50 95V90 M90 50H95 M10 50H5 M78 22L82 18 M22 78L18 82 M78 78L82 82 M22 22L18 18" />
  </svg>
);

export const ScribbleDoodle = () => (
  <svg
    className="pointer-events-none absolute top-24 right-[15%] hidden h-32 w-32 rotate-10 text-gray-400/40 md:block"
    fill="none"
    stroke="currentColor"
    strokeLinecap="round"
    strokeWidth="2"
    viewBox="0 0 100 100"
  >
    <path d="M10 50 Q 50 10 90 50 T 10 90" />
    <path d="M20 30 L 80 70" />
    <path d="M80 30 L 20 70" />
  </svg>
);

export const StarDoodle = () => (
  <svg
    className="text-primary/30 pointer-events-none absolute bottom-40 left-[15%] hidden h-20 w-20 -rotate-12 md:block"
    fill="none"
    stroke="currentColor"
    strokeLinecap="round"
    strokeWidth="2"
    viewBox="0 0 100 100"
  >
    <path d="M20,80 L50,20 L80,80 L20,45 L80,45 Z" strokeLinejoin="round" />
  </svg>
);

export const BrushDoodle = () => (
  <svg
    className="text-primary/30 pointer-events-none absolute top-10 right-10 hidden h-32 w-32 rotate-15 md:block"
    fill="none"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth="1.5"
    viewBox="0 0 24 24"
  >
    <path d="M9.53 16.122a3 3 0 0 0-5.78 1.128 2.25 2.25 0 0 1-2.4 2.245 4.5 4.5 0 0 0 8.4-2.245c0-.399-.078-.78-.22-1.128Zm0 0a15.998 15.998 0 0 0 3.388-1.62m-5.043-.025a15.994 15.994 0 0 1 1.622-3.395m3.42 3.42a15.995 15.995 0 0 0 4.764-4.648l3.876-5.814a1.151 1.151 0 0 0-1.597-1.597L14.146 6.32a15.996 15.996 0 0 0-4.649 4.763m3.42 3.42a6.776 6.776 0 0 0-3.42-3.42" />
  </svg>
);

export const PaletteDoodle = () => (
  <svg
    className="pointer-events-none absolute right-[20%] bottom-32 hidden h-28 w-28 -rotate-12 text-pink-400/40 md:block"
    fill="none"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth="3"
    viewBox="0 0 100 100"
  >
    <path d="M 50 10 C 25 10, 10 25, 10 50 C 10 75, 25 90, 50 90 C 65 90, 75 85, 80 75 C 82 70, 80 65, 75 65 C 70 65, 68 68, 68 72 C 68 76, 70 78, 68 80 C 65 83, 60 85, 50 85 C 28 85, 15 72, 15 50 C 15 28, 28 15, 50 15 C 72 15, 85 28, 85 50 C 85 55, 83 58, 80 58" />

    <circle cx="75" cy="52" r="8" />

    <circle cx="32" cy="35" r="6" />
    <circle cx="32" cy="50" r="6" />
    <circle cx="32" cy="65" r="6" />
    <circle cx="48" cy="75" r="6" />
    <circle cx="65" cy="70" r="6" />

    <path d="M 85 20 L 60 45" strokeWidth="4" />
    <path d="M 88 17 L 63 42" strokeWidth="2" opacity="0.5" />

    <path
      d="M 58 47 L 52 53 L 55 56 L 61 50 Z"
      fill="currentColor"
      opacity="0.3"
    />

    <path d="M 52 53 C 48 57, 45 62, 50 67 C 55 72, 60 69, 64 65 L 61 62 C 58 65, 54 66, 52 63 C 50 60, 52 57, 55 56 Z" />
  </svg>
);
