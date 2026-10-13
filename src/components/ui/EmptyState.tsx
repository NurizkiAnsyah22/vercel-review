export default function EmptyState({ title, message }: { title: string; message?: string }) {
  return (
    <div className="card" style={{ textAlign: "center", padding: 32 }}>
      <div style={{ fontWeight: 650 }}>{title}</div>
      {message ? (
        <div className="muted" style={{ marginTop: 6 }}>
          {message}
        </div>
      ) : null}
    </div>
  );
}
