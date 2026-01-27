import { useNavigate } from 'react-router-dom';

type Variant = 'scribble' | 'radius';
type Size = 'sm' | 'md' | 'lg';

interface CommonBtnProps {
  icon?: string;
  text: string;
  variant: Variant;
  size?: Size;
  color?: string;
  path?: string;
  onClick?: () => void;
  disabled?: boolean;
  ariaLabel?: string;
  className?: string;
}

const CommonBtn = ({
  icon,
  text,
  path,
  variant,
  size = 'lg',
  color = 'blue',
  onClick,
  disabled = false,
  ariaLabel,
  className = '',
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

  const sizeClasses = {
    sm: 'h-full px-3 text-lg',
    md: 'h-12 px-4 text-xl',
    lg: 'h-16 px-6 text-3xl',
  };

  const variantClasses = {
    scribble: `scribble-border group w-full rounded-full bg-white/90 text-gray-800 transition-all hover:scale-105 hover:bg-white ${sizeClasses[size]}`,
    radius: `w-full gap-1 rounded-xl border-2 bg-white font-bold transition-colors ${getColorClasses(color)} ${sizeClasses[size]} ${!text ? 'px-0' : ''}`,
  };

  const iconClasses = {
    scribble: {
      sm: 'material-symbols-outlined mr-1 text-lg transition-transform group-hover:scale-110',
      md: 'material-symbols-outlined mr-1 text-2xl transition-transform group-hover:scale-110',
      lg: 'material-symbols-outlined mr-2 text-3xl transition-transform group-hover:scale-110',
    },
    radius: {
      sm: 'material-symbols-outlined text-lg',
      md: 'material-symbols-outlined text-xl',
      lg: 'material-symbols-outlined text-2xl',
    },
  };

  const textClasses = {
    scribble: {
      sm: 'font-handwriting text-lg font-bold',
      md: 'font-handwriting text-xl font-bold',
      lg: 'font-handwriting text-3xl font-bold',
    },
    radius: {
      sm: '',
      md: '',
      lg: '',
    },
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      aria-label={ariaLabel || text}
      className={`${baseClasses} ${variantClasses[variant]} ${disabled ? 'cursor-not-allowed opacity-50' : ''} ${className}`}
    >
      {icon && <span className={iconClasses[variant][size]}>{icon}</span>}
      <span className={textClasses[variant][size]}>{text}</span>
    </button>
  );
};

export default CommonBtn;
