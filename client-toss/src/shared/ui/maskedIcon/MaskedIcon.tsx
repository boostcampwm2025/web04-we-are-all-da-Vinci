interface MaskedIconProps {
  src: string;
  color: string;
  size?: number;
}

const MaskedIcon = ({ src, color, size = 22 }: MaskedIconProps) => (
  <span
    className="inline-block"
    style={{
      width: size,
      height: size,
      backgroundColor: color,
      maskImage: `url(${src})`,
      maskSize: "contain",
      maskRepeat: "no-repeat",
      WebkitMaskImage: `url(${src})`,
      WebkitMaskSize: "contain",
      WebkitMaskRepeat: "no-repeat",
    }}
  />
);

export default MaskedIcon;
