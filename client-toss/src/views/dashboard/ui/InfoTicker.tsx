import { colors } from "@toss/tds-colors";
import { useEffect, useState } from "react";
import {
  INFO_TICKER_INTERVAL_MS,
  INFO_TICKER_MESSAGES,
} from "../config/infoTicker";

const InfoTicker = () => {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((prev) => (prev + 1) % INFO_TICKER_MESSAGES.length);
    }, INFO_TICKER_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <section
      aria-label="앱 안내"
      className="flex h-9 shrink-0 items-center justify-center overflow-hidden bg-(--color-page) px-(--page-px)"
    >
      <p
        key={index}
        className="animate-info-ticker truncate text-[13px] font-medium"
        style={{ color: colors.grey700 }}
      >
        {INFO_TICKER_MESSAGES[index]}
      </p>
    </section>
  );
};

export default InfoTicker;
