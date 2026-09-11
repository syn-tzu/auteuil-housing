"use client";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabase } from "@/lib/supabase/client";

/** Page the password-reset email lands on. Works for both link styles Supabase uses. */
export default function ResetPasswordPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const supabase = createBrowserSupabase();
    // The browser client reads a "#access_token=…" link automatically; the server callback
    // route handles the "?code=…" style. Either way we just wait for a session to appear.
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN" || event === "INITIAL_SESSION")) setReady(true);
    });
    const t = setTimeout(() => {
      if (!ready) setError("This reset link has expired or already been used. Go back to sign in and request a new one.");
    }, 8000);
    return () => {
      sub.subscription.unsubscribe();
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (password.length < 8) return setError("Use at least 8 characters.");
    if (password !== confirm) return setError("The two passwords don't match.");
    setBusy(true);
    setError(null);
    const supabase = createBrowserSupabase();
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) return setError(error.message);
    router.replace("/");
    router.refresh();
  }

  return (
    <form className="login" onSubmit={onSubmit}>
      <h1>Choose a new password</h1>
      {!ready && !error && <p>Checking your reset link…</p>}
      {ready && (
        <>
          <label>
            New password
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" required />
          </label>
          <label>
            Repeat it
            <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" required />
          </label>
          <button type="submit" disabled={busy}>{busy ? "Saving…" : "Save password"}</button>
        </>
      )}
      {error && <div className="error">{error}</div>}
      <p style={{ marginTop: 16, fontSize: 13 }}><a href="/login">Back to sign in</a></p>
    </form>
  );
}
