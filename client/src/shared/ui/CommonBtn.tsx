import { useNavigate } from 'react-router-dom';

type Variant = 'scribble' | 'radius';

interface CommonBtnProps {
  icon: string;
  text: string;
  variant: Variant;
  color?: string;
  path?: string;
  onClick?: () => void;
  disabled?: boolean;
}

const CommonBtn = ({
  icon,
  text,
  path,
  variant,
  color = 'blue',
  onClick,
  disabled = false,
}: CommonBtnProps) => {
  const navigate = useNavigate();

  const handleClick = () => {
    if (disabled) return;
    if (onClick) {
      onClick();
    }
    if (path) {
      navigate(path);
    }
  };

  const getColorClasses = (color: string) => {
    const classes: Record<string, string> = {
      blue: 'border-blue-400 text-blue-600 hover:bg-blue-100',
      indigo: 'border-indigo-400 text-indigo-600 hover:bg-indigo-100',
      red: 'border-red-400 text-red-600 hover:bg-red-100',
      green: 'border-green-400 text-green-600 hover:bg-green-100',
      gray: 'border-gray-400 text-gray-600 hover:bg-gray-100',
    };
    return classes[color] || classes.blue;
  };

  const baseClasses = 'font-handwriting flex items-center justify-center';

  const variantClasses = {
    scribble:
      'scribble-border group h-16 w-full rounded-full bg-white/90 px-6 text-gray-800 transition-all hover:scale-105 hover:bg-white',
    radius: `w-full gap-1 rounded-xl border-2 bg-white py-5 text-xl font-bold transition-colors ${getColorClasses(color)}`,
  };

  const iconClasses = {
    scribble:
      'material-symbols-outlined mr-2 text-3xl transition-transform group-hover:scale-110',
    radius: 'material-symbols-outlined text-2xl',
  };

  const textClasses = {
    scribble: 'font-handwriting text-3xl font-bold',
    radius: '',
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className={`${baseClasses} ${variantClasses[variant]} ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
    >
      <span className={iconClasses[variant]}>{icon}</span>
      <span className={textClasses[variant]}>{text}</span>
    </button>
  );
};

export default CommonBtn;
