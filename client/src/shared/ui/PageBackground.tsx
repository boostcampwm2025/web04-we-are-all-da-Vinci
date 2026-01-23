import {
  BrushDoodle,
  JudyDoodle,
  LionDoodle,
  NickDoodle,
  PainterDoodle,
  PaletteDoodle,
  ScribbleDoodle,
  StarDoodle,
  SunDoodle,
} from './Doodles';

const PageBackground = () => {
  return (
    <>
      {/* 그리드 패턴 */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#e5e7eb_1px,transparent_1px),linear-gradient(to_bottom,#e5e7eb_1px,transparent_1px)] bg-[size:24px_24px]" />

      {/* 두들스 */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <BrushDoodle />
        <ScribbleDoodle />
        <StarDoodle />
        <SunDoodle />
        <PaletteDoodle />
        <NickDoodle />
        <JudyDoodle />
        <LionDoodle />
        <PainterDoodle />
      </div>
    </>
  );
};

export default PageBackground;
