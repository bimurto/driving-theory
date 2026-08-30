"use client";
import Link from "next/link";
import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
export function SiteShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const links = [{ href: "/", label: "Home" }, { href: "/practice", label: "Practice" }, { href: "/starred", label: "Starred" }, { href: "/notes", label: "Notes" }, { href: "/topics", label: "Topics" }, { href: "/progress", label: "Progress" }, { href: "/account", label: "Account" }];
  const active = (href: string) => href === "/" ? pathname === "/" : pathname.startsWith(href);
  return <div className="site-shell"><header className="topbar"><Link className="brand" href="/">RoadReady <span>Class B</span></Link><nav aria-label="Main navigation">{links.slice(1).map((link) => <Link className={active(link.href) ? "active" : ""} key={link.href} href={link.href}>{link.label}</Link>)}</nav></header><main>{children}</main><nav className="mobile-nav" aria-label="Mobile navigation">{links.map((link) => <Link className={active(link.href) ? "active" : ""} key={link.href} href={link.href} aria-current={active(link.href) ? "page" : undefined}>{link.label}</Link>)}</nav></div>;
}
