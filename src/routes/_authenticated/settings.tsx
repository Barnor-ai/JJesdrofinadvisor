import { pageMetadata } from "@/lib/page-metadata";
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
import { ShieldCheck, KeyRound, LogOut, Sparkles, CheckCircle2, RotateCcw } from "lucide-react";
import { passwordError } from '@/lib/security-rules';
import { getMembership, resetOwnInformation } from '@/lib/saas.functions';
import { useServerFn } from '@tanstack/react-start';

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => pageMetadata("Settings — FinScope", "Manage your FinScope account security and connected services."),
  component: SettingsPage,
});

function SettingsPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [email, setEmail] = useState("");
  const [provider, setProvider] = useState<string>("email");
  const [newPwd, setNewPwd] = useState("");
  const [currentPwd, setCurrentPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const membership = useServerFn(getMembership);
  const reset = useServerFn(resetOwnInformation);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    membership().then(data => setIsAdmin(data.roles.some(r => r.role === 'admin' || r.role === 'super_admin'))).catch(() => setIsAdmin(false));
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? "");
      const app = data.user?.app_metadata as { provider?: string } | undefined;
      setProvider(app?.provider ?? "email");
    });
  }, []);

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    const validation = passwordError(newPwd, confirmPwd);
    if (validation) return toast.error(validation);
    if (!currentPwd) return toast.error('Enter your current password.');
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: newPwd, current_password: currentPwd });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Password updated");
    setNewPwd("");
    setCurrentPwd(''); setConfirmPwd('');
  }

  async function signOutEverywhere() {
    await qc.cancelQueries(); qc.clear();
    await supabase.auth.signOut({ scope: "global" });
    qc.clear();
    toast.success("Signed out of all devices");
    navigate({ to: "/auth", replace: true });
  }

  async function resetWorkspace() {
    if (!confirm("Reset FinScope? This permanently deletes your company profiles, analyses and uploaded files. Your chat history, login and previously downloaded reports are kept.")) return;
    setBusy(true);
    try {
      await reset({ data: { confirmation: 'RESET MY UPLOADED INFORMATION' } });
      qc.clear();
      toast.success('Uploaded information reset — reports, chat, login and membership preserved');
      navigate({ to: "/dashboard", replace: true });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Reset failed");
    } finally {
      setBusy(false);
    }
  }

  

  return (
    <AppShell>
      <div className="p-6 md:p-10 max-w-3xl mx-auto space-y-6">
        <div>
          <p className="text-xs tracking-[0.3em] text-gold uppercase">Settings</p>
          <h1 className="font-display text-4xl mt-2">Account & security</h1>
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
              <CardTitle className="font-display flex items-center gap-2"><KeyRound className="h-5 w-5 text-gold" /> Change Password</CardTitle>
              <CardDescription>Use at least 12 characters with uppercase and lowercase letters, numbers and symbols.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={changePassword} className="space-y-4">
                <div><Label htmlFor="current-password">Current Password</Label><Input id="current-password" autoComplete="current-password" type="password" value={currentPwd} onChange={e => setCurrentPwd(e.target.value)} required /></div>
                <div><Label htmlFor="new-password">New Password</Label><Input id="new-password" autoComplete="new-password" type="password" value={newPwd} onChange={e => setNewPwd(e.target.value)} required /></div>
                <div><Label htmlFor="confirm-password">Confirm New Password</Label><Input id="confirm-password" autoComplete="new-password" type="password" value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)} required /></div>
                <Button type="submit" variant="navy" disabled={busy}>Save Changes</Button>
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

        <Card hidden>
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

        {isAdmin && <Card className="border-destructive/40">
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2 text-destructive"><RotateCcw className="h-5 w-5" /> Reset FinScope</CardTitle>
            <CardDescription>One click wipes every company profile, analysis and uploaded file. Your chat history, downloaded reports and login are kept.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="destructive" onClick={resetWorkspace} disabled={busy}>
              <RotateCcw className="h-4 w-4" /> Reset information uploaded to zero
            </Button>
          </CardContent>
        </Card>}
      </div>
    </AppShell>
  );
}
