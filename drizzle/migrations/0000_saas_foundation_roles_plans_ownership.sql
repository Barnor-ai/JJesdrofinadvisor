CREATE TYPE public.app_role AS ENUM ('super_admin', 'admin', 'user');
CREATE TABLE public.user_roles (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, role public.app_role NOT NULL, UNIQUE(user_id, role));
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id=auth.uid());
CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND role=_role) $$;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
CREATE TABLE public.subscription_plans (id text PRIMARY KEY, name text NOT NULL, price_amount numeric, currency text, analysis_limit integer, report_limit integer, company_limit integer, features jsonb NOT NULL DEFAULT '{}'::jsonb, active boolean NOT NULL DEFAULT false, updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.subscription_plans TO authenticated;
GRANT ALL ON public.subscription_plans TO service_role;
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read plans" ON public.subscription_plans FOR SELECT TO authenticated USING(true);
CREATE TABLE public.subscriptions (user_id uuid PRIMARY KEY, plan_id text REFERENCES public.subscription_plans(id), status text NOT NULL DEFAULT 'unconfigured', provider_subscription_id text UNIQUE, renews_at timestamptz, expires_at timestamptz, updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own subscription" ON public.subscriptions FOR SELECT TO authenticated USING(user_id=auth.uid() OR public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'admin'));
CREATE TABLE public.usage_events (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL, operation_id uuid NOT NULL, kind text NOT NULL, state text NOT NULL DEFAULT 'reserved', period_start date NOT NULL DEFAULT date_trunc('month',now())::date, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(user_id,operation_id,kind));
GRANT SELECT ON public.usage_events TO authenticated;
GRANT ALL ON public.usage_events TO service_role;
ALTER TABLE public.usage_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own usage" ON public.usage_events FOR SELECT TO authenticated USING(user_id=auth.uid() OR public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'admin'));
CREATE TABLE public.app_settings (id text PRIMARY KEY DEFAULT 'global', inactivity_minutes integer NOT NULL DEFAULT 15, enforce_subscriptions boolean NOT NULL DEFAULT false, updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.app_settings TO authenticated;
GRANT ALL ON public.app_settings TO service_role;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read app settings" ON public.app_settings FOR SELECT TO authenticated USING(true);
CREATE TABLE public.admin_audit (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), actor_id uuid NOT NULL, action text NOT NULL, target_id text, details jsonb NOT NULL DEFAULT '{}'::jsonb, created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.admin_audit TO authenticated;
GRANT ALL ON public.admin_audit TO service_role;
ALTER TABLE public.admin_audit ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read audit" ON public.admin_audit FOR SELECT TO authenticated USING(public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'admin'));
CREATE FUNCTION public.validate_customer_links() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF TG_TABLE_NAME='analyses' THEN
  IF NEW.company_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.companies WHERE id=NEW.company_id AND user_id=NEW.user_id) THEN RAISE EXCEPTION 'Company must belong to the analysis owner'; END IF;
  IF NEW.file_url IS NOT NULL AND (split_part(NEW.file_url,'/',1)<>NEW.user_id::text OR NEW.file_url LIKE '%/../%' OR NEW.file_url LIKE '%/./%') THEN RAISE EXCEPTION 'Statement path must belong to the analysis owner'; END IF;
 ELSIF TG_TABLE_NAME='chat_messages' THEN
  IF NEW.analysis_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.analyses WHERE id=NEW.analysis_id AND user_id=NEW.user_id) THEN RAISE EXCEPTION 'Chat must belong to the analysis owner'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER validate_analysis_owner BEFORE INSERT OR UPDATE OF company_id,file_url,user_id ON public.analyses FOR EACH ROW EXECUTE FUNCTION public.validate_customer_links();
CREATE TRIGGER validate_chat_owner BEFORE INSERT OR UPDATE OF analysis_id,user_id ON public.chat_messages FOR EACH ROW EXECUTE FUNCTION public.validate_customer_links();