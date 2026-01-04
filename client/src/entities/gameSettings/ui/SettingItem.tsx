interface SettingItemProps {
  icon: string;
  label: string;
  value: string;
}

export const SettingItem = ({ icon, label, value }: SettingItemProps) => {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="material-symbols-outlined text-xl text-gray-600">
          {icon}
        </span>
        <span className="font-handwriting text-xl">{label}</span>
      </div>
      <span className="text-xl font-bold">{value}</span>
    </div>
  );
};
