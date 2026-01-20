interface DrawingHeaderProps {
  roundBadge: React.ReactNode;
  title: string;
}

export const DrawingHeader = ({ roundBadge, title }: DrawingHeaderProps) => {
  return (
    <div className="mb-4 shrink-0 text-center">
      {roundBadge}
      <h1 className="text-responsive-title mb-2">{title}</h1>
      <div className="mx-auto h-1.5 w-48 rounded-full bg-yellow-300" />
    </div>
  );
};
