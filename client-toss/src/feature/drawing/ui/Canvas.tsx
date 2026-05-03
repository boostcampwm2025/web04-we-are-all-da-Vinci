const Canvas = () => {
  return (
    <section className="min-h-0 flex-1 px-3 pb-3">
      <canvas
        data-testid="drawing-canvas"
        className="h-full w-full rounded-xl bg-white shadow-sm"
      />
    </section>
  );
};

export default Canvas;
