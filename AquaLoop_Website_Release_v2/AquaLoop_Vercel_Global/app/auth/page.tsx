"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabase-browser";

function AuthContent() {
  const router = useRouter();
  const params = useSearchParams();
  const initial = params.get("mode") === "signup" ? "signup" : "login";
  const [mode, setMode] = useState<"login" | "signup">(initial);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getSupabaseBrowser().auth.getSession().then(({ data }) => {
      if (data.session) router.replace("/dashboard");
    });
  }, [router]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    const supabase = getSupabaseBrowser();

    if (mode === "signup") {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: name } },
      });
      if (error) setMessage(error.message);
      else if (data.session) router.push("/dashboard");
      else setMessage("Account created. Check your email if confirmation is enabled in Supabase.");
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setMessage(error.message);
      else router.push("/dashboard");
    }
    setBusy(false);
  }

  return (
    <main className="auth-shell">
      <section className="auth-visual">
        <Link className="brand brand-light" href="/"><span className="brand-mark">↻</span><span>AquaLoop</span></Link>
        <div>
          <span className="eyebrow light">LOCAL-FIRST · GLOBALLY VISIBLE</span>
          <h1>One water system.<br />One clear signal.</h1>
          <p>Live device telemetry, tank timing and filter service status in a dashboard built for real hardware.</p>
        </div>
        <small>Designed for non-potable greywater research and recovery monitoring.</small>
      </section>

      <section className="auth-panel">
        <form className="auth-card" onSubmit={submit}>
          <div className="auth-tabs">
            <button type="button" className={mode === "login" ? "active" : ""} onClick={() => setMode("login")}>Log in</button>
            <button type="button" className={mode === "signup" ? "active" : ""} onClick={() => setMode("signup")}>Sign up</button>
          </div>
          <h2>{mode === "login" ? "Welcome back" : "Create your AquaLoop account"}</h2>
          <p>{mode === "login" ? "Open your live device dashboard." : "Add and manage your own AquaLoop devices."}</p>

          {mode === "signup" && (
            <label className="form-field"><span>Name</span><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" required /></label>
          )}
          <label className="form-field"><span>Email</span><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required /></label>
          <label className="form-field"><span>Password</span><input type="password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Minimum 6 characters" required /></label>

          <button className="button button-primary full" disabled={busy}>{busy ? "Please wait…" : mode === "login" ? "Log in" : "Create account"}</button>
          {message && <div className="form-message">{message}</div>}
          <small className="auth-note">Authentication is handled by Supabase. Device data is separated by account using database access rules.</small>
        </form>
      </section>
    </main>
  );
}

export default function AuthPage() {
  return <Suspense><AuthContent /></Suspense>;
}
