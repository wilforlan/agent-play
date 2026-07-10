"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { usePlatformAuth } from "./platform-auth-context";
import styles from "./platform-admin.module.css";

const NAV = [
  { href: "/platform/overview", label: "Overview" },
  { href: "/platform/purchases", label: "Purchases" },
  { href: "/platform/amenities", label: "Amenities" },
  { href: "/platform/activity", label: "Activity" },
  { href: "/platform/wallet", label: "Wallet" },
  { href: "/platform/aql", label: "AQL" },
] as const;

export function PlatformShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { auth, logout } = usePlatformAuth();

  if (auth === null) {
    return <div className={styles.page}>{children}</div>;
  }

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <aside className={styles.sidebar}>
          <div className={styles.brand}>Space platform</div>
          <div className={styles.spaceLabel}>
            {auth.spaceName}
            <br />
            {auth.nodeId}
          </div>
          <nav className={styles.nav}>
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={[
                  styles.navLink,
                  pathname === item.href || pathname.startsWith(`${item.href}/`)
                    ? styles.navLinkActive
                    : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <button type="button" className={styles.button} onClick={logout}>
            Sign out
          </button>
        </aside>
        <main className={styles.main}>{children}</main>
      </div>
    </div>
  );
}

export function PlatformRequireAuth({ children }: { children: ReactNode }) {
  const { auth } = usePlatformAuth();
  if (auth === null) {
    return (
      <div className={styles.panel}>
        <p className={styles.lead}>Sign in at /platform to access this page.</p>
        <Link href="/platform" className={styles.navLink}>
          Go to login
        </Link>
      </div>
    );
  }
  return <>{children}</>;
}
