"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function GenerateCardsForm() {
  const router = useRouter();
  const [count, setCount] = useState("10");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count: Number(count) }),
      });
      const body = (await response.json().catch(() => ({}))) as {
        data?: { created: number };
        error?: string;
      };
      if (response.ok) {
        setMessage(`${body.data?.created ?? 0} kartu dibuat`);
        router.refresh();
      } else {
        setMessage(body.error ?? "Gagal membuat kartu");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 16 }}>
      <input
        type="number"
        min={1}
        max={500}
        value={count}
        onChange={(event) => setCount(event.target.value)}
        style={{ width: 90, padding: 8 }}
      />
      <button type="button" onClick={onSubmit} disabled={loading} style={{ padding: "8px 14px" }}>
        {loading ? "Membuat..." : "Generate Kartu"}
      </button>
      {message && <span style={{ color: "#374151", fontSize: 13 }}>{message}</span>}
    </div>
  );
}
