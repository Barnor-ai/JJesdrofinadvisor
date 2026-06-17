import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { ShieldCheck, KeyRound, LogOut, Trash2, Sparkles, CheckCircle2, RotateCcw } from "lucide-react";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings — FinScope" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [email, setEmail] = useState("");
  const [provider, setProvider] = useState<string>("email");
  const [newPwd, setNewPwd] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? "");
      const app = data.user?.app_metadata as { provider?: string } | undefined;
      setProvider(app?.provider ?? "email");
    });
  }, []);

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPwd.length < 8) return toast.error("Use at least 8 characters");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: newPwd });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Password updated");
    setNewPwd("");
  }

  async function signOutEverywhere() {
    await supabase.auth.signOut({ scope: "global" });
    qc.clear();
    toast.success("Signed out of all devices");
    navigate({ to: "/auth", replace: true });
  }

  async function deleteAllData() {
    if (!confirm("Permanently delete all your companies, analyses and chats? This cannot be undone.")) return;
    setBusy(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setBusy(false); return; }
    await supabase.from("chat_messages").delete().eq("user_id", user.id);
    await supabase.from("analyses").delete().eq("user_id", user.id);
    await supabase.from("companies").delete().eq("user_id", user.id);
    setBusy(false);
    toast.success("All your FinScope data has been deleted");
  }

  return (
    <AppShell>
      <div className="p-6 md:p-10 max-w-3xl mx-auto space-y-6">
        <div>
          <p className="text-xs tracking-[0.3em] text-gold uppercase">Settings</p>
          <h1 className="font-display text-4xl mt-2">Admin & security</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-gold" /> Account</CardTitle>
            <CardDescription>Signed in as {email || "—"} · provider: <span className="font-medium">{provider}</span></CardDescription>
          </CardHeader>
        </Card>

        {provider === "email" && (
          <Card>
            <CardHeader>
              <CardTitle className="font-display flex items-center gap-2"><KeyRound className="h-5 w-5 text-gold" /> Change password</CardTitle>
              <CardDescription>Use at least 8 characters. Mix letters, numbers and symbols.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={changePassword} className="flex gap-2 items-end">
                <div className="flex-1"><Label>New password</Label><Input type="password" value={newPwd} onChange={e => setNewPwd(e.target.value)} required /></div>
                <Button type="submit" variant="navy" disabled={busy}>Update</Button>
              </form>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2"><LogOut className="h-5 w-5 text-gold" /> Sessions</CardTitle>
            <CardDescription>Sign out from all browsers and devices where this account is active.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={signOutEverywhere}>Sign out everywhere</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2"><Sparkles className="h-5 w-5 text-gold" /> AI & integrations</CardTitle>
            <CardDescription>Third-party services connected to your FinScope workspace.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center justify-between border border-border rounded-md p-3">
              <div>
                <p className="font-medium">FinScope AI (Gemini)</p>
                <p className="text-xs text-muted-foreground">Used for statement extraction and the AI advisor chat.</p>
              </div>
              <span className="inline-flex items-center gap-1 text-success text-xs"><CheckCircle2 className="h-3 w-3" /> Connected</span>
            </div>
            <div className="flex items-center justify-between border border-border rounded-md p-3">
              <div>
                <p className="font-medium">Google sign-in</p>
                <p className="text-xs text-muted-foreground">OAuth provider for fast account access.</p>
              </div>
              <span className={`text-xs ${provider === "google" ? "text-success" : "text-muted-foreground"}`}>{provider === "google" ? "Active" : "Available"}</span>
            </div>
            <div className="flex items-center justify-between border border-border rounded-md p-3">
              <div>
                <p className="font-medium">Encrypted storage</p>
                <p className="text-xs text-muted-foreground">Uploaded statements & logos are stored in private buckets.</p>
              </div>
              <span className="inline-flex items-center gap-1 text-success text-xs"><CheckCircle2 className="h-3 w-3" /> Enabled</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-destructive/40">
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2 text-destructive"><Trash2 className="h-5 w-5" /> Danger zone</CardTitle>
            <CardDescription>Permanently delete all FinScope data tied to your account. Your login remains.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="destructive" onClick={deleteAllData} disabled={busy}>Delete all my data</Button>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
