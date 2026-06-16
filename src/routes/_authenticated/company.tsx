import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { INDUSTRIES, LOCATIONS, CURRENCIES } from "@/lib/finscope-constants";

export const Route = createFileRoute("/_authenticated/company")({
  head: () => ({ meta: [{ title: "Company profile — FinScope" }] }),
  component: CompanyPage,
});

function CompanyPage() {
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [industry, setIndustry] = useState(INDUSTRIES[0]);
  const [location, setLocation] = useState(LOCATIONS[0]);
  const [currency, setCurrency] = useState("USD");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoSigned, setLogoSigned] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("companies").select("*").order("created_at").limit(1).maybeSingle();
      if (data) {
        setCompanyId(data.id);
        setName(data.name ?? "");
        setIndustry(data.industry ?? INDUSTRIES[0]);
        setLocation(data.location ?? LOCATIONS[0]);
        setCurrency(data.currency ?? "USD");
        setLogoUrl(data.logo_url ?? null);
        if (data.logo_url) {
          const { data: s } = await supabase.storage.from("company-logos").createSignedUrl(data.logo_url, 3600);
          if (s) setLogoSigned(s.signedUrl);
        }
      }
    })();
  }, []);

  async function uploadLogo(file: File) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const path = `${user.id}/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("company-logos").upload(path, file, { upsert: true });
    if (error) return toast.error(error.message);
    setLogoUrl(path);
    const { data: s } = await supabase.storage.from("company-logos").createSignedUrl(path, 3600);
    if (s) setLogoSigned(s.signedUrl);
    toast.success("Logo uploaded");
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }
    const payload = { user_id: user.id, name, industry, location, currency, logo_url: logoUrl, updated_at: new Date().toISOString() };
    const res = companyId
      ? await supabase.from("companies").update(payload).eq("id", companyId)
      : await supabase.from("companies").insert(payload).select().single();
    setSaving(false);
    if (res.error) return toast.error(res.error.message);
    if (!companyId && "data" in res && res.data) setCompanyId((res.data as { id: string }).id);
    toast.success("Company saved");
  }

  return (
    <AppShell>
      <div className="p-6 md:p-10 max-w-3xl mx-auto">
        <p className="text-xs tracking-[0.3em] text-gold uppercase">Company profile</p>
        <h1 className="font-display text-4xl mt-2 mb-6">Your business</h1>
        <Card>
          <CardHeader><CardTitle className="font-display">Details</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={save} className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="h-20 w-20 rounded-lg border border-border bg-muted overflow-hidden flex items-center justify-center">
                  {logoSigned ? <img src={logoSigned} alt="logo" className="h-full w-full object-cover" /> : <span className="font-display text-2xl text-muted-foreground">{name?.[0] ?? "?"}</span>}
                </div>
                <div>
                  <Label className="text-sm">Company logo</Label>
                  <Input type="file" accept="image/*" onChange={e => e.target.files?.[0] && uploadLogo(e.target.files[0])} />
                </div>
              </div>
              <div><Label>Company name</Label><Input value={name} onChange={e => setName(e.target.value)} required /></div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Industry</Label>
                  <select className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm" value={industry} onChange={e => setIndustry(e.target.value)}>
                    {INDUSTRIES.map(i => <option key={i}>{i}</option>)}
                  </select>
                </div>
                <div>
                  <Label>Location</Label>
                  <select className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm" value={location} onChange={e => setLocation(e.target.value)}>
                    {LOCATIONS.map(l => <option key={l}>{l}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <Label>Currency</Label>
                <select className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm" value={currency} onChange={e => setCurrency(e.target.value)}>
                  {CURRENCIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <Button type="submit" variant="navy" disabled={saving}>{saving ? "Saving…" : "Save changes"}</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
