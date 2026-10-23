import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { pageMetadata } from '@/lib/page-metadata';
import { passwordError } from '@/lib/security-rules';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export const Route = createFileRoute('/reset-password')({ head: () => pageMetadata('Reset password — FinScope', 'Securely set a new password for your FinScope account.'), component: ResetPassword });
function ResetPassword() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false), [busy, setBusy] = useState(false), [password, setPassword] = useState(''), [confirm, setConfirm] = useState('');
  useEffect(() => {
    const recovery = new URLSearchParams(window.location.hash.slice(1)).get('type') === 'recovery';
    if (recovery) supabase.auth.getUser().then(({ data }) => setReady(Boolean(data.user)));
  }, []);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const validation = passwordError(password, confirm); if (validation) return toast.error(validation);
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false); if (error) return toast.error(error.message);
    setPassword(''); setConfirm(''); await supabase.auth.signOut(); toast.success('Password updated. Sign in with your new password.'); navigate({ to: '/auth', replace: true });
  }
  return <main className="min-h-screen grid place-items-center p-6 bg-background"><div className="w-full max-w-md space-y-6"><Link to="/" className="font-display text-2xl text-gold">FinScope</Link><h1 className="font-display text-3xl">Reset password</h1>{ready ? <form className="space-y-4" onSubmit={submit}><div><Label htmlFor="recovery-new">New Password</Label><Input id="recovery-new" type="password" autoComplete="new-password" required value={password} onChange={e => setPassword(e.target.value)} /></div><div><Label htmlFor="recovery-confirm">Confirm New Password</Label><Input id="recovery-confirm" type="password" autoComplete="new-password" required value={confirm} onChange={e => setConfirm(e.target.value)} /></div><p className="text-sm text-muted-foreground">Use 12 or more characters, including uppercase and lowercase letters, a number and a symbol.</p><Button className="w-full" variant="navy" disabled={busy}>Save Changes</Button></form> : <><p className="text-muted-foreground">Open the secure link from your password reset email. If it has expired, request a new link.</p><Button asChild variant="outline"><Link to="/auth">Return to sign in</Link></Button></>}</div></main>;
}