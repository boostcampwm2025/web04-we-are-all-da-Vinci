import {
  getTossShareLink,
  partner,
  share,
  tdsEvent,
} from "@apps-in-toss/web-framework";
import { useEffect } from "react";

const handleShare = async () => {
  const tossLink = await getTossShareLink(
    "intoss://we-are-all-da-vinci",
    "https://imgur.com/JUlHwsT.png",
  );

  await share({ message: tossLink });
};

const useShareButton = () => {
  useEffect(() => {
    partner.addAccessoryButton({
      id: "share",
      title: "공유",
      icon: {
        name: "icon-share-dots-thin-mono",
      },
    });

    const cleanup = tdsEvent.addEventListener("navigationAccessoryEvent", {
      onEvent: async ({ id }) => {
        if (id === "share") {
          try {
            await handleShare();
          } catch (error) {
            console.error(error);
          }
        }
      },
    });

    return cleanup;
  }, []);
};

export default useShareButton;
