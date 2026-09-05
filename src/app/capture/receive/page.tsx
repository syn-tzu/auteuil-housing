"use client";
import { useEffect, useRef, useState } from "react";

type Status = { kind: "waiting" } | { kind: "sending"; url: string } | { kind: "done"; text: string } | { kind: "error"; text: string };

/** Popup opened by the bookmarklet. Receives the page HTML via postMessage and forwards it to /api/capture. */
export default function ReceivePage() {
  const [status, setStatus] = useState<Status>({ kind: "waiting" });
  const handled = useRef(false);

  useEffect(() => {
    async function onMessage(ev: MessageEvent) {
      const d = ev.data;
      if (!d || d.type !== "auteuil-capture" || handled.current) return;
      handled.current = true;
      setStatus({ kind: "sending", url: d.url });
      try {
        const res = await fetch("/api/capture", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ url: d.url, html: d.html, title: d.title }),
        });
        const j = await res.json();
        if (!res.ok) throw new Error(j.error ?? res.statusText);
        if (j.ok) setStatus({ kind: "done", text: `Added ${j.created} new, updated ${j.updated} (source: ${j.source_site}).` });
        else setStatus({ kind: "error", text: j.reason ?? "No listing found on that page." });
      } catch (e) {
        setStatus({ kind: "error", text: e instanceof Error ? e.message : String(e) });
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  return (
    <main className="page">
      <h1>Save to Auteuil</h1>
      {status.kind === "waiting" && <p>Waiting for the page… (if nothing happens in 10 seconds, close this and click the button again)</p>}
      {status.kind === "sending" && <p>Reading the listing with Claude… this takes 10–30 seconds.<br /><small>{status.url}</small></p>}
      {status.kind === "done" && (
        <p style={{ color: "var(--good)" }}>
          ✓ {status.text} <a href="/">Open the app</a>
        </p>
      )}
      {status.kind === "error" && <p className="error">✕ {status.text}</p>}
    </main>
  );
}
