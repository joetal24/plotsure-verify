import { useParams, useNavigate } from "react-router-dom";
import { useSearch } from "@/contexts/SearchContext";
import { useAuth } from "@/contexts/AuthContext";
import AppTopBar from "@/components/AppTopBar";
import RiskBadge from "@/components/RiskBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Download, Copy, ShieldCheck } from "lucide-react";
import { useEffect } from "react";

const Certificate = () => {
  const { id } = useParams();
  const { getResultById } = useSearch();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!user) navigate("/login");
  }, [user, navigate]);

  const result = id ? getResultById(id) : undefined;

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

  const handleDownload = () => {
    toast({ title: "Preparing download", description: "Opening print dialog..." });
    window.print();
  };

  const handleCopyHash = () => {
    navigator.clipboard.writeText(result.certificateHash);
    toast({ title: "Hash copied!", description: "SHA-256 hash copied to clipboard." });
  };

  const midPrice = Math.round((result.estimatedPriceLow + result.estimatedPriceHigh) / 2);

  return (
    <div className="min-h-screen bg-background">
      <AppTopBar />
      <main className="container py-8 max-w-3xl">
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
              Issued under the PlotSure AI & GIS Land Intelligence Platform
            </p>
          </div>

          <CardContent className="p-6 md:p-8">
            {/* Certificate border effect */}
            <div className="border-2 border-primary/20 rounded-lg p-6 md:p-8 space-y-5">
              <div className="grid sm:grid-cols-2 gap-4 text-sm font-body">
                <Field label="Certificate ID" value={result.certificateId} mono />
                <Field label="Date Issued" value={new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })} />
                <Field label="Assessed By" value="PlotSure Automated Assessment Engine" />
                <Field label="Plot Reference" value={result.plotRef} mono />
                <Field label="Location" value={`${result.location}, Uganda`} />
                <Field label="Land Type" value={result.plotDetails.landType} />
                <Field label="Registered Owner (UgNLIS)" value={result.registeredOwner} />
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
                <Field label="GIS Land Cover Classification" value={result.gisFeatures.landCover} />
                <Field label="Anomaly Score" value={`${result.mlAnomalyScore} / 100`} />
                <Field label="Graph Risk Score" value={`${result.graphRiskScore} / 100`} />
              </div>

              {/* Blockchain Section */}
              <div className="border-t pt-5 mt-5">
                <h3 className="font-display font-bold text-sm mb-4">Blockchain Integrity Record</h3>
                <div className="space-y-3 text-sm font-body">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">SHA-256 Hash</p>
                    <p className="font-mono text-xs break-all bg-muted/50 p-2 rounded">{result.certificateHash}</p>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <Field label="Blockchain Network" value="Polygon Testnet" />
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Transaction Hash</p>
                      <p className="font-mono text-xs break-all">{result.blockchainTxHash}</p>
                    </div>
                  </div>
                  <p className="text-xs italic text-muted-foreground leading-relaxed">
                    This certificate's authenticity can be independently verified by comparing the SHA-256 hash above against the on-chain record. Any modification to this document will produce a different hash.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3 mt-6 print:hidden">
          <Button className="flex-1" onClick={handleDownload}>
            <Download className="mr-2 h-4 w-4" /> Download Certificate
          </Button>
          <Button variant="outline" className="flex-1" onClick={handleCopyHash}>
            <Copy className="mr-2 h-4 w-4" /> Copy SHA-256 Hash
          </Button>
        </div>
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
