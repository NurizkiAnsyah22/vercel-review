"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CardActions({
  cardId,
  status,
}: {
  cardId: string;
  status: string;
}) {
  const router = useRouter();
  const [businessId, setBusinessId] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState("");

  async function run(action: string, body?: unknown) {
    setBusy(action);
    setMessage("");
    try {
      const response = await fetch(`/api/admin/cards/${cardId}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = (await response.json().catch(() => ({}))) as {
        data?: { message?: string };
        error?: string;
      };
      setMessage(response.ok ? (data.data?.message ?? "Berhasil") : (data.error ?? "Gagal"));
      if (response.ok) router.refresh();
    } finally {
      setBusy("");
    }
  }

  return (
    <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: 16 }}>
      <h2 style={{ fontSize: 15, marginTop: 0 }}>Aksi</h2>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button type="button" disabled={busy !== "" || status !== "ACTIVE"} onClick={() => run("suspend")}>
          Suspend
        </button>
        <button type="button" disabled={busy !== "" || status !== "SUSPENDED"} onClick={() => run("reactivate")}>
          Reactivate
        </button>
        <button type="button" disabled={busy !== ""} onClick={() => run("reset")}>
          Reset
        </button>
        <button type="button" disabled={busy !== "" || status !== "PENDING"} onClick={() => run("resolve")}>
          Resolve Place ID
        </button>
      </div>

      <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
        <input
          placeholder="businessId tujuan"
          value={businessId}
          onChange={(event) => setBusinessId(event.target.value)}
          style={{ flex: 1, padding: 8 }}
        />
        <button
          type="button"
          disabled={busy !== "" || businessId.trim() === ""}
          onClick={() => run("reassign", { businessId: businessId.trim() })}
        >
          Reassign
        </button>
      </div>

      {message && <p style={{ marginTop: 10, fontSize: 13 }}>{message}</p>}
    </div>
  );
}
