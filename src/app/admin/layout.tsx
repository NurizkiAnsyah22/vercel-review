import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/server/auth/guard";
import AdminNav from "./AdminNav";
import LogoutButton from "./LogoutButton";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await getAdminSession();
  if (!session) redirect("/login");

  return (
    <div className="admin-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">Virai Review Card</div>
        <AdminNav />
        <div className="sidebar-foot">
          Signed in as
          <br />
          <strong style={{ color: "#e2e8f0" }}>{session.sub}</strong>
        </div>
      </aside>

      <div className="admin-main">
        <header className="topbar">
          <span style={{ fontWeight: 650 }}>Admin Console</span>
          <div style={{ marginLeft: "auto" }}>
            <LogoutButton />
          </div>
        </header>
        <main className="admin-content">{children}</main>
      </div>
    </div>
  );
}
