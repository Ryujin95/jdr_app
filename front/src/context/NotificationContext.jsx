// front/src/context/NotificationContext.jsx
import { useState, useCallback } from "react";
import { NotificationContext } from "./NotificationContextObject";

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);

  const removeNotification = useCallback((id) => {
    setNotifications((current) => current.filter((n) => n.id !== id));
  }, []);

  const addNotification = useCallback(
    ({
      type = "info", // "success" | "error" | "info" | "warning"
      message,
      duration = 4000, // en millisecondes
    }) => {
      if (!message) return;

      const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;

      const notif = { id, type, message };

      setNotifications((current) => [...current, notif]);

      if (duration > 0) {
        setTimeout(() => {
          removeNotification(id);
        }, duration);
      }

      return id;
    },
    [removeNotification]
  );

  const value = {
    notifications,
    addNotification,
    removeNotification,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}
