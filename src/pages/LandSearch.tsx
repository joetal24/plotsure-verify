import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSearch, type PlotDetails, type SearchMethod, type LandType, type Purpose } from "@/contexts/SearchContext";
import AppTopBar from "@/components/AppTopBar";
import RiskBadge from "@/components/RiskBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, Loader2, MapPin, ShieldCheck, AlertTriangle, DollarSign, Info, Phone, FileCheck } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip as ReTooltip, ResponsiveContainer } from "recharts";

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
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { addSearch, currentResult, setCurrentResult } = useSearch();
  const { toast } = useToast();

  const initialStep = parseInt(searchParams.get("step") || "1");
  const [step, setStep] = useState(currentResult && initialStep === 3 ? 3 : 1);
  const [showPayment, setShowPayment] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [checkedDocs, setCheckedDocs] = useState<boolean[]>(new Array(documents.length).fill(false));
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState<Partial<PlotDetails>>({
    searchMethod: "title",
    landType: undefined,
    plotSizeUnit: "Decimals",
    purpose: undefined,
  });

  const [phone, setPhone] = useState("");
  const [network, setNetwork] = useState("");

  useEffect(() => {
    if (!user) navigate("/login");
  }, [user, navigate]);

  const updateForm = (updates: Partial<PlotDetails>) => setForm(prev => ({ ...prev, ...updates }));

  const validate = () => {
    const e: Record<string, string> = {};
    if (form.searchMethod === "title") {
      if (!form.volume) e.volume = "Required";
      if (!form.folio) e.folio = "Required";
    } else {
      if (!form.county) e.county = "Required";
      if (!form.district) e.district = "Required";
      if (!form.blockNumber) e.blockNumber = "Required";
      if (!form.plotNumber) e.plotNumber = "Required";
    }
    if (!form.landType) e.landType = "Required";
    if (!form.plotSize || form.plotSize <= 0) e.plotSize = "Enter valid size";
    if (!form.purpose) e.purpose = "Required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleVerify = () => {
    if (!validate()) return;
    setShowPayment(true);
  };

  const handlePayment = () => {
    if (!phone || phone.length < 10) {
      toast({ title: "Invalid phone", description: "Enter a valid phone number.", variant: "destructive" });
      return;
    }
    if (!network) {
      toast({ title: "Select network", description: "Choose MTN or Airtel.", variant: "destructive" });
      return;
    }
    setShowPayment(false);
    toast({ title: "Payment confirmed", description: "UGX 10,000 received via Mobile Money." });
    startAnalysis();
  };

  const startAnalysis = () => {
    setStep(2);
    setLoadingStep(0);
    let s = 0;
    const interval = setInterval(() => {
      s++;
      setLoadingStep(s);
      if (s >= 4) {
        clearInterval(interval);
        const result = addSearch(form as PlotDetails);
        setCurrentResult(result);
        toast({ title: "Analysis complete", description: "Your PlotSure assessment is ready." });
        setTimeout(() => setStep(3), 500);
      }
    }, 1000);
  };

  const result = currentResult;

  const loadingSteps = [
    "UgNLIS title verification complete",
    "GIS spatial features extracted (road proximity, building density, land cover)",
    "scikit-learn price prediction model executed",
    "Isolation Forest anomaly detection + Neo4j fraud scan complete",
  ];

  const riskColor = (r: string) => r === "LOW" ? "text-success" : r === "MEDIUM" ? "text-warning" : "text-destructive";
  const riskBg = (r: string) => r === "LOW" ? "bg-success" : r === "MEDIUM" ? "bg-warning" : "bg-destructive";

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

        {/* Step 1 */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="font-display text-xl">Enter Plot Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label className="mb-3 block font-medium">Search Method</Label>
                <RadioGroup value={form.searchMethod} onValueChange={v => updateForm({ searchMethod: v as SearchMethod })} className="flex gap-4">
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="title" id="title" />
                    <Label htmlFor="title">Title Number</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="parcel" id="parcel" />
                    <Label htmlFor="parcel">Parcel Details</Label>
                  </div>
                </RadioGroup>
              </div>

              {form.searchMethod === "title" ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Volume</Label>
                    <Input placeholder="e.g. 312" value={form.volume || ""} onChange={e => updateForm({ volume: e.target.value })} />
                    {errors.volume && <p className="text-xs text-destructive mt-1">{errors.volume}</p>}
                  </div>
                  <div>
                    <Label>Folio</Label>
                    <Input placeholder="e.g. 4" value={form.folio || ""} onChange={e => updateForm({ folio: e.target.value })} />
                    {errors.folio && <p className="text-xs text-destructive mt-1">{errors.folio}</p>}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>County</Label>
                    <Input value={form.county || ""} onChange={e => updateForm({ county: e.target.value })} />
                    {errors.county && <p className="text-xs text-destructive mt-1">{errors.county}</p>}
                  </div>
                  <div>
                    <Label>District</Label>
                    <Input value={form.district || ""} onChange={e => updateForm({ district: e.target.value })} />
                    {errors.district && <p className="text-xs text-destructive mt-1">{errors.district}</p>}
                  </div>
                  <div>
                    <Label>Block Number</Label>
                    <Input value={form.blockNumber || ""} onChange={e => updateForm({ blockNumber: e.target.value })} />
                    {errors.blockNumber && <p className="text-xs text-destructive mt-1">{errors.blockNumber}</p>}
                  </div>
                  <div>
                    <Label>Plot Number</Label>
                    <Input value={form.plotNumber || ""} onChange={e => updateForm({ plotNumber: e.target.value })} />
                    {errors.plotNumber && <p className="text-xs text-destructive mt-1">{errors.plotNumber}</p>}
                  </div>
                </div>
              )}

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label>Land Type</Label>
                  <Select value={form.landType || ""} onValueChange={v => updateForm({ landType: v as LandType })}>
                    <SelectTrigger><SelectValue placeholder="Select land type" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Freehold">Freehold</SelectItem>
                      <SelectItem value="Leasehold">Leasehold</SelectItem>
                      <SelectItem value="Mailo">Mailo</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.landType && <p className="text-xs text-destructive mt-1">{errors.landType}</p>}
                </div>
                <div>
                  <Label>Plot Size</Label>
                  <div className="flex gap-2">
                    <Input type="number" min={0} value={form.plotSize || ""} onChange={e => updateForm({ plotSize: parseFloat(e.target.value) || 0 })} className="flex-1" />
                    <Select value={form.plotSizeUnit} onValueChange={v => updateForm({ plotSizeUnit: v as any })}>
                      <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Decimals">Decimals</SelectItem>
                        <SelectItem value="Acres">Acres</SelectItem>
                        <SelectItem value="Square Metres">Sq. Metres</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {errors.plotSize && <p className="text-xs text-destructive mt-1">{errors.plotSize}</p>}
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label>Asking Price (UGX) <span className="text-muted-foreground text-xs">optional</span></Label>
                  <Input type="number" min={0} value={form.askingPrice || ""} onChange={e => updateForm({ askingPrice: parseFloat(e.target.value) || undefined })} />
                </div>
                <div>
                  <Label>Purpose</Label>
                  <Select value={form.purpose || ""} onValueChange={v => updateForm({ purpose: v as Purpose })}>
                    <SelectTrigger><SelectValue placeholder="Select purpose" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Buying">Buying</SelectItem>
                      <SelectItem value="Collateral Assessment">Collateral Assessment</SelectItem>
                      <SelectItem value="Investment Due Diligence">Investment Due Diligence</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.purpose && <p className="text-xs text-destructive mt-1">{errors.purpose}</p>}
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 rounded-lg bg-primary/5 border border-primary/20">
                <Info className="h-5 w-5 text-primary-mid mt-0.5 shrink-0" />
                <p className="text-sm text-foreground font-body">
                  A UGX 10,000 UgNLIS verification fee will be charged via Mobile Money to retrieve the official title search letter.
                </p>
              </div>

              <Button onClick={handleVerify} className="w-full" size="lg">
                <ShieldCheck className="mr-2 h-5 w-5" /> Verify & Analyse
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 2 */}
        {step === 2 && (
          <Card className="max-w-lg mx-auto">
            <CardContent className="py-12 px-8 text-center">
              <Loader2 className="h-12 w-12 animate-spin text-primary-mid mx-auto mb-6" />
              <h2 className="text-xl font-display font-bold mb-8">Analysing Plot Data...</h2>
              <div className="space-y-4 text-left">
                {loadingSteps.map((label, i) => (
                  <div key={i} className={`flex items-center gap-3 transition-opacity duration-500 ${loadingStep > i ? "opacity-100" : "opacity-30"}`}>
                    <CheckCircle2 className={`h-5 w-5 shrink-0 ${loadingStep > i ? "text-success" : "text-muted"}`} />
                    <span className="text-sm font-body">{label}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3 */}
        {step === 3 && result && (
          <div className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h2 className="text-xl md:text-2xl font-display font-bold">PlotSure Assessment Results</h2>
              <span className="text-sm font-mono text-muted-foreground bg-muted px-3 py-1 rounded">{result.plotRef}</span>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Card 1 - Title Verification */}
              <Card className="overflow-hidden">
                <div className="bg-primary px-4 py-3">
                  <h3 className="text-primary-foreground font-display font-bold flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5" /> UgNLIS Title Verification
                  </h3>
                </div>
                <CardContent className="pt-4 space-y-3 text-sm font-body">
                  <div className="flex justify-between"><span className="text-muted-foreground">Registered Owner</span><span className="font-medium">{result.registeredOwner}</span></div>
                  <div className="flex justify-between items-center"><span className="text-muted-foreground">Title Status</span>
                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${result.titleStatus === "CLEAN" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>{result.titleStatus}</span>
                  </div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Encumbrances</span><span>{result.encumbrances.length ? result.encumbrances.join(", ") : "None detected"}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Ownership Transfers</span><span>{result.ownershipTransfers}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Last Transfer Date</span><span>{result.lastTransferDate}</span></div>
                  <div className="flex justify-between items-center"><span className="text-muted-foreground">UgNLIS Search Letter</span><span className="text-success text-xs">Official search retrieved ✓</span></div>
                </CardContent>
              </Card>

              {/* Card 2 - GIS Price Intelligence */}
              <Card className="overflow-hidden">
                <div className="bg-primary-mid px-4 py-3">
                  <h3 className="text-primary-foreground font-display font-bold flex items-center gap-2">
                    <MapPin className="h-5 w-5" /> GIS Price Intelligence
                  </h3>
                </div>
                <CardContent className="pt-4 space-y-4 text-sm font-body">
                  <div className="text-center py-2">
                    <p className="text-xs text-muted-foreground mb-1">Estimated Fair Price Range</p>
                    <p className="text-xl font-bold">UGX {result.estimatedPriceLow.toLocaleString()} – {result.estimatedPriceHigh.toLocaleString()}</p>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1"><span>Development Potential</span><span>{result.developmentPotential}/100</span></div>
                    <Progress value={result.developmentPotential} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1"><span>Road Proximity</span><span>{result.gisFeatures.roadProximity}/100</span></div>
                    <Progress value={result.gisFeatures.roadProximity} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1"><span>Building Density</span><span>{result.gisFeatures.buildingDensity}/100</span></div>
                    <Progress value={result.gisFeatures.buildingDensity} className="h-2" />
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Land Cover</span>
                    <span className="bg-accent px-2 py-0.5 rounded text-xs font-medium">{result.gisFeatures.landCover}</span>
                  </div>
                  <div className="h-40 rounded overflow-hidden border">
                    <MapContainer center={[0.3476, 32.5825]} zoom={13} style={{ height: "100%", width: "100%" }} scrollWheelZoom={false}>
                      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                      <Marker position={[0.3476, 32.5825]}>
                        <Popup>{result.location}</Popup>
                      </Marker>
                    </MapContainer>
                  </div>
                  <div className="h-28">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={result.priceTrend}>
                        <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${(v / 1000000).toFixed(0)}M`} />
                        <ReTooltip formatter={(v: number) => `UGX ${v.toLocaleString()}`} />
                        <Line type="monotone" dataKey="price" stroke="hsl(216, 54%, 40%)" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Card 3 - Fraud Risk */}
              <Card className="overflow-hidden">
                <div className={`px-4 py-3 ${riskBg(result.riskLevel)}`}>
                  <h3 className="text-primary-foreground font-display font-bold flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" /> Fraud Risk Assessment
                  </h3>
                </div>
                <CardContent className="pt-4 space-y-4 text-sm font-body">
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground mb-2">Overall Risk Level</p>
                    <RiskBadge level={result.riskLevel} />
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div>
                      <p className="text-xs text-muted-foreground">ML Anomaly</p>
                      <p className={`text-lg font-bold ${riskColor(result.riskLevel)}`}>{result.mlAnomalyScore}/100</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Graph Risk</p>
                      <p className={`text-lg font-bold ${riskColor(result.riskLevel)}`}>{result.graphRiskScore}/100</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Combined</p>
                      <p className={`text-lg font-bold ${riskColor(result.riskLevel)}`}>{result.combinedRiskScore}/100</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-medium mb-2">Fraud Flags</p>
                    <ul className="space-y-1.5">
                      {result.fraudFlags.map((f, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs">
                          <span className={`mt-1 w-1.5 h-1.5 rounded-full shrink-0 ${result.riskLevel === "LOW" ? "bg-success" : result.riskLevel === "MEDIUM" ? "bg-warning" : "bg-destructive"}`} />
                          {f}
                        </li>
                      ))}
                    </ul>
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
                  <div className="flex justify-between"><span className="text-muted-foreground">Estimated Fair Value</span><span>UGX {Math.round((result.estimatedPriceLow + result.estimatedPriceHigh) / 2).toLocaleString()}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Stamp Duty ({result.plotDetails.landType === "Mailo" ? "1.0%" : "1.5%"})</span><span>UGX {result.stampDuty.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Registration Fee</span><span>UGX 10,000</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Consent Fee</span><span>UGX 10,000</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">UgNLIS Search Fee</span><span>UGX 10,000</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Estimated Legal Fees</span><span>UGX 250,000</span></div>
                  <div className="border-t pt-3 flex justify-between font-bold text-base">
                    <span>TOTAL TRANSACTION COST</span>
                    <span>UGX {result.totalTransactionCost.toLocaleString()}</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Document Checklist */}
            <Card>
              <CardHeader>
                <CardTitle className="font-display text-lg">Documents Required for Title Transfer at Ministry Zonal Office</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {documents.map((doc, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Checkbox checked={checkedDocs[i]} onCheckedChange={c => {
                      const n = [...checkedDocs];
                      n[i] = !!c;
                      setCheckedDocs(n);
                    }} />
                    <span className="text-sm font-body">{doc}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Button size="lg" className="w-full" onClick={() => navigate(`/certificate/${result.id}`)}>
              <FileCheck className="mr-2 h-5 w-5" /> Generate Certificate
            </Button>
          </div>
        )}

        {/* Payment Modal */}
        <Dialog open={showPayment} onOpenChange={setShowPayment}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="font-display">Pay UGX 10,000 — UgNLIS Search Fee</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Phone Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input className="pl-9" placeholder="0770 123 456" value={phone} onChange={e => setPhone(e.target.value)} />
                </div>
              </div>
              <div>
                <Label>Network</Label>
                <Select value={network} onValueChange={setNetwork}>
                  <SelectTrigger><SelectValue placeholder="Select network" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mtn">MTN Mobile Money</SelectItem>
                    <SelectItem value="airtel">Airtel Money</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button className="w-full" onClick={handlePayment}>Confirm Payment</Button>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default LandSearch;
