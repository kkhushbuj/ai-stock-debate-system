import { Suspense } from "react";
import { DebateView } from "@/components/debate/DebateView";

export const metadata = { title: "Debate | StockDuel" };

export default function DebatePage() {
  return (
    <Suspense fallback={<div className="wrap" style={{ paddingTop: 140 }}><div className="skel" style={{ height: 240 }} /></div>}>
      <DebateView />
    </Suspense>
  );
}
