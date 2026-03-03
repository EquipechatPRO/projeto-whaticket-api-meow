import { useEffect, useRef, useCallback } from "react";

export function useNotifications() {
  const permissionRef = useRef(Notification.permission);

  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().then((p) => {
        permissionRef.current = p;
      });
    }
  }, []);

  const notify = useCallback(
    (title: string, options?: NotificationOptions) => {
      if (!("Notification" in window)) return;
      if (document.visibilityState === "visible" && document.hasFocus()) return;

      if (Notification.permission === "granted") {
        const n = new Notification(title, {
          icon: "/favicon.ico",
          badge: "/favicon.ico",
          ...options,
        });
        n.onclick = () => {
          window.focus();
          n.close();
        };
      }
    },
    []
  );

  return { notify };
}
