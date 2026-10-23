export async function registerAppWorker() {
  if (!('serviceWorker' in navigator)) return;
  const host = window.location.hostname.toLowerCase();
  const preview = /^(?:id-preview|preview)(?:-[a-z0-9]+)?--.+\.(lovable\.app|gpt-eng\.com|gptengineer\.run)$/.test(host)
    || /^project--.+-dev\.(lovable\.app|gpt-eng\.com|gptengineer\.run)$/.test(host)
    || ['lovableproject.com', 'lovableproject-dev.com', 'beta.lovable.dev'].some(d => host === d || host.endsWith(`.${d}`));
  if (!import.meta.env.PROD || window.self !== window.top || preview || new URLSearchParams(window.location.search).get('sw') === 'off') {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.filter(r => [r.active, r.waiting, r.installing].some(w => w && new URL(w.scriptURL).pathname === '/sw.js')).map(r => r.unregister()));
    return;
  }
  await navigator.serviceWorker.register('/sw.js');
}