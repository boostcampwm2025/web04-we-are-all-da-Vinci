interface SimilarityProgressBarProps {
  color: string;
  percent: string;
}

const SimilarityProgressBar = ({
  color,
  percent,
}: SimilarityProgressBarProps) => {
  return (
    <div className={`h-2 w-full rounded-full bg-${color}-200`}>
      <div
        className={`h-2 rounded-full bg-${color}-600`}
        style={{ width: percent }}
      ></div>
    </div>
  );
};

export default SimilarityProgressBar;
