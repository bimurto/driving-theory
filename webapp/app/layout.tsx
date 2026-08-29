import type { Metadata } from "next";
import "./globals.css";
import { LearningProgressProvider } from "@/components/LearningProgressProvider";
import { SiteShell } from "@/components/SiteShell";
export const metadata: Metadata = { title: "RoadReady — Class B", description: "English study practice for German Class B driving theory." };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body><LearningProgressProvider><SiteShell>{children}</SiteShell></LearningProgressProvider></body></html>; }
