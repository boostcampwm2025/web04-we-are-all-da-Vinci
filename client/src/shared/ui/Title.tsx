interface TitleProps {
  title: string;
  fontSize: string;
}

const Title = ({ title, fontSize }: TitleProps) => {
  return (
    <h1
      className={`font-handwriting ${fontSize} relative inline-block leading-tight font-black tracking-tight`}
    >
      {title}
    </h1>
  );
};

export default Title;
