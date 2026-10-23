CREATE TABLE public.app_sessions (user_id uuid NOT NULL, session_id uuid NOT NULL, last_active_at timestamptz NOT NULL DEFAULT now(), revoked boolean NOT NULL DEFAULT false, PRIMARY KEY(user_id,session_id));
GRANT SELECT ON public.app_sessions TO authenticated;
GRANT ALL ON public.app_sessions TO service_role;
ALTER TABLE public.app_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own session read" ON public.app_sessions FOR SELECT TO authenticated USING(user_id=auth.uid());
CREATE FUNCTION public.session_active() RETURNS boolean LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=public AS $$
DECLARE sid uuid; activity timestamptz; blocked boolean; minutes integer;
BEGIN
 IF auth.uid() IS NULL THEN RETURN false; END IF;
 sid := NULLIF(auth.jwt()->>'session_id','')::uuid;
 IF sid IS NULL THEN RETURN false; END IF;
 INSERT INTO public.app_sessions(user_id,session_id) VALUES(auth.uid(),sid) ON CONFLICT DO NOTHING;
 SELECT last_active_at,revoked INTO activity,blocked FROM public.app_sessions WHERE user_id=auth.uid() AND session_id=sid;
 SELECT inactivity_minutes INTO minutes FROM public.app_settings WHERE id='global';
 RETURN NOT blocked AND activity > now()-make_interval(mins=>COALESCE(minutes,15));
END $$;
CREATE FUNCTION public.touch_session() RETURNS boolean LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NOT public.session_active() THEN RETURN false; END IF;
 UPDATE public.app_sessions SET last_active_at=now() WHERE user_id=auth.uid() AND session_id=(auth.jwt()->>'session_id')::uuid;
 RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.session_active() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.touch_session() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.session_active(),public.touch_session() TO authenticated;
CREATE POLICY "active session analyses" ON public.analyses AS RESTRICTIVE FOR ALL TO authenticated USING(public.session_active()) WITH CHECK(public.session_active());
CREATE POLICY "active session companies" ON public.companies AS RESTRICTIVE FOR ALL TO authenticated USING(public.session_active()) WITH CHECK(public.session_active());
CREATE POLICY "active session chat" ON public.chat_messages AS RESTRICTIVE FOR ALL TO authenticated USING(public.session_active()) WITH CHECK(public.session_active());
CREATE POLICY "active session profiles" ON public.profiles AS RESTRICTIVE FOR ALL TO authenticated USING(public.session_active()) WITH CHECK(public.session_active());
CREATE POLICY "active session files" ON storage.objects AS RESTRICTIVE FOR ALL TO authenticated USING(CASE WHEN bucket_id IN ('statements','company-logos') THEN public.session_active() ELSE true END) WITH CHECK(CASE WHEN bucket_id IN ('statements','company-logos') THEN public.session_active() ELSE true END);
CREATE TABLE public.saved_reports (id uuid PRIMARY KEY, user_id uuid NOT NULL, title text NOT NULL, period_label text, analysis jsonb, risk_score integer, company jsonb, created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.saved_reports TO authenticated;
GRANT ALL ON public.saved_reports TO service_role;
ALTER TABLE public.saved_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own saved reports" ON public.saved_reports FOR SELECT TO authenticated USING(user_id=auth.uid() AND public.session_active());
CREATE FUNCTION public.reset_own_information() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NOT public.session_active() OR NOT(public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin')) THEN RAISE EXCEPTION 'Administrator access required'; END IF;
 INSERT INTO public.saved_reports(id,user_id,title,period_label,analysis,risk_score,company,created_at) SELECT a.id,a.user_id,a.title,a.period_label,a.analysis,a.risk_score,to_jsonb(c),a.created_at FROM public.analyses a LEFT JOIN public.companies c ON c.id=a.company_id WHERE a.user_id=auth.uid() AND a.status='completed' ON CONFLICT(id) DO NOTHING;
 UPDATE public.chat_messages SET analysis_id=NULL WHERE user_id=auth.uid();
 DELETE FROM public.analyses WHERE user_id=auth.uid();
 DELETE FROM public.companies WHERE user_id=auth.uid();
 INSERT INTO public.admin_audit(actor_id,action,target_id) VALUES(auth.uid(),'reset_own_information',auth.uid()::text);
END $$;
REVOKE ALL ON FUNCTION public.reset_own_information() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reset_own_information() TO authenticated;
CREATE FUNCTION public.configure_security(_minutes integer) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NOT public.session_active() OR NOT public.has_role(auth.uid(),'super_admin') THEN RAISE EXCEPTION 'Super Administrator access required'; END IF;
 IF _minutes<2 OR _minutes>480 THEN RAISE EXCEPTION 'Timeout must be between 2 and 480 minutes'; END IF;
 INSERT INTO public.app_settings(id,inactivity_minutes) VALUES('global',_minutes) ON CONFLICT(id) DO UPDATE SET inactivity_minutes=EXCLUDED.inactivity_minutes,updated_at=now();
 INSERT INTO public.admin_audit(actor_id,action,details) VALUES(auth.uid(),'configure_inactivity',jsonb_build_object('minutes',_minutes));
END $$;
REVOKE ALL ON FUNCTION public.configure_security(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.configure_security(integer) TO authenticated;