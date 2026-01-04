interface DrawingCanvasProps {
  placeholder?: string;
}

export const DrawingCanvas = ({
  placeholder = '여기에 그림을 그리세요',
}: DrawingCanvasProps) => {
  return (
    <div className="relative min-h-0 flex-1 bg-white">
      <div className="flex h-full w-full items-center justify-center">
        <p className="font-handwriting text-xl text-gray-400">{placeholder}</p>
      </div>
    </div>
  );
};
