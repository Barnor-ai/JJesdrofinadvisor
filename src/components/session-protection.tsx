import { useEffect, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';

export function SessionProtection() {
  const navigate = useNavigate(); const qc = useQueryClient();
  const [warning, setWarning] = useState(false);
  useEffect(() => {
    let timeout = 15 * 60_000, lastActivity = Date.now(), lastSent = 0, stopped = false, signingOut = false;
    const channel = new BroadcastChannel('finscope-activity');
    const logout = async () => {
      if (signingOut) return; signingOut = true;
      await qc.cancelQueries(); qc.clear();
      await supabase.auth.signOut({ scope: 'local' });
      setWarning(false); navigate({ to: '/auth', replace: true });
    };
    const touch = async () => {
      if (Date.now() - lastSent < 15_000) return;
      lastSent = Date.now();
      const { data, error } = await supabase.rpc('touch_session');
      if (!error && data === false) await logout();
    };
    const activity = () => {
      if (Date.now() - lastActivity >= timeout) { void logout(); return; }
      lastActivity = Date.now(); channel.postMessage({ type: 'activity', at: lastActivity }); setWarning(false); void touch();
    };
    channel.onmessage = e => { if (e.data?.type === 'activity' && typeof e.data.at === 'number' && e.data.at <= Date.now()) { lastActivity = Math.max(lastActivity, e.data.at); setWarning(false); } };
    const events = ['pointerdown', 'keydown', 'touchstart', 'scroll'];
    events.forEach(event => window.addEventListener(event, activity, { passive: true }));
    const tick = async () => {
      if (stopped || signingOut) return;
      const elapsed = Date.now() - lastActivity;
      if (elapsed >= timeout) await logout(); else setWarning(elapsed >= timeout - 60_000);
    };
    const visibility = () => { if (document.visibilityState === 'visible') void tick(); };
    document.addEventListener('visibilitychange', visibility);
    void supabase.from('app_settings').select('inactivity_minutes').eq('id', 'global').maybeSingle().then(({ data }) => { if (data) timeout = data.inactivity_minutes * 60_000; });
    void supabase.rpc('session_active').then(({ data, error }) => { if (!error && data === false) void logout(); });
    const interval = setInterval(tick, 5000);
    const continueSession = () => { lastSent = 0; activity(); };
    window.addEventListener('finscope-continue', continueSession);
    return () => { stopped = true; clearInterval(interval); channel.close(); events.forEach(e => window.removeEventListener(e, activity)); document.removeEventListener('visibilitychange', visibility); window.removeEventListener('finscope-continue', continueSession); };
  }, [navigate, qc]);
  return <Dialog open={warning}><DialogContent><DialogTitle>Your session is about to expire</DialogTitle><DialogDescription>You will be signed out after inactivity. Your saved statements and reports will remain.</DialogDescription><Button variant="navy" onClick={() => window.dispatchEvent(new Event('finscope-continue'))}>Continue Session</Button></DialogContent></Dialog>;
}