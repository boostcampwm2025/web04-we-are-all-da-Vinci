import { landing } from "@/shared/assets/images";
import { Button } from "@toss/tds-mobile";
import { useEffect, useRef } from "react";

const CONFETTI_COLORS = ["#3b82f6", "#60a5fa", "#93c5fd", "#bfdbfe", "#e0e7ff"];
const CONFETTI_COUNT = 80;

interface LandingViewProps {
  onStart: () => void;
}

const LandingView = ({ onStart }: LandingViewProps) => {
  const confettiRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = confettiRef.current;
    if (!container) return;

    const pieces: HTMLDivElement[] = [];
    for (let i = 0; i < CONFETTI_COUNT; i++) {
      const el = document.createElement("div");
      el.className = "landing-confetti";
      el.style.left = `${Math.random() * 100}%`;
      el.style.width = `${Math.random() * 6 + 4}px`;
      el.style.height = `${Math.random() * 12 + 8}px`;
      el.style.backgroundColor =
        CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];
      el.style.animationDuration = `${Math.random() * 3 + 2.5}s`;
      el.style.animationDelay = `${Math.random() * 5}s`;
      container.appendChild(el);
      pieces.push(el);
    }

    return () => {
      pieces.forEach((p) => p.remove());
    };
  }, []);

  return (
    <div
      data-no-safe-area-bottom
      className="pt-8 relative flex h-full flex-col overflow-hidden bg-(--color-page)"
    >
      <div
        ref={confettiRef}
        className="pointer-events-none absolute inset-0 overflow-hidden"
      />

      <section className="relative z-10 mt-6 px-(--page-px) text-center">
        <p
          className="text-sm font-semibold"
          style={{ color: "rgba(0,12,30,0.55)" }}
        >
          오늘의 그림
        </p>
        <h1
          className="mt-2 mb-3 text-3xl font-extrabold leading-tight"
          style={{ color: "rgba(0,12,30,0.88)" }}
        >
          상위 1%만
          <br />
          95점 이상 달성!
        </h1>
        <p
          className="text-lg font-medium"
          style={{ color: "rgba(0,12,30,0.7)" }}
        >
          오늘의 그림은 뭘까요?
        </p>
      </section>
      <section className="relative z-10 mt-4 flex flex-1 items-center justify-center">
        <div className="landing-float relative w-full max-w-sm px-4">
          <span
            className="absolute top-20 right-8 flex h-1.5 w-1.5 animate-ping rounded-full bg-blue-300 opacity-60"
            style={{ animationDelay: "0.5s" }}
          />
          <span
            className="pointer-events-none absolute bottom-1/4 left-10 animate-pulse select-none text-xl font-bold text-slate-400 opacity-50"
            style={{ transform: "rotate(-15deg)" }}
          >
            ))
          </span>
          <span
            className="pointer-events-none absolute bottom-1/4 right-6 animate-pulse select-none text-xl font-bold text-slate-400 opacity-50"
            style={{ animationDelay: "0.3s", transform: "rotate(15deg)" }}
          >
            ((
          </span>
          <div className="bottom-16 relative z-10 flex aspect-square w-full items-center justify-center">
            <img
              src={landing}
              alt="우리 모두 다빈치 마스코트"
              className="h-full w-full object-contain drop-shadow-xl"
            />
          </div>
        </div>
      </section>
      <div className="pointer-events-none absolute bottom-0 h-32 w-full bg-linear-to-t from-(--color-page) to-transparent" />
      <footer className="relative z-10 flex flex-col items-center gap-4 px-(--page-px) pt-3 pb-[env(safe-area-inset-bottom)]">
        <div
          className="landing-float flex items-center gap-2"
          style={{ animationDuration: "3s" }}
        >
          <p
            className="text-sm font-medium"
            style={{ color: "rgba(0,12,30,0.7)" }}
          >
            나는 몇 점을 받을 수 있을까요?
          </p>
          <svg
            className="landing-bounce-arrow text-blue-600"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M12 2.25a.75.75 0 01.75.75v16.19l6.22-6.22a.75.75 0 111.06 1.06l-7.5 7.5a.75.75 0 01-1.06 0l-7.5-7.5a.75.75 0 111.06-1.06l6.22 6.22V3a.75.75 0 01.75-.75z"
            />
          </svg>
        </div>
        <div className="w-full max-w-80">
          <Button
            display="block"
            color="primary"
            style={{
              background:
                "linear-gradient(90deg,#3b82f6 0%,#60a5fa 30%,#93c5fd 50%,#60a5fa 70%,#3b82f6 100%)",
              backgroundSize: "200% auto",
              animation: "landing-btn-shimmer 3s linear infinite",
              borderRadius: "9999px",
            }}
            onClick={onStart}
          >
            도전하기
          </Button>
        </div>
      </footer>
    </div>
  );
};

export default LandingView;
