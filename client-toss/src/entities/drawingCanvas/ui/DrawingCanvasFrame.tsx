import { type ReactNode } from "react";

interface DrawingCanvasFrameProps {
  children: ReactNode;
  as?: "div" | "button";
  onClick?: () => void;
  ariaLabel?: string;
  className?: string;
  topAccessory?: ReactNode;
}

const FRAME_BASE = "block w-full rounded-2xl! bg-gray-100 p-2";

const DrawingCanvasFrame = ({
  children,
  as = "div",
  onClick,
  ariaLabel,
  className,
  topAccessory,
}: DrawingCanvasFrameProps) => {
  if (as === "button") {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label={ariaLabel}
        className={`${FRAME_BASE} block appearance-none border-0 transition-transform duration-100 active:scale-[0.98] ${className ?? ""}`}
      >
        {topAccessory}
        {children}
      </button>
    );
  }
  return (
    <div className={`${FRAME_BASE} ${className ?? ""}`}>
      {topAccessory}
      {children}
    </div>
  );
};
export default DrawingCanvasFrame;
