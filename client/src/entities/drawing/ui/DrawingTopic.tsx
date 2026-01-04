interface DrawingTopicProps {
  topic: string;
}

export const DrawingTopic = ({ topic }: DrawingTopicProps) => {
  return (
    <div className="absolute left-1/2 top-4 -translate-x-1/2 rounded-full bg-indigo-600 px-6 py-2 text-white shadow-lg">
      <span className="font-handwriting text-lg font-bold">주제: {topic}</span>
    </div>
  );
};
