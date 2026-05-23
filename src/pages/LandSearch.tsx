import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSearch, type PlotDetails, type SearchMethod, type LandType } from "@/contexts/SearchContext";
import AppTopBar from "@/components/AppTopBar";
import RiskBadge from "@/components/RiskBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, Loader2, ShieldCheck, AlertTriangle, DollarSign, Info, FileCheck, MapPin, FileText, Phone, Mail, ExternalLink, Copy } from "lucide-react";
import PlotMap from "@/components/PlotMap";

const UGANDA_DISTRICTS = [
  "Kampala", "Kampala Central", "Kampala North", "Kampala East", "Kampala West",
  "Wakiso", "Kira", "Najjera", "Kyanja", "Namugongo", "Gayaza", "Seguku", "Lubowa",
  "Entebbe", "Kajjansi",
  "Mukono", "Seeta", "Katosi",
  "Jinja", "Bugiri", "Iganga", "Mayuge",
  "Mbale", "Tororo", "Busia", "Sironko",
  "Mbarara", "Ishaka", "Lyantonde", "Kiruhura",
  "Gulu", "Kitgum", "Pader", "Agago",
  "Lira", "Apac", "Oyam", "Kole",
  "Kasese", "Fort Portal", "Bundibugyo", "Kyenjojo",
  "Masindi", "Kiryandongo", "Buliisa",
  "Luweero", "Nakasongola", "Nakaseke", "Kayunga",
  "Soroti", "Moroto", "Kotido", "Kaabong",
];

const documents = [
  "Duplicate Certificate of Title (original)",
  "Passport photographs (2 copies)",
  "Tax Clearance Certificate (URA)",
  "TIN Certificate",
  "Transfer Form (from Ministry Zonal Office)",
  "Consent Form (signed by both parties)",
  "Payment receipts (stamp duty + registration fees)",
];

