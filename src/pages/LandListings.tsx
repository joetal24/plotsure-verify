import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { getListings, createInquiry, type ListingResponse, type InquiryCreateRequest } from "@/lib/api";
import AppTopBar from "@/components/AppTopBar";
import RiskBadge from "@/components/RiskBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, MapPin, Home, DollarSign, User, FileText, Eye, Send } from "lucide-react";

const LandListings = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [listings, setListings] = useState<ListingResponse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = "Listings ◇ PS";
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/login");
      return;
    }
    loadListings();
  }, [user, authLoading, navigate, page]);

  const loadListings = async () => {
    try {
      const data = await getListings(page);
      setListings(data.listings);
      setTotal(data.total);
    } catch (error) {
      console.error("Failed to load listings:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (min?: number, max?: number) => {
    if (!min && !max) return "Price on request";
    if (min && max) return `UGX ${(min / 1_000_000).toFixed(1)}M - ${(max / 1_000_000).toFixed(1)}M`;
    if (min) return `UGX ${(min / 1_000_000).toFixed(1)}M+`;
    return `Up to UGX ${((max || 0) / 1_000_000).toFixed(1)}M`;
  };

  const getRiskColor = (risk?: string) => {
    switch (risk) {
      case "LOW": return "bg-green-500";
      case "MEDIUM": return "bg-yellow-500";
      case "HIGH": return "bg-red-500";
      default: return "bg-gray-500";
    }
  };

  const openInquiry = (listing: ListingResponse) => {
    setInquiryListing(listing);
    setInquiryForm({
      buyer_name: user?.name || "",
      buyer_email: user?.email || "",
      buyer_phone: "",
      message: "",
    });
  };

  const handleSubmitInquiry = async () => {
    if (!inquiryListing || !inquiryForm.buyer_name || !inquiryForm.buyer_email) {
      toast({ title: "Error", description: "Name and email are required", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      await createInquiry(inquiryListing.id, inquiryForm);
      toast({ title: "Inquiry sent!", description: "The seller will be notified of your interest" });
      setInquiryListing(null);
    } catch (err: any) {
      toast({ title: "Failed to send", description: err.message || "Please try again", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading) return null;
  if (!user) return null;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AppTopBar />
      <main className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Available Land</h1>
            <p className="text-gray-600">Browse verified land available for sale in Uganda</p>
          </div>
        </div>

        {listings.length === 0 ? (
          <div className="text-center py-12">
            <Home className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900">No listings available</h3>
            <p className="text-gray-500">Check back later for new land listings</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {listings.map((listing) => (
                <Card key={listing.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        {listing.listing_status}
                      </Badge>
                      <div className="flex items-center text-sm text-gray-500">
                        <Eye className="h-4 w-4 mr-1" />
                        {listing.views_count} views
                      </div>
                    </div>
                    <CardTitle className="text-lg mt-2">
                      {listing.specific_area || listing.location || listing.plot_reference}
                    </CardTitle>
                    <CardDescription className="flex items-center mt-1">
                      <MapPin className="h-4 w-4 mr-1" />
                      {listing.district || listing.county}{listing.village ? `, ${listing.village}` : ""}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {listing.latitude && listing.longitude && (
                      <div className="rounded-md overflow-hidden border mb-2">
                        <iframe
                          title="Map"
                          src={`https://www.openstreetmap.org/export/embed.html?bbox=${listing.longitude - 0.01},${listing.latitude - 0.01},${listing.longitude + 0.01},${listing.latitude + 0.01}&layer=mapnik&marker=${listing.latitude},${listing.longitude}`}
                          width="100%"
                          height="140"
                          className="border-0"
                          loading="lazy"
                        />
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500 flex items-center">
                        <DollarSign className="h-4 w-4 mr-1" />
                        Price
                      </span>
                      <span className="font-medium">{formatPrice(listing.price_min, listing.price_max)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500 flex items-center">
                        <Home className="h-4 w-4 mr-1" />
                        Size
                      </span>
                      <span className="font-medium">
                        {listing.area_acres ? `${listing.area_acres} acres` : `${listing.plot_size || ""} ${listing.plot_size_unit || ""}`}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500 flex items-center">
                        <FileText className="h-4 w-4 mr-1" />
                        Title
                      </span>
                      <span className="font-medium">{listing.title_status || listing.land_type}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500 flex items-center">
                        <User className="h-4 w-4 mr-1" />
                        Owner
                      </span>
                      <span className="font-medium truncate max-w-[120px]">{listing.owner}</span>
                    </div>
                    {listing.risk_level && (
                      <div className="flex justify-between text-sm items-center">
                        <span className="text-gray-500">Risk Level</span>
                        <RiskBadge level={listing.risk_level as "LOW" | "MEDIUM" | "HIGH"} />
                      </div>
                    )}
                  </CardContent>
                  <CardFooter className="pt-3 border-t">
                    <Button className="w-full" variant="outline" onClick={() => openInquiry(listing)}>
                      <Send className="mr-2 h-4 w-4" /> Contact Seller
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>

            {total > page * 6 && (
              <div className="flex justify-center mt-8">
                <Button variant="outline" onClick={() => setPage(p => p + 1)}>
                  Load More
                </Button>
              </div>
            )}
          </>
        )}

        <Dialog open={!!inquiryListing} onOpenChange={(o) => !o && setInquiryListing(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Contact Seller</DialogTitle>
              <DialogDescription>
                {inquiryListing
                  ? `Send an inquiry about ${inquiryListing.specific_area || inquiryListing.location || "this property"}`
                  : ""}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Your Name *</Label>
                <Input value={inquiryForm.buyer_name} onChange={e => setInquiryForm(f => ({ ...f, buyer_name: e.target.value }))} />
              </div>
              <div>
                <Label>Your Email *</Label>
                <Input type="email" value={inquiryForm.buyer_email} onChange={e => setInquiryForm(f => ({ ...f, buyer_email: e.target.value }))} />
              </div>
              <div>
                <Label>Phone (optional)</Label>
                <Input value={inquiryForm.buyer_phone || ""} onChange={e => setInquiryForm(f => ({ ...f, buyer_phone: e.target.value }))} />
              </div>
              <div>
                <Label>Message (optional)</Label>
                <textarea
                  className="w-full p-3 border rounded-md min-h-[80px] text-sm"
                  rows={3}
                  value={inquiryForm.message || ""}
                  onChange={e => setInquiryForm(f => ({ ...f, message: e.target.value }))}
                  placeholder="I'm interested in this property..."
                />
              </div>
              <Button className="w-full" onClick={handleSubmitInquiry} disabled={submitting}>
                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                Send Inquiry
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default LandListings;