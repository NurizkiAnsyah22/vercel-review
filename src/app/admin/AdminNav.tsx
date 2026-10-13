"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/admin", label: "Dashboard", icon: "▦" },
  { href: "/admin/cards", label: "Cards", icon: "▭" },
  { href: "/admin/printing", label: "Printing", icon: "🖨" },
  { href: "/admin/orders", label: "Orders / Sales", icon: "🧾" },
  { href: "/admin/customers", label: "Customers", icon: "👥" },
  { href: "/admin/notifications", label: "Notifications", icon: "🔔" },
  { href: "/admin/settings", label: "Settings", icon: "⚙" },
];

export default function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="sidebar-nav">
      {ITEMS.map((item) => {
        const active = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
        return (
          <Link key={item.href} href={item.href} data-active={active ? "true" : "false"}>
            <span aria-hidden style={{ width: 18, textAlign: "center" }}>
              {item.icon}
            </span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
