interface SimilarityProgressBarProps {
  color: string;
  percent: string;
}

const colorStyles: Record<string, { bg: string; fill: string }> = {
  blue: { bg: 'bg-blue-200', fill: 'bg-blue-600' },
  gray: { bg: 'bg-gray-200', fill: 'bg-gray-600' },
  gold: { bg: 'bg-yellow-200', fill: 'bg-yellow-500' },
  silver: { bg: 'bg-slate-200', fill: 'bg-slate-400' },
  bronze: { bg: 'bg-orange-200', fill: 'bg-orange-500' },
};

const SimilarityProgressBar = ({
  color,
  percent,
}: SimilarityProgressBarProps) => {
  const styles = colorStyles[color] || colorStyles.gray;

  return (
    <div className={`h-2 w-full rounded-full ${styles.bg}`}>
      <div
        className={`h-2 rounded-full ${styles.fill}`}
        style={{ width: percent }}
      ></div>
    </div>
  );
};

export default SimilarityProgressBar;
