import { createFileRoute } from '@tanstack/react-router';
import { useSuspenseQuery, queryOptions } from '@tanstack/react-query';
import { getMembership } from '@/lib/saas.functions';
import { pageMetadata } from '@/lib/page-metadata';
import { AppShell } from '@/components/app-shell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, CreditCard } from 'lucide-react';

export const membershipOptions = queryOptions({ queryKey: ['membership'], queryFn: () => getMembership(), staleTime: 30_000 });
export const Route = createFileRoute('/_authenticated/subscription')({
  head: () => pageMetadata('Membership & billing — FinScope', 'Review your FinScope membership, monthly allowances and subscription status.'),
  loader: ({ context }) => context.queryClient.ensureQueryData(membershipOptions),
  component: SubscriptionPage,
});
const tiers = [
  { id: 'free', name: 'Free', features: ['Essential financial analysis', 'Limited monthly analyses and reports', 'Basic report downloads'] },
  { id: 'professional', name: 'Professional', features: ['Full financial analysis', 'Advanced reports and graphical presentations', 'Report translation', 'Historical reports and PDF downloads'] },
  { id: 'business', name: 'Business / Enterprise', features: ['Higher or custom allowances', 'Multiple company profiles', 'Team access', 'Priority support and administrative capabilities'] },
];
function SubscriptionPage() {
  const { data } = useSuspenseQuery(membershipOptions);
  const subscription = data.subscription;
  const plan = subscription?.subscription_plans;
  const used = (kind: string) => data.usage.filter(e => e.kind === kind && e.state !== 'released').length;
  const allowance = (limit: number | null | undefined, kind: string) => limit == null ? 'Not configured' : `${Math.max(0, limit - used(kind))} of ${limit} remaining`;
  const date = (value?: string | null) => value ? new Date(value).toLocaleDateString() : '—';
  return <AppShell><div className="max-w-6xl mx-auto p-6 md:p-10 space-y-8">
    <header><p className="text-xs uppercase text-gold">Membership</p><h1 className="font-display text-4xl mt-2">Plans & billing</h1></header>
    <section className="border-y border-border py-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
      <div><p className="text-sm text-muted-foreground">Current plan</p><p className="font-display text-2xl">{plan?.name ?? 'Existing account'}</p><p className="text-sm text-muted-foreground">{subscription?.status ?? 'Billing not configured'}</p></div>
      <div><p className="text-sm text-muted-foreground">Monthly analyses</p><p>{allowance(plan?.analysis_limit, 'analysis')}</p><p className="text-sm text-muted-foreground">{used('analysis')} used</p></div>
      <div><p className="text-sm text-muted-foreground">Monthly reports</p><p>{allowance(plan?.report_limit, 'report')}</p><p className="text-sm text-muted-foreground">{used('report')} used</p></div>
      <div className="text-sm"><p>Renews: {date(subscription?.renews_at)}</p><p>Expires: {date(subscription?.expires_at)}</p></div>
    </section>
    <div className="grid gap-4 lg:grid-cols-3">{tiers.map(t => {
      const configured = data.plans.find(p => p.id === t.id);
      return <Card key={t.id}><CardHeader><CardTitle className="font-display text-2xl">{t.name}</CardTitle><p className="text-muted-foreground text-sm">{configured?.price_amount != null && configured.currency ? `${configured.currency} ${configured.price_amount}` : 'Price not configured'}</p></CardHeader><CardContent className="space-y-5"><ul className="space-y-3 text-sm">{t.features.map(f => <li className="flex gap-2" key={f}><Check className="h-4 w-4 text-gold shrink-0" />{f}</li>)}</ul><Button variant="outline" className="w-full" disabled><CreditCard className="h-4 w-4" />{subscription?.plan_id === t.id ? 'Current plan' : 'Payments not connected'}</Button></CardContent></Card>;
    })}</div>
    <section><h2 className="font-display text-2xl">Billing history</h2><p className="text-sm text-muted-foreground mt-3">No verified billing records available.</p></section>
  </div></AppShell>;
}