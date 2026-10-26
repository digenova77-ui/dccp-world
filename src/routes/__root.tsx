import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AuthProvider } from "@/lib/auth/provider";
import { PreviewHostBridge } from "@/components/preview-host-bridge";
import { auditDom, type ImpurityFinding } from "@/dccp/iris/gates";
import appCss from "../styles.css?url";

const APP_NAME = "DCCP World";

/** Routes the audit hook knows. A live link to anything else is DEAD_LINK. */
const KNOWN_ROUTES = ["/", "/machine", "/explorer", "/arbitrage", "/pyramid", "/story"];

/** Iris's deterministic audit, visible: with ?iris-audit=1 the live page is
 * checked against the impurity taxonomy (IMP-01…IMP-13, incl. the no-password
 * law) and every violation renders into #iris-audit. Client-side only —
 * SSR renders the empty hook. Re-runs on an interval so interactions are
 * re-checked. */
function IrisAuditHook() {
  const [findings, setFindings] = useState<ImpurityFinding[] | null>(null);
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("iris-audit") !== "1") return;
    const run = () => {
      try {
        setFindings(auditDom(document, KNOWN_ROUTES));
      } catch {
        // iris-gate: deliberate — the audit hook must never break the page;
        // a failed audit run surfaces as its own finding next pass.
        setFindings([
          {
            id: "AUDIT-FAULT",
            severity: "P1",
            where: "hook",
            reason: "The audit hook faulted this pass; the page itself is unaffected.",
          },
        ]);
      }
    };
    run();
    const t = setInterval(run, 2000);
    return () => clearInterval(t);
  }, []);
  if (findings === null) return <div id="iris-audit" style={{ display: "none" }} aria-hidden="true" />;
  return (
    <div
      id="iris-audit"
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 99999,
        maxHeight: "38vh",
        overflowY: "auto",
        background: "rgba(3,5,11,0.94)",
        color: "#f3efe6",
        borderTop: "1px solid #14b8a6",
        padding: "10px 14px",
        fontSize: "12px",
        fontFamily: "ui-monospace, monospace",
      }}
      role="status"
      aria-label="Iris deterministic audit"
    >
      <div style={{ fontWeight: 700, marginBottom: 6 }}>
        IRIS AUDIT · {findings.length === 0 ? "CLEAN — no impurities found" : `${findings.length} finding(s)`}
      </div>
      {findings.map((f, i) => (
        <div key={i} style={{ marginBottom: 4 }}>
          <span style={{ color: f.severity === "P0" ? "#ff6b6b" : "#e8c36a", fontWeight: 700 }}>
            [{f.severity} {f.id}]
          </span>{" "}
          {f.where} — {f.reason}
        </div>
      ))}
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: APP_NAME },
      { name: "description", content: "DCCP World: an explorable night Earth. Orbit Japan’s city lights, open countries and chambers, and ask Iris." },
      { name: "theme-color", content: "#03050b" },
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/__grok/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/__grok/icon-180.png" },
      { rel: "preload", href: "/fonts/Sora-VF.subset.woff2", as: "font", type: "font/woff2", crossOrigin: "anonymous" },
      { rel: "preload", href: "/fonts/Figtree-VF.subset.woff2", as: "font", type: "font/woff2", crossOrigin: "anonymous" },
    ],
  }),
  component: () => (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <PreviewHostBridge />
        <IrisAuditHook />
        <AuthProvider>
          <Outlet />
        </AuthProvider>
        <Scripts />
      </body>
    </html>
  ),
});
