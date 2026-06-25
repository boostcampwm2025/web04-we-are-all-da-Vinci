import { partner, tdsEvent } from "@apps-in-toss/web-framework";
import { useEffect, useState } from "react";
import NotificationCenterSheet from "./NotificationCenterSheet";

const ACCESSORY_BUTTON_ID = "notification";
const NotificationBellButton = () => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    partner.addAccessoryButton({
      id: ACCESSORY_BUTTON_ID,
      title: "알림",
      icon: { name: "icon-alarm-mono" },
    });

    const cleanup = tdsEvent.addEventListener("navigationAccessoryEvent", {
      onEvent: ({ id }) => {
        if (id === ACCESSORY_BUTTON_ID) setOpen(true);
      },
    });
    return cleanup;
  }, []);

  return <NotificationCenterSheet open={open} onClose={() => setOpen(false)} />;
};

export default NotificationBellButton;
