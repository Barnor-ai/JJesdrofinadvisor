import { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';
export function ConnectionStatus() {
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    const update = () => setOffline(!navigator.onLine); update();
    window.addEventListener('online', update); window.addEventListener('offline', update);
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update); };
  }, []);
  return offline ? <div role="status" className="bg-warning text-warning-foreground px-4 py-3 flex gap-2 text-sm"><WifiOff className="h-4 w-4 shrink-0" />Offline — analysis, chat, translation and billing need an internet connection.</div> : null;
}