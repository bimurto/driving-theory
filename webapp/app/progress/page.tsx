import { Suspense } from "react";
import { ProgressPanel } from "@/components/ProgressPanel";

export default function ProgressPage() {
  return <Suspense><ProgressPanel /></Suspense>;
}
