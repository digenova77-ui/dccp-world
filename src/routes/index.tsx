import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import "@/dccp/styles/main.css";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const [live, setLive] = useState(false);

  useEffect(() => {
    const w = window as Window & { __dccp?: boolean };
    if (!w.__dccp) {
      w.__dccp = true;
      void import("@/dccp/main");
    }
    let frame = 0;
    const tick = () => {
      if (document.querySelector("#ui .gate, #ui .dock")) {
        setLive(true);
        return;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <main className="dccp-shell">
      <canvas
        id="game"
        aria-label="DCCP World, a night view of Earth. Drag to orbit, scroll or pinch to descend into cities. Belleville, Ontario is in view."
      />
      <div id="ui" />
      {live ? null : <EntrySplash />}
    </main>
  );
}

function EntrySplash() {
  return (
    <div className="gate" role="dialog" aria-labelledby="splash-title">
      <div className="gate-card">
        <h1 id="splash-title">DCCP World</h1>
        <p className="lede">
          A night Earth you can walk down into. Belleville, Ontario is already in view — city lights on, capitals
          in gold.
        </p>
        <p className="loading" style={{ display: "block" }}>
          Loading the world…
        </p>
      </div>
    </div>
  );
}
