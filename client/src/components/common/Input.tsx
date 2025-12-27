interface InputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
  onEnter?: () => void;
  autoFocus?: boolean;
}

const Input = ({
  value,
  onChange,
  placeholder = '',
  maxLength = 100,
  onEnter,
}: InputProps) => {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && onEnter && value.trim()) {
          onEnter();
        }
      }}
      placeholder={placeholder}
      className="font-handwriting mb-6 w-full rounded-xl border-2 border-gray-300 px-4 py-3 text-lg focus:border-indigo-500 focus:outline-none"
      maxLength={maxLength}
      autoFocus
    />
  );
};

export default Input;
