import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — CA FirmHub" },
      { name: "description", content: "Sign in to your CA FirmHub workspace or create a new firm." },
      { property: "og:title", content: "Sign in — CA FirmHub" },
      { property: "og:description", content: "Access your firm's clients, compliance and billing." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up" | "forgot">("in");
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({ email: "", password: "", full_name: "", firm_name: "" });

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
    });
    const { data } = supabase.auth.onAuthStateChange((e, s) => {
      if (e === "SIGNED_IN" && s) navigate({ to: "/dashboard", replace: true });
    });
    return () => data.subscription.unsubscribe();
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "in") {
        const { error } = await supabase.auth.signInWithPassword({ email: f.email, password: f.password });
        if (error) throw error;
      } else if (mode === "up") {
        const { error } = await supabase.auth.signUp({
          email: f.email,
          password: f.password,
          options: { emailRedirectTo: window.location.origin + "/dashboard", data: { full_name: f.full_name, firm_name: f.firm_name } },
        });
        if (error) throw error;
        toast.success("Check your email to confirm your account.");
        setMode("in");
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(f.email, { redirectTo: window.location.origin + "/reset-password" });
        if (error) throw error;
        toast.success("Password reset link sent.");
        setMode("in");
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/auth" });
    if (r.error) toast.error(r.error.message ?? "Google sign-in failed");
  }

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  return (
    <div className="grid min-h-screen md:grid-cols-2">
      <div className="hidden bg-ink p-12 text-primary-foreground md:flex md:flex-col md:justify-between">
        <div className="font-display text-2xl font-semibold">FirmHub<span className="text-brass">.</span></div>
        <blockquote className="font-display text-3xl leading-snug">
          "Due dates don't move. <span className="text-brass">Your practice should keep up.</span>"
        </blockquote>
        <p className="text-sm text-primary-foreground/60">Practice management for CA firms & practitioners</p>
      </div>
      <div className="flex items-center justify-center p-6">
        <form onSubmit={submit} className="w-full max-w-sm space-y-4">
          <h1 className="text-3xl font-semibold">
            {mode === "in" ? "Welcome back" : mode === "up" ? "Create your firm" : "Reset password"}
          </h1>
          {mode === "up" && (
            <>
              <div><Label className="mb-1.5 block">Your name</Label><Input required value={f.full_name} onChange={set("full_name")} /></div>
              <div><Label className="mb-1.5 block">Firm name</Label><Input required value={f.firm_name} onChange={set("firm_name")} placeholder="e.g. Sharma & Associates" /></div>
            </>
          )}
          <div><Label className="mb-1.5 block">Email</Label><Input type="email" required value={f.email} onChange={set("email")} /></div>
          {mode !== "forgot" && (
            <div><Label className="mb-1.5 block">Password</Label><Input type="password" required minLength={8} value={f.password} onChange={set("password")} /></div>
          )}
          <Button className="w-full" disabled={busy}>
            {busy ? "Please wait…" : mode === "in" ? "Sign in" : mode === "up" ? "Create account" : "Send reset link"}
          </Button>
          {mode !== "forgot" && (
            <Button type="button" variant="outline" className="w-full" onClick={google}>Continue with Google</Button>
          )}
          <div className="flex justify-between text-sm text-muted-foreground">
            <button type="button" className="hover:text-foreground" onClick={() => setMode(mode === "in" ? "up" : "in")}>
              {mode === "in" ? "New firm? Sign up" : "Have an account? Sign in"}
            </button>
            {mode === "in" && <button type="button" className="hover:text-foreground" onClick={() => setMode("forgot")}>Forgot password?</button>}
          </div>
          <p className="text-xs text-muted-foreground">Staff and clients receive their login from the firm admin.</p>
        </form>
      </div>
    </div>
  );
}
