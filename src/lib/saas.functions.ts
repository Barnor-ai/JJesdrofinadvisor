import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { z } from 'zod';

export const getMembership = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const since = new Date(); since.setUTCDate(1); since.setUTCHours(0, 0, 0, 0);
    const results = await Promise.all([
      supabase.from('user_roles').select('role').eq('user_id', userId),
      supabase.from('subscription_plans').select('*').order('id'),
      supabase.from('subscriptions').select('*, subscription_plans(*)').eq('user_id', userId).maybeSingle(),
      supabase.from('usage_events').select('kind,state').eq('user_id', userId).gte('created_at', since.toISOString()),
      supabase.from('app_settings').select('*').eq('id', 'global').maybeSingle(),
    ]);
    for (const result of results) if (result.error) throw new Error(result.error.message);
    return { roles: results[0].data ?? [], plans: results[1].data ?? [], subscription: results[2].data, usage: results[3].data ?? [], settings: results[4].data };
  });

export const savePlan = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    id: z.enum(['free', 'professional', 'business']), name: z.string().min(1).max(80),
    price_amount: z.number().nonnegative().nullable(), currency: z.string().length(3).nullable(),
    analysis_limit: z.number().int().nonnegative().nullable(), report_limit: z.number().int().nonnegative().nullable(), company_limit: z.number().int().positive().nullable(),
    active: z.boolean(),
  }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: allowed, error } = await context.supabase.rpc('has_role', { _user_id: context.userId, _role: 'super_admin' });
    if (error || !allowed) throw new Error('Only a Super Administrator can configure plans.');
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const result = await supabaseAdmin.from('subscription_plans').upsert({ ...data, currency: data.currency?.toUpperCase() ?? null, updated_at: new Date().toISOString() });
    if (result.error) throw new Error(result.error.message);
    const audit = await supabaseAdmin.from('admin_audit').insert({ actor_id: context.userId, action: 'configure_plan', target_id: data.id });
    if (audit.error) throw new Error('Plan saved, but audit logging failed.');
    return { ok: true };
  });