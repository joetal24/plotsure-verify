import { useParams, useNavigate } from "react-router-dom";
import { useSearch } from "@/contexts/SearchContext";
import { useAuth } from "@/contexts/AuthContext";
import AppTopBar from "@/components/AppTopBar";
import RiskBadge from "@/components/RiskBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Download, Copy, ShieldCheck, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { createCertificate, type CertificateResponse } from "@/lib/api";

const Certificate = () => {
  const { id } = useParams();
  const { getResultById } = useSearch();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [certificate, setCertificate] = useState<CertificateResponse | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);

  useEffect(() => {
    if (!user) navigate("/login");
  }, [user, navigate]);

  const result = id ? getResultById(id) : undefined;

  const handleGenerate = async () => {
    if (!id) return;
    setGenerating(true);
    try {
      const cert = await createCertificate(id);
      setCertificate(cert);
      setGenerated(true);
      toast({ title: "Certificate generated!", description: "Your verification certificate is ready." });
    } catch (err: any) {
      toast({ title: "Generation failed", description: err.message || "Please try again.", variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  // Auto-generate on mount
  useEffect(() => {
    if (result && !generated && !generating) {
      handleGenerate();
    }
  }, [result]);

  if (!result) {
    return (
      <div className="min-h-screen bg-background">
        <AppTopBar />
        <div className="container py-20 text-center">
          <p className="text-muted-foreground">Certificate not found.</p>
          <Button className="mt-4" onClick={() => navigate("/dashboard")}>Back to Dashboard</Button>
        </div>
      </div>
    );
  }

  const handleCopyHash = () => {
    if (!certificate) return;
    navigator.clipboard.writeText(certificate.hash);
    toast({ title: "Hash copied!", description: "SHA-256 hash copied to clipboard." });
  };

  return (
    <div className="min-h-screen bg-background">
      <AppTopBar />
      <main className="container py-8 max-w-3xl">
        {generating && (
          <div className="text-center py-20">
            <Loader2 className="h-12 w-12 animate-spin text-primary-mid mx-auto mb-4" />
            <p className="text-muted-foreground">Generating your certificate...</p>
          </div>
        )}

        {generated && certificate && (
          <>
            <Card className="overflow-hidden shadow-lg print:shadow-none" id="certificate">
              {/* Header Band */}
              <div className="bg-primary px-6 py-5 text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <ShieldCheck className="h-6 w-6 text-primary-foreground" />
                  <h1 className="text-xl md:text-2xl font-display font-bold text-primary-foreground tracking-wide">
                    PLOTSURE LAND VERIFICATION CERTIFICATE
                  </h1>
                </div>
                <p className="text-primary-foreground/70 text-sm font-body">
                  Issued under the PlotSure Land Intelligence Platform
                </p>
              </div>

              <CardContent className="p-6 md:p-8">
                <div className="border-2 border-primary/20 rounded-lg p-6 md:p-8 space-y-5">
                  <div className="grid sm:grid-cols-2 gap-4 text-sm font-body">
                    <Field label="Certificate ID" value={certificate.id.slice(0, 12).toUpperCase()} mono />
                    <Field label="Date Issued" value={new Date(certificate.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })} />
                    <Field label="Assessed By" value="PlotSure Automated Assessment Engine" />
                    <Field label="Plot Reference" value={result.plotRef} mono />
                    <Field label="Location" value={`${result.location}, Uganda`} />
                    <Field label="Land Type" value={result.plotDetails.landType} />
                    <Field label="Registered Owner" value={result.registeredOwner} />
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Title Status</p>
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${result.titleStatus === "CLEAN" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
                        {result.titleStatus}
                      </span>
                    </div>
                    <Field label="Estimated Fair Price Range" value={`UGX ${result.estimatedPriceLow.toLocaleString()} – ${result.estimatedPriceHigh.toLocaleString()}`} />
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Risk Level</p>
                      <RiskBadge level={result.riskLevel} />
                    </div>
                  </div>

                  {/* Verification Record */}
                  <div className="border-t pt-5 mt-5">
                    <h3 className="font-display font-bold text-sm mb-4">Verification Record</h3>
                    <div className="space-y-3 text-sm font-body">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">SHA-256 Hash</p>
                        <p className="font-mono text-xs break-all bg-muted/50 p-2 rounded">{certificate.hash}</p>
                      </div>
                      <p className="text-xs italic text-muted-foreground leading-relaxed">
                        This certificate can be verified by comparing the SHA-256 hash above against the record stored in the PlotSure database.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-3 mt-6 print:hidden">
              {certificate.file_url ? (
                <Button className="flex-1" asChild>
                  <a href={certificate.file_url} target="_blank" rel="noopener noreferrer">
                    <Download className="mr-2 h-4 w-4" /> Download PDF
                  </a>
                </Button>
              ) : (
                <Button className="flex-1" onClick={() => window.print()}>
                  <Download className="mr-2 h-4 w-4" /> Print Certificate
                </Button>
              )}
              <Button variant="outline" className="flex-1" onClick={handleCopyHash}>
                <Copy className="mr-2 h-4 w-4" /> Copy SHA-256 Hash
              </Button>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

const Field = ({ label, value, mono }: { label: string; value: string; mono?: boolean }) => (
  <div>
    <p className="text-xs text-muted-foreground mb-1">{label}</p>
    <p className={`font-medium ${mono ? "font-mono text-xs" : ""}`}>{value}</p>
  </div>
);

export default Certificate;
