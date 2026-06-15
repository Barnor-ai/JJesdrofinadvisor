import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { runAnalysis } from "@/lib/finscope.functions";
import { toast } from "sonner";
import { UploadCloud, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/upload")({
  head: () => ({ meta: [{ title: "New analysis — FinScope" }] }),
  component: UploadPage,
});

function UploadPage() {
  const navigate = useNavigate();
  const run = useServerFn(runAnalysis);
  const [companies, setCompanies] = useState<Array<{ id: string; name: string }>>([]);
  const [companyId, setCompanyId] = useState("");
  const [title, setTitle] = useState("");
  const [period, setPeriod] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.from("companies").select("id,name").then(({ data }) => {
      const list = data ?? [];
      setCompanies(list);
      if (list[0]) setCompanyId(list[0].id);
    });
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return toast.error("Please attach a financial statement file");
    if (!companyId) return toast.error("Set up your company first");
    setBusy(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");
      const path = `${user.id}/${Date.now()}-${file.name}`;
      const up = await supabase.storage.from("statements").upload(path, file);
      if (up.error) throw up.error;

      const ins = await supabase.from("analyses").insert({
        user_id: user.id, company_id: companyId, title, period_label: period,
        file_name: file.name, file_url: path, status: "processing",
      }).select().single();
      if (ins.error) throw ins.error;

      toast.info("Analyzing your statement — this may take a minute…");
      await run({ data: { analysisId: ins.data.id } });
      navigate({ to: "/analyses/$id", params: { id: ins.data.id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
      setBusy(false);
    }
  }

  return (
    <AppShell>
      <div className="p-6 md:p-10 max-w-3xl mx-auto">
        <p className="text-xs tracking-[0.3em] text-gold uppercase">New analysis</p>
        <h1 className="font-display text-4xl mt-2 mb-6">Upload a financial statement</h1>
        <Card>
          <CardHeader><CardTitle className="font-display">Statement details</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-4">
              <div>
                <Label>Company</Label>
                <select className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm" value={companyId} onChange={e => setCompanyId(e.target.value)} required>
                  {companies.length === 0 && <option value="">— set up in Settings first —</option>}
                  {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div><Label>Report title</Label><Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. FY2024 Annual" required /></div>
              <div><Label>Period</Label><Input value={period} onChange={e => setPeriod(e.target.value)} placeholder="e.g. Jan–Dec 2024 or Q3 2024" /></div>
              <div>
                <Label>Financial statement file</Label>
                <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-gold/60 transition cursor-pointer relative">
                  <input type="file" accept=".pdf,.xlsx,.xls,.csv,image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => setFile(e.target.files?.[0] ?? null)} required />
                  <UploadCloud className="mx-auto h-8 w-8 text-gold mb-2" />
                  <p className="text-sm">{file ? file.name : "Click or drop a PDF, Excel or CSV"}</p>
                  <p className="text-xs text-muted-foreground mt-1">Income Statement · Balance Sheet · Cash Flow · Management Accounts</p>
                </div>
              </div>
              <Button type="submit" variant="gold" size="lg" className="w-full" disabled={busy}>
                {busy ? <><Loader2 className="h-4 w-4 animate-spin" /> Analyzing…</> : "Run AI analysis"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
