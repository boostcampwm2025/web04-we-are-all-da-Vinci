import { painterMan1Img } from "@/shared/assets/images";

interface StatusViewProps {
  image?: string;
  title: string;
  description?: string[];
}

const StatusView = ({
  image = painterMan1Img,
  title,
  description,
}: StatusViewProps) => {
  return (
    <div className="flex flex-1 flex-col items-center pt-[30%] px-[var(--page-px)]">
      <img src={image} alt="" className="mb-6 h-40 w-40 object-contain" />
      <h1 className="text-[22px] font-bold">{title}</h1>
      {description && (
        <div className="mt-2 text-center">
          {description.map((line) => (
            <p key={line} className="text-sm text-[var(--color-grey)]">
              {line}
            </p>
          ))}
        </div>
      )}
    </div>
  );
};

export default StatusView;
