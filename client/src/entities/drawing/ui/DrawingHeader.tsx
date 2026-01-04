interface DrawingHeaderProps {
  title: string;
}

export function DrawingHeader({ title }: DrawingHeaderProps) {
  return (
    <div className="mb-4 shrink-0 text-center">
      <h1 className="font-handwriting mb-2 text-3xl font-black">{title}</h1>
      <div className="mx-auto h-1.5 w-48 rounded-full bg-yellow-300" />
    </div>
  );
}
