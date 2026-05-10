type ScoreSize = "s" | "m" | "l";

interface ScoreProps {
  value: number;
  size?: ScoreSize;
  subtitle?: string;
}

const sizeStyles: Record<
  ScoreSize,
  { score: string; unit: string; subtitle: string }
> = {
  s: { score: "text-[22px]", unit: "text-xs", subtitle: "text-xs" },
  m: { score: "text-[28px]", unit: "text-sm", subtitle: "text-xs" },
  l: { score: "text-[36px]", unit: "text-base", subtitle: "text-sm" },
};

const Score = ({ value, size = "m", subtitle }: ScoreProps) => {
  const style = sizeStyles[size];

  return (
    <section className="text-center">
      <p>
        <span className={`${style.score} font-black text-black`}>{value}</span>
        <span className={`${style.unit} text-(--color-grey)`}>점</span>
      </p>
      {subtitle && (
        <p className={`${style.subtitle} text-(--color-grey) mt-1.5`}>
          {subtitle}
        </p>
      )}
    </section>
  );
};

export default Score;
