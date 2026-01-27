interface SettingItemProps {
  icon: string;
  label: string;
  value: string;
}

export const SettingItem = ({ icon, label, value }: SettingItemProps) => {
  return (
    <div className="flex items-center justify-between">
      <div className="hidden items-center gap-2 lg:flex">
        <span className="material-symbols-outlined text-xl text-gray-600">
          {icon}
        </span>
        <span className="font-handwriting text-xl">{label}</span>
      </div>
      <span className="font-handwriting lg:font-display text-xl font-medium lg:font-bold">
        {value}
      </span>
    </div>
  );
};
