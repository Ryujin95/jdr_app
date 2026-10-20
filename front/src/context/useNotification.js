import { useContext } from "react";
import { NotificationContext } from "./NotificationContextObject";

export function useNotification() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error(
      "useNotification doit être utilisé dans un <NotificationProvider>"
    );
  }
  return context;
}
