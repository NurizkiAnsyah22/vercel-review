"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const STATUS_FLOW = [
  "WAITING_ACTIVATION",
  "ACTIVATED",
  "READY_TO_PRINT",
  "READY_TO_SHIP",
  "SHIPPED",
  "CANCELLED",
] as const;

type Order = {
  id: string;
  status: string;
  buyerWhatsappNumber: string;
  buyerName: string | null;
} | null;

export default function OrderPanel({ cardId, order }: { cardId: string; order: Order }) {
  const router = useRouter();
  const [buyerWhatsappNumber, setBuyerWhatsappNumber] = useState("");
  const [buyerName, setBuyerName] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function createOrder() {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardId, buyerWhatsappNumber, buyerName: buyerName || undefined }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (response.ok) {
        setMessage("Order dibuat");
        setBuyerWhatsappNumber("");
        setBuyerName("");
        router.refresh();
      } else {
        setMessage(data.error ?? "Gagal membuat order");
      }
    } finally {
      setBusy(false);
    }
  }

  async function setStatus(status: string) {
    if (!order) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`/api/admin/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      setMessage(response.ok ? `Status → ${status}` : "Gagal ubah status");
      if (response.ok) router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <div className="card-title">ORDER / PRODUKSI</div>
      <div className="divider" />

      {order ? (
        <>
          <p style={{ marginTop: 0 }}>
            <strong>Status order:</strong> {order.status}
            <br />
            <strong>Nomor pembeli:</strong> {order.buyerWhatsappNumber}
            {order.buyerName ? (
              <>
                <br />
                <strong>Nama pembeli:</strong> {order.buyerName}
              </>
            ) : null}
          </p>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {STATUS_FLOW.map((status) => (
              <button
                key={status}
                type="button"
                className="btn btn-sm"
                disabled={busy || order.status === status}
                onClick={() => setStatus(status)}
              >
                {status.replace(/_/g, " ")}
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          <p style={{ marginTop: 0, color: "#6b7280", fontSize: 13 }}>
            Belum ada order untuk kartu ini. Order mengaitkan kartu fisik dengan nomor WhatsApp pembeli
            sebagai data kontak.
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input
              className="input"
              style={{ flex: "1 1 220px" }}
              placeholder="628xxxxxxxxxx (nomor pembeli)"
              value={buyerWhatsappNumber}
              onChange={(event) => setBuyerWhatsappNumber(event.target.value)}
            />
            <input
              className="input"
              style={{ flex: "1 1 160px" }}
              placeholder="Nama pembeli (opsional)"
              value={buyerName}
              onChange={(event) => setBuyerName(event.target.value)}
            />
            <button
              type="button"
              className="btn btn-primary"
              disabled={busy || buyerWhatsappNumber.trim() === ""}
              onClick={createOrder}
            >
              Buat Order
            </button>
          </div>
        </>
      )}

      {message && <p style={{ fontSize: 13, marginBottom: 0 }}>{message}</p>}
    </div>
  );
}
