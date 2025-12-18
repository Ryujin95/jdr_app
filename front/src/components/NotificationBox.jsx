// front/src/components/NotificationBox.jsx
import { useNotification } from "../context/NotificationContext";
import "../CSS/NotificationBox.css";

function NotificationBox() {
  const { notifications, removeNotification } = useNotification();

  if (!notifications.length) return null;

  return (
    <div className="notif-container">
      {notifications.map((n) => (
        <div key={n.id} className={`notif notif-${n.type}`}>
          <span className="notif-message">{n.message}</span>
          <button
            className="notif-close"
            onClick={() => removeNotification(n.id)}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}

export default NotificationBox;
