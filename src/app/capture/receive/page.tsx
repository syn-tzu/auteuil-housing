"use client";
import { useEffect, useRef, useState } from "react";

type Status =
  | { kind: "waiting" }
  | { kind: "sending"; url: string }
  | { kind: "done"; text: string }
  | { kind: "signin"; url: string }
  | { kind: "error"; text: string };

/** Popup opened by the bookmarklet. Receives the page HTML via postMessage and forwards it to /api/capture. */
export default function ReceivePage() {
  const [status, setStatus] = useState<Status>({ kind: "waiting" });
  const handled = useRef(false);

  useEffect(() => {
    async function onMessage(ev: MessageEvent) {
      const d = ev.data;
      if (!d || d.type !== "auteuil-capture") return;
      // Tell the bookmarklet to stop resending.
      try {
        ev.source && (ev.source as Window).postMessage({ type: "auteuil-received" }, "*");
      } catch {}
      if (handled.current) return;
      handled.current = true;
      setStatus({ kind: "sending", url: d.url });
      try {
        const res = await fetch("/api/capture", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ url: d.url, html: d.html, title: d.title }),
        });
        if (res.status === 401) {
          setStatus({ kind: "signin", url: d.url });
          return;
        }
        const raw = await res.text();
        let j: { ok?: boolean; error?: string; reason?: string; created?: number; updated?: number; source_site?: string };
        try {
          j = JSON.parse(raw);
        } catch {
          throw new Error(`The app answered with ${res.status} ${res.statusText}. Try again in a minute.`);
        }
        if (!res.ok) throw new Error(j.error ?? res.statusText);
        if (j.ok) setStatus({ kind: "done", text: `Added ${j.created} new, updated ${j.updated} (source: ${j.source_site}).` });
        else setStatus({ kind: "error", text: j.reason ?? "No listing found on that page." });
      } catch (e) {
        setStatus({ kind: "error", text: e instanceof Error ? e.message : String(e) });
      }
    }
    window.addEventListener("message", onMessage);
    // Let the bookmarklet know this window is ready to receive.
    try {
      window.opener?.postMessage({ type: "auteuil-ready" }, "*");
    } catch {}
    return () => window.removeEventListener("message", onMessage);
  }, []);

  return (
    <main className="page">
      <h1>Save to Auteuil</h1>
      {status.kind === "waiting" && (
        <p>
          Waiting for the page…
          <br />
          <small>If this stays for more than 15 seconds, close this window and click the bookmark again.</small>
        </p>
      )}
      {status.kind === "sending" && (
        <p>
          Reading the page with Claude… 10 seconds for one listing, up to a minute for a results page.
          <br />
          <small>{status.url}</small>
        </p>
      )}
      {status.kind === "done" && (
        <p style={{ color: "var(--good)" }}>
          ✓ {status.text} <a href="/" target="_blank" rel="noreferrer">Open the app</a>
        </p>
      )}
      {status.kind === "signin" && (
        <p className="error">
          You're not signed in to the app in this browser.{" "}
          <a href="/login" target="_blank" rel="noreferrer">Sign in</a>, then close this window and click the
          bookmark again.
        </p>
      )}
      {status.kind === "error" && <p className="error">✕ {status.text}</p>}
    </main>
  );
}
