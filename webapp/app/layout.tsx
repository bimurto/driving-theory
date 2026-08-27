import type { Metadata } from "next";
import "./globals.css";
import { SiteShell } from "@/components/SiteShell";
export const metadata: Metadata = { title: "RoadReady — Class B", description: "English study practice for German Class B driving theory." };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body><SiteShell>{children}</SiteShell></body></html>; }
