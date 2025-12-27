interface TitleProps {
  title: string;
  fontSize: string;
}

const Title = ({ title, fontSize }: TitleProps) => {
  return (
    <div
      className={`font-handwriting text-${fontSize} relative inline-block leading-tight font-black tracking-tight`}
    >
      {title}
    </div>
  );
};

export default Title;
