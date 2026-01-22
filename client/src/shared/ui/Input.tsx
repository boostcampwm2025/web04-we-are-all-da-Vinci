type Variant = 'default' | 'scribble';

interface InputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
  onEnter?: () => void;
  autoFocus?: boolean;
  showCount?: boolean;
  ariaLabel?: string;
  variant?: Variant;
}

const Input = ({
  value,
  onChange,
  placeholder = '',
  maxLength,
  onEnter,
  autoFocus = false,
  showCount = false,
  ariaLabel,
  variant = 'default',
}: InputProps) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    if (maxLength === undefined || newValue.length <= maxLength) {
      onChange(newValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && onEnter && value.trim()) {
      onEnter();
    }
  };

  const wrapperClasses = {
    default: 'relative h-full w-full',
    scribble: 'scribble-border relative h-full w-full',
  };

  const inputClasses = {
    default:
      'font-handwriting border-stroke-default focus:border-interactive-default w-full rounded-full border-2 px-4 py-3 text-lg focus:outline-none',
    scribble:
      'font-handwriting text-content-primary placeholder:text-content-disabled h-full w-full rounded-full bg-transparent px-4 pr-12 text-lg focus:outline-none',
  };

  return (
    <div className={wrapperClasses[variant]}>
      <input
        type="text"
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        maxLength={maxLength}
        autoFocus={autoFocus}
        aria-label={ariaLabel || placeholder}
        className={inputClasses[variant]}
      />
      {showCount && maxLength && (
        <span className="text-content-secondary absolute top-1/2 right-3 -translate-y-1/2 text-xs">
          {value.length}/{maxLength}
        </span>
      )}
    </div>
  );
};

export default Input;
