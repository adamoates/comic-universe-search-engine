import { useState } from "react";

function NotificationBell({ notifications, unread, onRefresh }) {
  const [open, setOpen] = useState(false);

  const markRead = async (id) => {
    await fetch(`/api/releases/notifications/${id}/read`, { method: "PUT" });
    onRefresh();
  };

  const markAllRead = async () => {
    await fetch("/api/releases/notifications/read-all", { method: "PUT" });
    onRefresh();
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    const diffDays = Math.floor(diffHrs / 24);
    return `${diffDays}d ago`;
  };

  return (
    <div className="notification-bell-container">
      <button
        className="notification-bell"
        onClick={() => setOpen(!open)}
        aria-label="Notifications"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unread > 0 && <span className="notification-badge">{unread}</span>}
      </button>

      {open && (
        <div className="notification-panel">
          <div className="notification-header">
            <h3>Notifications</h3>
            {unread > 0 && (
              <button className="mark-all-read" onClick={markAllRead}>
                Mark all read
              </button>
            )}
          </div>
          <div className="notification-list">
            {notifications.length === 0 && (
              <p className="notification-empty">No notifications yet</p>
            )}
            {notifications.slice(0, 20).map((notif) => (
              <div
                key={notif.id}
                className={`notification-item ${notif.read ? "" : "unread"}`}
                onClick={() => !notif.read && markRead(notif.id)}
              >
                {notif.image && (
                  <img
                    src={notif.image.icon_url || notif.image.thumb_url || notif.image}
                    alt=""
                    className="notification-img"
                  />
                )}
                <div className="notification-content">
                  <p className="notification-title">{notif.title}</p>
                  <p className="notification-message">{notif.message}</p>
                  <span className="notification-time">
                    {formatTime(notif.createdAt)}
                  </span>
                </div>
                {!notif.read && <span className="unread-dot" />}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default NotificationBell;
