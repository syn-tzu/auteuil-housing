"use client";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { createBrowserSupabase } from "@/lib/supabase/client";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(params.get("error"));
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [forgot, setForgot] = useState(false);

  // A password-reset link that lands here with "#access_token=…&type=recovery" belongs on the reset page.
  useEffect(() => {
    if (window.location.hash.includes("type=recovery")) {
      router.replace("/auth/reset-password" + window.location.hash);
    }
  }, [router]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setInfo(null);
    const supabase = createBrowserSupabase();
    if (forgot) {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/auth/reset-password`,
      });
      setBusy(false);
      if (error) return setError(error.message);
      setInfo("Check your email for a link to choose a new password.");
      return;
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.replace(params.get("next") || "/");
    router.refresh();
  }

  return (
    <form className="login" onSubmit={onSubmit}>
      <h1>Auteuil &amp; Passy</h1>
      <label>
        Email
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
      </label>
      {!forgot && (
        <label>
          Password
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
        </label>
      )}
      {error && <div className="error">{error}</div>}
      {info && <div style={{ color: "var(--good)", fontSize: 13, marginTop: 8 }}>{info}</div>}
      <button type="submit" disabled={busy}>
        {busy ? "Please wait…" : forgot ? "Email me a reset link" : "Sign in"}
      </button>
      <p style={{ marginTop: 14, fontSize: 13, textAlign: "center" }}>
        <a href="#" onClick={(e) => { e.preventDefault(); setForgot(!forgot); setError(null); setInfo(null); }}>
          {forgot ? "Back to sign in" : "Forgot your password?"}
        </a>
      </p>
    </form>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
