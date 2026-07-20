import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({ meta: [{ title: "Sign in — FinScope" }] }),
  validateSearch: (s: Record<string, unknown>) => ({
    next: typeof s.next === "string" ? s.next : "",
  }),
  component: AuthPage,
});

// Only accept same-origin relative paths — never an absolute URL.
function safeNext(next: string, fallback: string) {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return fallback;
  return next;
}

function AuthPage() {
  const navigate = useNavigate();
  const { next } = Route.useSearch();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");

  const target = safeNext(next, "/dashboard");
  const absoluteTarget =
    typeof window !== "undefined" ? window.location.origin + target : target;

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) window.location.replace(target);
    });
  }, [target]);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return toast.error(error.message);
    window.location.replace(target);
  }

  async function signUp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { emailRedirectTo: absoluteTarget, data: { full_name: fullName } },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Account created. You can sign in now.");
  }

  async function google() {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: absoluteTarget });
    if (r.error) toast.error(String(r.error));
  }

  // suppress unused import warning
  void navigate;

  return (
    <div className="min-h-screen flex bg-background">
      <aside className="hidden lg:flex flex-1 bg-navy text-navy-foreground p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 [background:radial-gradient(circle_at_30%_30%,_var(--color-gold),transparent_50%)]" />
        <Link to="/" className="flex items-center gap-2 relative">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-gradient-gold text-navy font-display text-xl font-bold">F</div>
          <span className="font-display text-2xl">FinScope</span>
        </Link>
        <div className="relative">
          <p className="text-xs tracking-[0.4em] text-gold uppercase mb-4">AI Financial Analyst</p>
          <h2 className="font-display text-4xl leading-tight">Financial clarity, on demand.</h2>
          <p className="mt-4 text-navy-foreground/70 max-w-md">Upload your statements. Receive ratios, a risk score, red flags and strategic advice within minutes.</p>
        </div>
        <p className="text-xs text-navy-foreground/50 relative">© {new Date().getFullYear()} FinScope</p>
      </aside>
      <div className="flex-1 flex items-center justify-center p-6">
        <Card className="w-full max-w-md shadow-elegant">
          <CardHeader>
            <CardTitle className="font-display text-2xl">Welcome</CardTitle>
            <CardDescription>Sign in or create your FinScope account.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={google} variant="outline" className="w-full mb-4">
              <svg className="h-4 w-4" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.3 6.1 29.4 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.1l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.3 6.1 29.4 4 24 4 16.3 4 9.7 8.3 6.3 14.1z"/><path fill="#4CAF50" d="M24 44c5.2 0 10-2 13.6-5.2l-6.3-5.3C29.2 35 26.7 36 24 36c-5.3 0-9.7-3.3-11.3-7.9l-6.5 5C9.6 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4-4 5.3l6.3 5.3C41.6 35.5 44 30.2 44 24c0-1.2-.1-2.3-.4-3.5z"/></svg>
              Continue with Google
            </Button>
            <div className="relative my-4 text-center text-xs text-muted-foreground"><span className="bg-card px-2 relative z-10">or</span><div className="absolute inset-0 top-1/2 h-px bg-border"/></div>
            <Tabs defaultValue="signin">
              <TabsList className="w-full grid grid-cols-2"><TabsTrigger value="signin">Sign in</TabsTrigger><TabsTrigger value="signup">Sign up</TabsTrigger></TabsList>
              <TabsContent value="signin">
                <form onSubmit={signIn} className="space-y-3 mt-4">
                  <div><Label>Email</Label><Input type="email" value={email} onChange={e => setEmail(e.target.value)} required /></div>
                  <div><Label>Password</Label><Input type="password" value={password} onChange={e => setPassword(e.target.value)} required /></div>
                  <Button type="submit" variant="navy" className="w-full" disabled={loading}>{loading ? "Signing in…" : "Sign in"}</Button>
                </form>
              </TabsContent>
              <TabsContent value="signup">
                <form onSubmit={signUp} className="space-y-3 mt-4">
                  <div><Label>Full name</Label><Input value={fullName} onChange={e => setFullName(e.target.value)} required /></div>
                  <div><Label>Email</Label><Input type="email" value={email} onChange={e => setEmail(e.target.value)} required /></div>
                  <div><Label>Password</Label><Input type="password" minLength={6} value={password} onChange={e => setPassword(e.target.value)} required /></div>
                  <Button type="submit" variant="gold" className="w-full" disabled={loading}>{loading ? "Creating…" : "Create account"}</Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