const LandSearch = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { addSearch, currentResult, setCurrentResult, loading: searchLoading, error: searchError } = useSearch();
  const { toast } = useToast();

  useEffect(() => {
    document.title = "Verify ◇ PS";
  }, []);

  const initialStep = parseInt(searchParams.get("step") || "1");
  const [step, setStep] = useState(currentResult && initialStep === 3 ? 3 : 1);
   const [errors, setErrors] = useState<Record<string, string>>({});

    const [form, setForm] = useState<Partial<PlotDetails>>({
      searchMethod: "title",
      landType: undefined,
      plotSizeUnit: "Decimals",
      district: undefined,
    });

   useEffect(() => {
     if (!authLoading && !user) navigate("/login");
   }, [user, authLoading, navigate]);

   const updateForm = (updates: Partial<PlotDetails>) => setForm(prev => ({ ...prev, ...updates }));

   const validate = () => {
      const e: Record<string, string> = {};
      if (form.searchMethod === "title") {
        if (!form.volume) e.volume = "Required";
        if (!form.folio) e.folio = "Required";
      } else {
        if (!form.district) e.district = "Select a district";
      }
      setErrors(e);
      return Object.keys(e).length === 0;
    };

    const handleVerify = async () => {
      if (!validate()) return;
      setStep(2);

      try {
        await addSearch({
          ...form as PlotDetails,
          landType: form.landType || "Freehold",
        });
        toast({ title: "Analysis complete", description: "Your PlotSure assessment is ready." });
        setStep(3);
      } catch (err: any) {
        toast({ title: "Verification failed", description: err.message || "Please try again.", variant: "destructive" });
        setStep(1);
      }
    };

   const result = currentResult;

  if (authLoading) return null;
  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <AppTopBar />
      <main className="container py-8 max-w-5xl">
        {/* Step Progress */}
        <div className="flex items-center gap-2 mb-8">
          {[1, 2, 3].map(s => (
            <div key={s} className="flex items-center gap-2 flex-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${step >= s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                {step > s ? <CheckCircle2 className="h-5 w-5" /> : s}
              </div>
              <span className={`text-sm hidden sm:block ${step >= s ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                {s === 1 ? "Plot Details" : s === 2 ? "Analysis" : "Results"}
              </span>
              {s < 3 && <div className={`flex-1 h-0.5 ${step > s ? "bg-primary" : "bg-muted"}`} />}
            </div>
          ))}
        </div>

        {/* Step 1 - Input Form */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="font-display text-xl">What do you already know about this plot?</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">Choose how you'd like to find it. You only need one of these.</p>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Path selector cards */}
              <div className="grid grid-cols-2 gap-4">
                <div
                  className={`border-2 rounded-xl p-5 cursor-pointer transition-all ${
                    form.searchMethod === "title"
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border hover:border-muted-foreground/30 hover:bg-accent/30"
                  }`}
                  onClick={() => updateForm({ searchMethod: "title" })}
                >
                  <FileText className="h-8 w-8 text-primary mb-3" />
                  <h3 className="font-bold text-sm">I have the title details</h3>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    You know the Volume & Folio from the land certificate
                  </p>
                </div>
                <div
                  className={`border-2 rounded-xl p-5 cursor-pointer transition-all ${
                    form.searchMethod === "parcel"
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border hover:border-muted-foreground/30 hover:bg-accent/30"
                  }`}
                  onClick={() => updateForm({ searchMethod: "parcel" })}
                >
                  <MapPin className="h-8 w-8 text-primary-mid mb-3" />
                  <h3 className="font-bold text-sm">I only know the location</h3>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    You know the district, area, or have seen the plot physically
                  </p>
                </div>
              </div>

              {/* Path A — Title fields */}
              {form.searchMethod === "title" && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Volume</Label>
                    <Input placeholder="e.g. 312" value={form.volume || ""} onChange={e => updateForm({ volume: e.target.value })} />
                    <p className="text-xs text-muted-foreground mt-1">The number on the top-left of the land certificate</p>
                    {errors.volume && <p className="text-xs text-destructive mt-1">{errors.volume}</p>}
                  </div>
                  <div>
                    <Label>Folio</Label>
                    <Input placeholder="e.g. 4" value={form.folio || ""} onChange={e => updateForm({ folio: e.target.value })} />
                    <p className="text-xs text-muted-foreground mt-1">The smaller number next to Volume</p>
                    {errors.folio && <p className="text-xs text-destructive mt-1">{errors.folio}</p>}
                  </div>
                </div>
              )}

              {/* Path B — Location fields */}
              {form.searchMethod === "parcel" && (
                <div className="space-y-4">
                  <div>
                    <Label>District</Label>
                    <Select value={form.district || ""} onValueChange={v => updateForm({ district: v })}>
                      <SelectTrigger><SelectValue placeholder="Select district" /></SelectTrigger>
                      <SelectContent className="max-h-60">
                        {UGANDA_DISTRICTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    {errors.district && <p className="text-xs text-destructive mt-1">{errors.district}</p>}
                  </div>
                  <div>
                    <Label>Area / Zone <span className="text-muted-foreground text-xs">optional</span></Label>
                    <Input placeholder="e.g. Kira, Najjera, Ntinda" value={form.county || ""} onChange={e => updateForm({ county: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Block Number <span className="text-muted-foreground text-xs">optional</span></Label>
                      <Input value={form.blockNumber || ""} onChange={e => updateForm({ blockNumber: e.target.value })} />
                    </div>
                    <div>
                      <Label>Plot Number <span className="text-muted-foreground text-xs">optional</span></Label>
                      <Input value={form.plotNumber || ""} onChange={e => updateForm({ plotNumber: e.target.value })} />
                    </div>
                  </div>
                </div>
              )}

              <hr className="border-t" />

              {/* About this plot — always visible */}
              <div>
                <h3 className="font-medium text-sm mb-3 text-foreground">About this plot — helps us estimate fair price</h3>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <Label>Land Type <span className="text-muted-foreground text-xs">optional</span></Label>
                    <Select value={form.landType || ""} onValueChange={v => updateForm({ landType: v as LandType })}>
                      <SelectTrigger><SelectValue placeholder="Any type" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Freehold">Freehold</SelectItem>
                        <SelectItem value="Leasehold">Leasehold</SelectItem>
                        <SelectItem value="Mailo">Mailo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Plot Size <span className="text-muted-foreground text-xs">optional</span></Label>
                    <div className="flex gap-2">
                      <Input type="number" min={0} placeholder="0" value={form.plotSize || ""} onChange={e => updateForm({ plotSize: parseFloat(e.target.value) || 0 })} className="flex-1" />
                      <Select value={form.plotSizeUnit} onValueChange={v => updateForm({ plotSizeUnit: v as any })}>
                        <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Decimals">Decimals</SelectItem>
                          <SelectItem value="Square Metres">Sq. Metres</SelectItem>
                          <SelectItem value="Acres">Acres</SelectItem>
                          <SelectItem value="Hectares">Hectares</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <Label>Asking Price (UGX) <span className="text-muted-foreground text-xs">optional</span></Label>
                <Input type="number" min={0} placeholder="0" value={form.askingPrice || ""} onChange={e => updateForm({ askingPrice: parseFloat(e.target.value) || undefined })} />
                <p className="text-xs text-muted-foreground mt-1">If provided, PlotSure will tell you if the seller's price is fair or overpriced</p>
              </div>

              <div className="flex items-start gap-3 p-4 rounded-lg bg-primary/5 border border-primary/20">
                <Info className="h-5 w-5 text-primary-mid mt-0.5 shrink-0" />
                <p className="text-sm text-foreground font-body">
                  PlotSure will verify ownership with the Uganda Land Registry, check for encumbrances, and estimate a fair market price range for this plot.
                </p>
              </div>

              <Button onClick={handleVerify} className="w-full" size="lg">
                <ShieldCheck className="mr-2 h-5 w-5" /> Verify & analyse this plot
              </Button>
            </CardContent>
          </Card>
        )}

         {/* Step 2 - Loading */}
         {step === 2 && (
           <Card className="max-w-lg mx-auto">
             <CardContent className="py-12 px-8 text-center">
               <Loader2 className="h-12 w-12 animate-spin text-primary-mid mx-auto mb-6" />
               <h2 className="text-xl font-display font-bold mb-8">Analysing Plot Data...</h2>
               <p className="text-sm">Processing your request...</p>
             </CardContent>
           </Card>
         )}

        {/* Step 3 - Results */}
        {step === 3 && result && (
          <div className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h2 className="text-xl md:text-2xl font-display font-bold">PlotSure Assessment Results</h2>
              <div className="flex items-center gap-2">
                <span className="text-sm font-mono text-muted-foreground bg-muted px-3 py-1 rounded">{result.plotRef}</span>
                <Button variant="outline" size="sm" onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  toast({ title: "Link copied to clipboard" });
                }}>
                  <Copy className="h-4 w-4 mr-1.5" /> Share
                </Button>
              </div>
            </div>

            {/* Cached / Stale indicators */}
            {result.isCached && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-50 border border-blue-200 text-sm text-blue-800">
                <Info className="h-4 w-4" />
                <span>This result was served from cache.{result.isStale ? " Data may be stale." : ""}</span>
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-6">
              {/* Card 1 - Title Verification */}
              <Card className="overflow-hidden">
                <div className="bg-primary px-4 py-3">
                  <h3 className="text-primary-foreground font-display font-bold flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5" /> Title Verification
                  </h3>
                </div>
                <CardContent className="pt-4 space-y-3 text-sm font-body">
                  <div className="flex justify-between"><span className="text-muted-foreground">Registered Owner</span><span className="font-medium">{result.registeredOwner ? (
                    result.registeredOwner
                  ) : (
                    <a href="https://ugnlis.go.ug" target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2 hover:text-primary/80 inline-flex items-center gap-1">
                      Not available — verify at UgNLIS.go.ug <ExternalLink className="h-3 w-3" />
                    </a>
                  )}</span></div>
                  <div className="flex justify-between items-center"><span className="text-muted-foreground">Title Status</span>
                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${result.titleStatus === "CLEAN" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>{result.titleStatus}</span>
                  </div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Encumbrances</span><span>{result.encumbrances.length ? result.encumbrances.join(", ") : "None detected"}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Ownership Transfers</span><span>{result.ownershipTransfers}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Last Transfer Date</span><span>{result.lastTransferDate}</span></div>
                </CardContent>
              </Card>

              {/* Card 2 - Price Estimate */}
              <Card className="overflow-hidden">
                <div className="bg-primary-mid px-4 py-3">
                  <h3 className="text-primary-foreground font-display font-bold flex items-center gap-2">
                    <DollarSign className="h-5 w-5" /> Price Estimate
                  </h3>
                </div>
                <CardContent className="pt-4 space-y-4 text-sm font-body">
                  <div className="text-center py-2">
                    <p className="text-xs text-muted-foreground mb-1">Estimated Fair Price Range</p>
                    <p className="text-xl font-bold">UGX {result.estimatedPriceLow.toLocaleString()} – {result.estimatedPriceHigh.toLocaleString()}</p>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Location</span>
                    <span className="bg-accent px-2 py-0.5 rounded text-xs font-medium">{result.location}</span>
                  </div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Land Type</span><span>{result.plotDetails.landType}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Plot Size</span><span>{result.plotDetails.plotSize} {result.plotDetails.plotSizeUnit}</span></div>
                </CardContent>
              </Card>

              {/* Card 3 - Fraud Risk */}
              <Card className="overflow-hidden">
                  <div className={`px-4 py-3 ${(result.fraudRiskLevel || result.riskLevel) === "LOW" ? "bg-success" : (result.fraudRiskLevel || result.riskLevel) === "MEDIUM" ? "bg-warning" : "bg-destructive"}`}>
                  <h3 className="text-primary-foreground font-display font-bold flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" /> Fraud Risk Assessment
                  </h3>
                </div>
                <CardContent className="pt-4 space-y-4 text-sm font-body">
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground mb-2">Overall Risk Level</p>
                      <RiskBadge level={result.fraudRiskLevel || result.riskLevel} />
                  </div>
                  <div className="space-y-2 text-sm">
                    <p className="text-xs font-medium">Risk Factors</p>
                    {result.ownershipTransfers > 2 && (
                      <p className="flex items-start gap-2 text-xs"><span className="mt-1 w-1.5 h-1.5 rounded-full bg-destructive shrink-0" />High number of ownership transfers ({result.ownershipTransfers})</p>
                    )}
                    {result.encumbrances.length > 0 && (
                      <p className="flex items-start gap-2 text-xs"><span className="mt-1 w-1.5 h-1.5 rounded-full bg-destructive shrink-0" />Active encumbrances detected</p>
                    )}
                    {result.anomalyFlags && result.anomalyFlags.length > 0 && (
                      <div className="space-y-1">
                        {result.anomalyFlags.map((flag) => (
                          <p key={flag} className="flex items-start gap-2 text-xs">
                            <span className="mt-1 w-1.5 h-1.5 rounded-full bg-warning shrink-0" />
                            {flag.replace(/_/g, " ")}
                          </p>
                        ))}
                      </div>
                    )}
                    {(result.fraudRiskLevel || result.riskLevel) === "LOW" && (
                      <p className="flex items-start gap-2 text-xs"><span className="mt-1 w-1.5 h-1.5 rounded-full bg-success shrink-0" />No fraud indicators detected. Ownership history appears clean.</p>
                    )}
                    {result.mlAnomalyScore !== undefined && (
                      <div className="border-t pt-3 mt-3">
                        <p className="text-xs font-medium mb-1">ML Anomaly Score</p>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                result.mlAnomalyScore > 0.5 ? "bg-destructive" : result.mlAnomalyScore > 0.2 ? "bg-warning" : "bg-success"
                              }`}
                              style={{ width: `${Math.min(result.mlAnomalyScore * 100, 100)}%` }}
                            />
                          </div>
                          <span className="text-xs font-mono">{(result.mlAnomalyScore * 100).toFixed(0)}%</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {result.mlAnomalyScore > 0.5
                            ? "IsolationForest flags this plot as unusual — may warrant extra scrutiny."
                            : result.mlAnomalyScore > 0.2
                              ? "Slight deviation from typical patterns."
                              : "Plot matches normal patterns."}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Card 4 - Transaction Cost */}
              <Card className="overflow-hidden">
                <div className="bg-primary px-4 py-3">
                  <h3 className="text-primary-foreground font-display font-bold flex items-center gap-2">
                    <DollarSign className="h-5 w-5" /> Transaction Cost Breakdown
                  </h3>
                </div>
                <CardContent className="pt-4 space-y-3 text-sm font-body">
                  {(() => {
                    const midPrice = Math.round((result.estimatedPriceLow + result.estimatedPriceHigh) / 2);
                    const stampDutyRate = result.plotDetails.landType === "Mailo" ? 0.01 : 0.015;
                    const stampDuty = Math.round(midPrice * stampDutyRate);
                    const totalCost = stampDuty + 10000 + 10000 + 10000 + 250000;
                    return (
                      <>
                        <div className="flex justify-between"><span className="text-muted-foreground">Estimated Fair Value</span><span>UGX {midPrice.toLocaleString()}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Stamp Duty ({result.plotDetails.landType === "Mailo" ? "1.0%" : "1.5%"})</span><span>UGX {stampDuty.toLocaleString()}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Registration Fee</span><span>UGX 10,000</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Consent Fee</span><span>UGX 10,000</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">UgNLIS Search Fee</span><span>UGX 10,000</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Estimated Legal Fees</span><span>UGX 250,000</span></div>
                        <div className="border-t pt-3 flex justify-between font-bold text-base">
                          <span>TOTAL TRANSACTION COST</span>
                          <span>UGX {totalCost.toLocaleString()}</span>
                        </div>
                      </>
                    );
                  })()}
                </CardContent>
              </Card>
            </div>

            {/* Contact Seller */}
            <Card className="overflow-hidden">
              <div className="bg-primary px-4 py-3">
                <h3 className="text-primary-foreground font-display font-bold flex items-center gap-2">
                  <Phone className="h-5 w-5" /> Contact Seller
                </h3>
              </div>
              <CardContent className="pt-4 text-sm font-body">
                <div className="flex flex-col items-center gap-3 py-4 text-center">
                  <Info className="h-8 w-8 text-muted-foreground" />
                  <p className="text-muted-foreground">This plot is not listed for sale on PlotSure.</p>
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden">
              <div className="bg-primary px-4 py-3">
                <h3 className="text-primary-foreground font-display font-bold flex items-center gap-2">
                  <MapPin className="h-5 w-5" /> Plot Location Map
                </h3>
              </div>
              <CardContent className="pt-4">
                 <PlotMap
                    district={result.plotDetails.district}
                    county={result.plotDetails.county}
                    plotNumber={result.plotDetails.plotNumber || result.plotRef}
                    landType={result.plotDetails.landType}
                    riskLevel={result.fraudRiskLevel || result.riskLevel}
                    plotSize={result.plotDetails.plotSize}
                    plotSizeUnit={result.plotDetails.plotSizeUnit}
                    plotRef={result.plotRef}
                    fraudScore={result.fraudScore}
                    titleStatus={result.titleStatus}
                    anomalyFlags={result.anomalyFlags}
                  />
              </CardContent>
            </Card>

            {/* Document Checklist */}
            <Card>
              <CardHeader>
                <CardTitle className="font-display text-lg">Documents Required for Title Transfer at Ministry Zonal Office</CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="space-y-3">
                  {documents.map((doc, i) => (
                    <li key={i} className="flex items-center gap-3">
                      <span className="w-7 h-7 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center shrink-0">
                        {i + 1}
                      </span>
                      <span className="text-sm font-body">{doc}</span>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>

            {user?.role === "land_seller" ? (
              <Button size="lg" className="w-full" onClick={() => navigate(`/certificate/${result.id}`)}>
                <FileCheck className="mr-2 h-5 w-5" /> Generate Certificate
              </Button>
            ) : (
              <Button size="lg" variant="secondary" className="w-full" onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                toast({ title: "Link copied!", description: "Share this link with your agent or seller." });
              }}>
                <FileText className="mr-2 h-5 w-5" /> Share Results
              </Button>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default LandSearch;
