import Badge from "@/components/ui/Badge";
import EmptyState from "@/components/ui/EmptyState";
import PageHeader from "@/components/ui/PageHeader";
import StatCard from "@/components/ui/StatCard";
import { formatDateTimeID, notificationStatusMeta } from "@/lib/status";
import { getNotificationStats, listNotifications } from "@/server/services/admin-queries";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const [notifications, stats] = await Promise.all([listNotifications(50), getNotificationStats()]);

  return (
    <>
      <PageHeader
        title="Notifications"
        subtitle="Arsip notifikasi (pengiriman WhatsApp sudah dihapus dari aplikasi)."
      />

      <div className="stat-grid" style={{ marginBottom: 16 }}>
        <StatCard label="Total" value={stats.total ?? 0} />
        <StatCard label="Sent" value={stats.SENT ?? 0} />
        <StatCard label="Pending" value={stats.PENDING ?? 0} />
        <StatCard label="Failed" value={stats.FAILED ?? 0} />
      </div>

      {notifications.length === 0 ? (
        <EmptyState
          title="Belum ada notifikasi"
          message="Notifikasi tercatat setelah aktivasi kartu atau kenaikan review."
        />
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Waktu</th>
                <th>Card ID</th>
                <th>Store</th>
                <th>Type</th>
                <th>Recipient</th>
                <th>Status</th>
                <th>Error</th>
              </tr>
            </thead>
            <tbody>
              {notifications.map((notification) => {
                const meta = notificationStatusMeta(notification.status);
                return (
                  <tr key={notification.id}>
                    <td>{formatDateTimeID(notification.createdAt)}</td>
                    <td className="mono">{notification.business.cards[0]?.code ?? "-"}</td>
                    <td>{notification.business.name}</td>
                    <td>
                      <Badge tone={notification.type === "ACTIVATION_SUCCESS" ? "brand" : "info"}>
                        {notification.type}
                      </Badge>
                    </td>
                    <td className="mono">{notification.recipient}</td>
                    <td>
                      <Badge tone={meta.tone}>{meta.label}</Badge>
                    </td>
                    <td className="muted" style={{ maxWidth: 260 }}>
                      {notification.error ?? "-"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
