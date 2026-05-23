import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { verifyPlot, createListing, updateListing, getListing, type VerifyRequest } from "@/lib/api";
import AppTopBar from "@/components/AppTopBar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ShieldCheck, MapPin, Home, DollarSign, Globe, Map } from "lucide-react";
import LocationMap from "@/components/LocationMap";

const UGANDA_DISTRICTS = [
  "Kampala Central", "Kampala North", "Kampala East", "Kampala West",
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

const AddListing = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();
  const { toast } = useToast();
  const isEdit = Boolean(id);

  const fetchedRef = useRef(false);
  const [step, setStep] = useState<"verify" | "details">("verify");
  const [loading, setLoading] = useState(isEdit);
  const [verifying, setVerifying] = useState(false);
  const [verifiedData, setVerifiedData] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [coordErrors, setCoordErrors] = useState({ lat: "", lng: "" });

  const [verifyForm, setVerifyForm] = useState({
    search_method: "title" as "title" | "parcel",
    volume: "",
    folio: "",
    county: "",
    district: "",
    block_number: "",
    plot_number: "",
    land_type: "Freehold" as "Freehold" | "Leasehold" | "Mailo",
    plot_size: "",
    plot_size_unit: "metres" as "metres" | "Acres",
  });

  const [listingForm, setListingForm] = useState({
    county: "",
    village: "",
    specific_area: "",
    price_min: "",
    price_max: "",
    description: "",
    contact_preference: "both" as "email" | "phone" | "both",
    listing_status: "PENDING" as "PENDING" | "ACTIVE",
    latitude: "",
    longitude: "",
    district: "",
    parish: "",
    area_acres: "",
  });

  useEffect(() => {
    document.title = isEdit ? "Edit Listing ◇ PS" : "Add Listing ◇ PS";
  }, [isEdit]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/login");
      return;
    }
    if (user.role !== "land_seller") {
      toast({ title: "Access denied", description: "Buyers cannot edit listings", variant: "destructive" });
      navigate("/dashboard");
      return;
    }
    if (isEdit && id && !fetchedRef.current) {
      fetchedRef.current = true;
      loadExistingListing(id);
    }
  }, [user, authLoading, id, navigate]);

  const loadExistingListing = async (listingId: string) => {
    try {
      const data = await getListing(listingId);
      if (data.user_id !== user?.id) {
        toast({ title: "Access denied", description: "You can only edit your own listings", variant: "destructive" });
        navigate("/dashboard");
        return;
      }
      setListingForm({
        county: data.county || "",
        village: data.village || "",
        specific_area: data.specific_area || "",
        price_min: data.price_min?.toString() || "",
        price_max: data.price_max?.toString() || "",
        description: data.description || "",
        contact_preference: (data.contact_preference as any) || "both",
        listing_status: (data.listing_status === "ACTIVE" ? "ACTIVE" : "PENDING") as "PENDING" | "ACTIVE",
        latitude: data.latitude?.toString() || "",
        longitude: data.longitude?.toString() || "",
        district: data.district || "",
        parish: data.parish || "",
        area_acres: data.area_acres?.toString() || "",
      });
      setCoordErrors({ lat: "", lng: "" });
      if (data.plot_reference) {
        setVerifiedData(data);
      }
      setStep("details");
    } catch (error: any) {
      toast({ title: "Error", description: `Could not load listing: ${error.message}`, variant: "destructive" });
      navigate("/sell");
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) return null;
  if (!user) return null;
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const handleVerify = async () => {
    if (!verifyForm.volume && !verifyForm.plot_number) {
      toast({ title: "Error", description: "Enter Volume/Folio or Block/Plot number", variant: "destructive" });
      return;
    }

    setVerifying(true);
    try {
      const data = await verifyPlot({
        search_method: verifyForm.search_method,
        volume: verifyForm.volume || undefined,
        folio: verifyForm.folio || undefined,
        county: verifyForm.county || undefined,
        district: verifyForm.district || undefined,
        block_number: verifyForm.block_number || undefined,
        plot_number: verifyForm.plot_number || undefined,
        land_type: verifyForm.land_type,
        plot_size: parseFloat(verifyForm.plot_size) || 0,
        plot_size_unit: verifyForm.plot_size_unit,
      } as VerifyRequest);
      setVerifiedData(data);
      setStep("details");
      toast({ title: "Land verified!", description: "Now add your listing details" });
    } catch (error: any) {
      toast({ title: "Verification failed", description: error.message || "Could not verify land", variant: "destructive" });
    } finally {
      setVerifying(false);
    }
  };

  const handleSaveListing = async () => {
    if (!listingForm.county || !listingForm.village || !listingForm.specific_area) {
      toast({ title: "Error", description: "Fill in all location details", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const priceMin = parseFloat(listingForm.price_min);
      const priceMax = parseFloat(listingForm.price_max);
      const payload: any = {
        search_id: verifiedData?.search_id || verifiedData?.id,
        county: listingForm.county,
        village: listingForm.village,
        specific_area: listingForm.specific_area,
        price_min: isNaN(priceMin) ? undefined : priceMin,
        price_max: isNaN(priceMax) ? undefined : priceMax,
        description: listingForm.description || undefined,
        contact_preference: listingForm.contact_preference,
        listing_status: listingForm.listing_status,
        latitude: listingForm.latitude ? parseFloat(listingForm.latitude) : undefined,
        longitude: listingForm.longitude ? parseFloat(listingForm.longitude) : undefined,
        district: listingForm.district || undefined,
        parish: listingForm.parish || undefined,
        area_acres: listingForm.area_acres ? parseFloat(listingForm.area_acres) : undefined,
      };

      if (isEdit && id) {
        await updateListing(id, payload);
        toast({ title: "Listing updated!", description: "Your changes have been saved" });
      } else {
        await createListing(payload);
        toast({ title: "Listing created!", description: "Your land is now listed" });
      }
      navigate("/sell");
    } catch (error: any) {
      toast({ title: isEdit ? "Failed to update" : "Failed to create listing", description: error.message || "Try again", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <AppTopBar />
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <h1 className="text-2xl font-bold mb-6">{isEdit ? "Edit Listing" : "Add New Listing"}</h1>

        {!isEdit && step === "verify" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <ShieldCheck className="h-5 w-5 mr-2" />
                Step 1: Verify Your Land
              </CardTitle>
              <CardDescription>First verify your land ownership through the registry</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Search Method</Label>
                <RadioGroup
                  value={verifyForm.search_method}
                  onValueChange={(v: any) => setVerifyForm(f => ({ ...f, search_method: v }))}
                  className="flex gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="title" id="title" />
                    <Label htmlFor="title">Title (Volume/Folio)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="parcel" id="parcel" />
                    <Label htmlFor="parcel">Parcel (Block/Plot)</Label>
                  </div>
                </RadioGroup>
              </div>

              {verifyForm.search_method === "title" ? (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Volume Number</Label>
                    <Input value={verifyForm.volume} onChange={e => setVerifyForm(f => ({ ...f, volume: e.target.value }))} placeholder="e.g., 1" />
                  </div>
                  <div className="space-y-2">
                    <Label>Page/Folio Number</Label>
                    <Input value={verifyForm.folio} onChange={e => setVerifyForm(f => ({ ...f, folio: e.target.value }))} placeholder="e.g., 123" />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>County</Label>
                    <Input value={verifyForm.county} onChange={e => setVerifyForm(f => ({ ...f, county: e.target.value }))} placeholder="e.g., Kampala" />
                  </div>
                  <div className="space-y-2">
                    <Label>District</Label>
                    <Input value={verifyForm.district} onChange={e => setVerifyForm(f => ({ ...f, district: e.target.value }))} placeholder="e.g., Kampala Central" />
                  </div>
                  <div className="space-y-2">
                    <Label>Block Number</Label>
                    <Input value={verifyForm.block_number} onChange={e => setVerifyForm(f => ({ ...f, block_number: e.target.value }))} placeholder="e.g., 12" />
                  </div>
                  <div className="space-y-2">
                    <Label>Plot Number</Label>
                    <Input value={verifyForm.plot_number} onChange={e => setVerifyForm(f => ({ ...f, plot_number: e.target.value }))} placeholder="e.g., 45" />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Land Type</Label>
                  <Select value={verifyForm.land_type} onValueChange={(v: any) => setVerifyForm(f => ({ ...f, land_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Freehold">Freehold</SelectItem>
                      <SelectItem value="Leasehold">Leasehold</SelectItem>
                      <SelectItem value="Mailo">Mailo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Plot Size</Label>
                  <Input type="number" value={verifyForm.plot_size} onChange={e => setVerifyForm(f => ({ ...f, plot_size: e.target.value }))} placeholder="e.g., 1" />
                </div>
                <div className="space-y-2">
                  <Label>Unit</Label>
                  <Select value={verifyForm.plot_size_unit} onValueChange={(v: any) => setVerifyForm(f => ({ ...f, plot_size_unit: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="metres">metres</SelectItem>
                      <SelectItem value="Acres">Acres</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button onClick={handleVerify} disabled={verifying} className="w-full">
                {verifying ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ShieldCheck className="h-4 w-4 mr-2" />}
                Verify Land
              </Button>
            </CardContent>
          </Card>
        )}

        {(step === "details" || isEdit) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <MapPin className="h-5 w-5 mr-2" />
                {isEdit ? "Edit Listing Details" : "Step 2: Add Listing Details"}
              </CardTitle>
              {verifiedData && (
                <CardDescription>Verified: {verifiedData.owner} - {verifiedData.location}</CardDescription>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>County *</Label>
                  <Input value={listingForm.county} onChange={e => setListingForm(f => ({ ...f, county: e.target.value }))} placeholder="e.g., Kampala" />
                </div>
                <div className="space-y-2">
                  <Label>Village *</Label>
                  <Input value={listingForm.village} onChange={e => setListingForm(f => ({ ...f, village: e.target.value }))} placeholder="e.g., Kisaasi" />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Specific Area *</Label>
                <Input value={listingForm.specific_area} onChange={e => setListingForm(f => ({ ...f, specific_area: e.target.value }))} placeholder="e.g., Kisaasi-Bukoto Road" />
              </div>

              <div className="border-t pt-4">
                <h3 className="font-display font-semibold text-sm mb-3 flex items-center gap-2">
                  <Globe className="h-4 w-4" /> GIS / Location Data
                </h3>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="space-y-2">
                    <Label>Latitude</Label>
                    <Input
                      type="number" step="any"
                      value={listingForm.latitude}
                      onChange={e => {
                        const v = e.target.value;
                        setListingForm(f => ({ ...f, latitude: v }));
                        const n = parseFloat(v);
                        if (v && (isNaN(n) || n < -1.4784 || n > 4.2340)) {
                          setCoordErrors(e => ({ ...e, lat: "Coordinates must be within Uganda" }));
                        } else {
                          setCoordErrors(e => ({ ...e, lat: "" }));
                        }
                      }}
                      placeholder="e.g. 0.3476"
                    />
                    {coordErrors.lat && <p className="text-xs text-destructive mt-1">{coordErrors.lat}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>Longitude</Label>
                    <Input
                      type="number" step="any"
                      value={listingForm.longitude}
                      onChange={e => {
                        const v = e.target.value;
                        setListingForm(f => ({ ...f, longitude: v }));
                        const n = parseFloat(v);
                        if (v && (isNaN(n) || n < 29.5734 || n > 35.0007)) {
                          setCoordErrors(e => ({ ...e, lng: "Coordinates must be within Uganda" }));
                        } else {
                          setCoordErrors(e => ({ ...e, lng: "" }));
                        }
                      }}
                      placeholder="e.g. 32.5825"
                    />
                    {coordErrors.lng && <p className="text-xs text-destructive mt-1">{coordErrors.lng}</p>}
                  </div>
                </div>
                <div className="mb-4">
                  <LocationMap
                    latitude={listingForm.latitude}
                    longitude={listingForm.longitude}
                    onLatLngChange={(lat, lng) => {
                      setListingForm(f => ({ ...f, latitude: lat, longitude: lng }));
                      setCoordErrors({ lat: "", lng: "" });
                    }}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>District</Label>
                    <Select value={listingForm.district} onValueChange={v => setListingForm(f => ({ ...f, district: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select district" /></SelectTrigger>
                      <SelectContent className="max-h-48">
                        {UGANDA_DISTRICTS.map(d => (
                          <SelectItem key={d} value={d}>{d}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Parish / Village</Label>
                    <Input value={listingForm.parish} onChange={e => setListingForm(f => ({ ...f, parish: e.target.value }))} placeholder="e.g., Bukoto" />
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  <Label>Land Area (acres)</Label>
                  <Input type="number" step="0.01" value={listingForm.area_acres} onChange={e => setListingForm(f => ({ ...f, area_acres: e.target.value }))} placeholder="e.g., 2.5" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Min Price (UGX)</Label>
                  <Input type="number" value={listingForm.price_min} onChange={e => setListingForm(f => ({ ...f, price_min: e.target.value }))} placeholder="50000000" />
                </div>
                <div className="space-y-2">
                  <Label>Max Price (UGX)</Label>
                  <Input type="number" value={listingForm.price_max} onChange={e => setListingForm(f => ({ ...f, price_max: e.target.value }))} placeholder="70000000" />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <textarea
                  className="w-full p-3 border rounded-md min-h-[80px]"
                  rows={3}
                  value={listingForm.description}
                  onChange={e => setListingForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Describe your property..."
                />
              </div>

              <div className="space-y-2">
                <Label>Contact Preference</Label>
                <Select value={listingForm.contact_preference} onValueChange={(v: any) => setListingForm(f => ({ ...f, contact_preference: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Email only</SelectItem>
                    <SelectItem value="phone">Phone only</SelectItem>
                    <SelectItem value="both">Both</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Listing Status</Label>
                <Select value={listingForm.listing_status} onValueChange={(v: "PENDING" | "ACTIVE") => setListingForm(f => ({ ...f, listing_status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-4">
                {!isEdit && <Button variant="outline" onClick={() => setStep("verify")}>Back</Button>}
                <Button onClick={handleSaveListing} disabled={saving} className="flex-1">
                  {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                  {isEdit ? "Save Changes" : "Create Listing"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default AddListing;