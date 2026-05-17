import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { verifyPlot, createListing, type VerifyRequest } from "@/lib/api";
import AppTopBar from "@/components/AppTopBar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ShieldCheck, MapPin, Home, DollarSign } from "lucide-react";

const AddListing = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [step, setStep] = useState<"verify" | "details">("verify");
  const [verifying, setVerifying] = useState(false);
  const [verifiedData, setVerifiedData] = useState<any>(null);
  const [saving, setSaving] = useState(false);

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
  });

  if (!user) {
    navigate("/login");
    return null;
  }

  if (user.role !== "land_seller") {
    navigate("/dashboard");
    return null;
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
      await createListing({
        search_id: verifiedData?.id,
        county: listingForm.county,
        village: listingForm.village,
        specific_area: listingForm.specific_area,
        price_min: parseFloat(listingForm.price_min) || 0,
        price_max: parseFloat(listingForm.price_max) || 0,
        description: listingForm.description || undefined,
        contact_preference: listingForm.contact_preference,
        listing_status: listingForm.listing_status,
      });
      toast({ title: "Listing created!", description: "Your land is now listed" });
      navigate("/sell");
    } catch (error: any) {
      toast({ title: "Failed to create listing", description: error.message || "Try again", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AppTopBar />
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <h1 className="text-2xl font-bold mb-6">Add New Listing</h1>

        {step === "verify" && (
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
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Volume Number</Label>
                      <Input
                        value={verifyForm.volume}
                        onChange={(e) => setVerifyForm(f => ({ ...f, volume: e.target.value }))}
                        placeholder="e.g., 1"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Page/Folio Number</Label>
                      <Input
                        value={verifyForm.folio}
                        onChange={(e) => setVerifyForm(f => ({ ...f, folio: e.target.value }))}
                        placeholder="e.g., 123"
                      />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>County</Label>
                      <Input
                        value={verifyForm.county}
                        onChange={(e) => setVerifyForm(f => ({ ...f, county: e.target.value }))}
                        placeholder="e.g., Kampala"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>District</Label>
                      <Input
                        value={verifyForm.district}
                        onChange={(e) => setVerifyForm(f => ({ ...f, district: e.target.value }))}
                        placeholder="e.g., Kampala Central"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Block Number</Label>
                      <Input
                        value={verifyForm.block_number}
                        onChange={(e) => setVerifyForm(f => ({ ...f, block_number: e.target.value }))}
                        placeholder="e.g., 12"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Plot Number</Label>
                      <Input
                        value={verifyForm.plot_number}
                        onChange={(e) => setVerifyForm(f => ({ ...f, plot_number: e.target.value }))}
                        placeholder="e.g., 45"
                      />
                    </div>
                  </div>
                </>
              )}

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Land Type</Label>
                  <Select
                    value={verifyForm.land_type}
                    onValueChange={(v: any) => setVerifyForm(f => ({ ...f, land_type: v }))}
                  >
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
                  <Input
                    type="number"
                    value={verifyForm.plot_size}
                    onChange={(e) => setVerifyForm(f => ({ ...f, plot_size: e.target.value }))}
                    placeholder="e.g., 1"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Unit</Label>
                  <Select
                    value={verifyForm.plot_size_unit}
                    onValueChange={(v: any) => setVerifyForm(f => ({ ...f, plot_size_unit: v }))}
                  >
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

        {step === "details" && verifiedData && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <MapPin className="h-5 w-5 mr-2" />
                Step 2: Add Listing Details
              </CardTitle>
              <CardDescription>
                Verified: {verifiedData.owner} - {verifiedData.location}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>County *</Label>
                  <Input
                    value={listingForm.county}
                    onChange={(e) => setListingForm(f => ({ ...f, county: e.target.value }))}
                    placeholder="e.g., Kampala"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Village *</Label>
                  <Input
                    value={listingForm.village}
                    onChange={(e) => setListingForm(f => ({ ...f, village: e.target.value }))}
                    placeholder="e.g., Kisaasi"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Specific Area *</Label>
                <Input
                  value={listingForm.specific_area}
                  onChange={(e) => setListingForm(f => ({ ...f, specific_area: e.target.value }))}
                  placeholder="e.g., Kisaasi-Bukoto Road"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Min Price (UGX)</Label>
                  <Input
                    type="number"
                    value={listingForm.price_min}
                    onChange={(e) => setListingForm(f => ({ ...f, price_min: e.target.value }))}
                    placeholder="50000000"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Max Price (UGX)</Label>
                  <Input
                    type="number"
                    value={listingForm.price_max}
                    onChange={(e) => setListingForm(f => ({ ...f, price_max: e.target.value }))}
                    placeholder="70000000"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <textarea
                  className="w-full p-3 border rounded-md"
                  rows={3}
                  value={listingForm.description}
                  onChange={(e) => setListingForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Describe your property..."
                />
              </div>

              <div className="space-y-2">
                <Label>Contact Preference</Label>
                <Select
                  value={listingForm.contact_preference}
                  onValueChange={(v: any) => setListingForm(f => ({ ...f, contact_preference: v }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Email only</SelectItem>
                    <SelectItem value="phone">Phone only</SelectItem>
                    <SelectItem value="both">Both</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-4">
                <Button variant="outline" onClick={() => setStep("verify")}>
                  Back
                </Button>
                <Button onClick={handleSaveListing} disabled={saving} className="flex-1">
                  {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                  Create Listing
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