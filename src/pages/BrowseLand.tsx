import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { getListings, getListingSeller, type ListingResponse, type SellerContact } from "@/lib/api";
import AppTopBar from "@/components/AppTopBar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Home, MapPin, Loader2, Search, X, Phone, Mail, MessageCircle } from "lucide-react";
import { MapContainer, TileLayer, Marker } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const markerIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

function formatPrice(v: number | undefined | null): string {
  if (v == null) return "";
  return "UGX " + v.toLocaleString("en-UG");
}

function formatDate(iso: string | undefined | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

function parsePlotRef(ref: string): { volume?: string; folio?: string } {
  const m = ref.match(/VOL\s*(\d+).*?FOL\s*(\d+)/i);
  return m ? { volume: m[1], folio: m[2] } : {};
}

const BrowseLand = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [listings, setListings] = useState<ListingResponse[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const [filterDistrict, setFilterDistrict] = useState("All");
  const [filterMaxPrice, setFilterMaxPrice] = useState("");

  const [selectedListing, setSelectedListing] = useState<ListingResponse | null>(null);
  const [sellerContact, setSellerContact] = useState<SellerContact | null>(null);
  const [sellerContactLoading, setSellerContactLoading] = useState(false);

  useEffect(() => {
    document.title = "Browse ◇ PS";
  }, []);

  const fetchPage = async (p: number) => {
    try {
      const data = await getListings(p);
      setListings(prev => (p === 1 ? data.listings : [...prev, ...data.listings]));
      setTotal(data.total);
    } catch {
      toast({ title: "Failed to load listings", variant: "destructive" });
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchPage(1);
  }, []);

  const handleLoadMore = () => {
    setLoadingMore(true);
    const next = page + 1;
    setPage(next);
    fetchPage(next);
  };

  const filtered = useMemo(() => {
    return listings.filter(l => {
      if (filterDistrict !== "All" && l.district !== filterDistrict) return false;
      if (filterMaxPrice) {
        const max = parseFloat(filterMaxPrice.replace(/,/g, ""));
        if (!isNaN(max) && (l.price_max ?? 0) > max) return false;
      }
      return true;
    });
  }, [listings, filterDistrict, filterMaxPrice]);

  const districts = useMemo(() => {
    const d = new Set(listings.map(l => l.district).filter(Boolean) as string[]);
    return [...d].sort();
  }, [listings]);

  const clearFilters = () => {
    setFilterDistrict("All");
    setFilterMaxPrice("");
  };

  const hasFilters = filterDistrict !== "All" || filterMaxPrice !== "";

  const smartNavigate = useCallback((listing: ListingResponse) => {
    if (!user) {
      toast({ title: "Sign in to verify this plot", description: "Create an account or log in to continue." });
      navigate("/login");
      return;
    }
    const ref = listing.plot_reference || "";
    const { volume, folio } = parsePlotRef(ref);
    const params = new URLSearchParams();
    if (listing.search_id && volume && folio) {
      if (volume) params.set("vol", volume);
      if (folio) params.set("fol", folio);
      params.set("listing", listing.id);
      navigate(`/search?${params.toString()}`);
      return;
    }
    if (listing.district) params.set("district", listing.district);
    if (listing.id) params.set("listing", listing.id);
    navigate(`/search?${params.toString()}`);
  }, [user, navigate, toast]);

  const openPanel = useCallback(async (listing: ListingResponse) => {
    setSelectedListing(listing);
    setSellerContact(null);
    setSellerContactLoading(true);
    if (user) {
      try {
        const contact = await getListingSeller(listing.id);
        setSellerContact(contact);
      } catch {
        // silently fail — panel still shows without contact info
      } finally {
        setSellerContactLoading(false);
      }
    } else {
      setSellerContactLoading(false);
    }
  }, [user]);

  const closePanel = useCallback(() => {
    setSelectedListing(null);
    setSellerContact(null);
  }, []);

  if (authLoading) return null;

  return (
    <div className="min-h-screen bg-background">
      <AppTopBar />
      <main className="container py-8">
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-display font-bold">Browse Listed Plots</h1>
          <p className="text-muted-foreground mt-1">Explore plots listed for sale on PlotSure. Click any plot to verify its title before you buy.</p>
        </div>

        {/* Filter bar */}
        <div className="flex flex-wrap items-end gap-3 mb-6 p-4 rounded-xl border bg-card">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">District</label>
            <Select value={filterDistrict} onValueChange={setFilterDistrict}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All districts</SelectItem>
                {districts.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Max Price (UGX)</label>
            <Input
              placeholder="e.g. 50,000,000"
              value={filterMaxPrice}
              onChange={e => setFilterMaxPrice(e.target.value)}
              className="w-44"
            />
          </div>
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs">
              Clear filters
            </Button>
          )}
          <div className="text-xs text-muted-foreground ml-auto">
            Showing {filtered.length} plot{filtered.length !== 1 ? "s" : ""}
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <div className="h-[180px] bg-muted animate-pulse" />
                <CardContent className="p-4 space-y-3">
                  <div className="h-3 bg-muted animate-pulse rounded w-3/4" />
                  <div className="h-3 bg-muted animate-pulse rounded w-1/2" />
                  <div className="h-4 bg-muted animate-pulse rounded w-full" />
                  <div className="h-3 bg-muted animate-pulse rounded w-2/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* No listings */}
        {!loading && listings.length === 0 && (
          <div className="py-20 text-center space-y-4">
            <Home className="h-12 w-12 text-muted-foreground mx-auto" />
            <p className="text-muted-foreground">No plots listed yet. Check back soon.</p>
            <Button onClick={() => navigate("/search")}>Start a New Search</Button>
          </div>
        )}

        {/* No results after filter */}
        {!loading && listings.length > 0 && filtered.length === 0 && (
          <div className="py-20 text-center space-y-4">
            <Search className="h-12 w-12 text-muted-foreground mx-auto" />
            <p className="text-muted-foreground">No plots match your filters.</p>
            <Button variant="ghost" onClick={clearFilters}>Clear filters</Button>
          </div>
        )}

        {/* Grid */}
        {!loading && filtered.length > 0 && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map(listing => (
                <Card key={listing.id} className="overflow-hidden flex flex-col">
                  {/* Image / Placeholder */}
                  <div className="relative h-[180px] bg-muted flex items-center justify-center overflow-hidden">
                    {listing.latitude && listing.longitude ? (
                      <iframe
                        title="Map"
                        src={`https://www.openstreetmap.org/export/embed.html?bbox=${listing.longitude - 0.01},${listing.latitude - 0.01},${listing.longitude + 0.01},${listing.latitude + 0.01}&layer=mapnik&marker=${listing.latitude},${listing.longitude}`}
                        width="100%"
                        height="180"
                        className="border-0"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <MapPin className="h-8 w-8" />
                        <span className="text-sm font-medium">{listing.district || listing.county || "Uganda"}</span>
                      </div>
                    )}
                    {(listing.price_max ?? 0) > 100_000_000 && (
                      <span className="absolute top-3 left-3 bg-primary text-primary-foreground text-[11px] font-bold px-2 py-0.5 rounded">
                        Premium
                      </span>
                    )}
                  </div>

                  {/* Body */}
                  <CardContent className="p-4 flex-1 flex flex-col gap-2">
                    <p className="text-[13px] text-muted-foreground">
                      {listing.district || listing.county || ""}{listing.parish || listing.village ? ` · ${listing.parish || listing.village}` : ""}
                    </p>
                    <p className="text-sm text-foreground/70">
                      {listing.area_acres ? `${listing.area_acres} acres` : ""}
                    </p>
                    <p className="font-bold text-base">
                      {formatPrice(listing.price_min)} – {formatPrice(listing.price_max)}
                    </p>
                    {listing.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                        {listing.description}
                      </p>
                    )}
                  </CardContent>

                  {/* Footer */}
                  <div className="px-4 pb-4 pt-0 flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => openPanel(listing)}
                    >
                      View Details
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
                      onClick={() => smartNavigate(listing)}
                    >
                      <Search className="h-4 w-4 mr-1.5" />
                      {!user ? "Verify & Check Title" : user.role === "land_seller" ? "View Title Details" : "Verify & Check Title"}
                    </Button>
                  </div>
                </Card>
              ))}
            </div>

            {/* Load more */}
            {listings.length < total && (
              <div className="flex justify-center mt-8">
                <Button variant="outline" onClick={handleLoadMore} disabled={loadingMore}>
                  {loadingMore ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                  Load more
                </Button>
              </div>
            )}
          </>
        )}
      </main>

      {/* Slide-in detail panel */}
      {selectedListing && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/30" onClick={closePanel} />
          <div className="relative w-full max-w-lg bg-background h-full overflow-y-auto shadow-2xl animate-in slide-in-from-right duration-300">
            <div className="sticky top-0 z-10 bg-background border-b px-5 py-4 flex items-center justify-between">
              <div className="min-w-0 flex-1 pr-3">
                <p className="font-semibold text-base truncate">
                  {selectedListing.district || selectedListing.county || "Unknown"}
                  {selectedListing.village ? ` · ${selectedListing.village}` : ""}
                </p>
                <span
                  className={`inline-block mt-1 text-[11px] font-bold px-2 py-0.5 rounded ${
                    selectedListing.listing_status === "ACTIVE"
                      ? "bg-success/10 text-success"
                      : "bg-warning/10 text-warning"
                  }`}
                >
                  {selectedListing.listing_status}
                </span>
              </div>
              <Button variant="ghost" size="icon" onClick={closePanel}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="p-5 space-y-6">
              {/* Map */}
              <div className="h-[200px] rounded-xl overflow-hidden border">
                {selectedListing.latitude && selectedListing.longitude ? (
                  <MapContainer
                    center={[selectedListing.latitude, selectedListing.longitude]}
                    zoom={16}
                    scrollWheelZoom={false}
                    className="h-full w-full"
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <Marker position={[selectedListing.latitude, selectedListing.longitude]} icon={markerIcon} />
                  </MapContainer>
                ) : (
                  <div className="h-full flex items-center justify-center bg-muted text-sm text-muted-foreground">
                    <MapPin className="h-5 w-5 mr-2" />
                    Location not provided
                  </div>
                )}
              </div>

              {/* Details */}
              <div className="space-y-3">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Location Details</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">District</span><span className="font-medium text-right">{selectedListing.district || "—"}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">County</span><span className="font-medium text-right">{selectedListing.county || "—"}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Parish</span><span className="font-medium text-right">{selectedListing.parish || "—"}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Village</span><span className="font-medium text-right">{selectedListing.village || "—"}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Specific Area</span><span className="font-medium text-right">{selectedListing.specific_area || "—"}</span></div>
                </div>
                <div className="border-t pt-3 space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Land Area</span><span className="font-medium">{selectedListing.area_acres ? `${selectedListing.area_acres} acres` : "—"}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Price Range</span><span className="font-medium">{formatPrice(selectedListing.price_min)} – {formatPrice(selectedListing.price_max)}</span></div>
                </div>
                {selectedListing.description && (
                  <div className="border-t pt-3">
                    <p className="text-xs text-muted-foreground mb-1">Description</p>
                    <p className="text-sm leading-relaxed">{selectedListing.description}</p>
                  </div>
                )}
                <div className="border-t pt-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Listed on</span>
                    <span className="font-medium">{formatDate(selectedListing.created_at)}</span>
                  </div>
                </div>
              </div>

              {/* Contact Seller */}
              <div className="border-t pt-4 space-y-3">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Contact Seller</h3>
                {sellerContactLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading contact info...
                  </div>
                ) : sellerContact && ((sellerContact.contact_preference === "phone" || sellerContact.contact_preference === "both") && sellerContact.contact_phone) || ((sellerContact.contact_preference === "email" || sellerContact.contact_preference === "both") && sellerContact.email) ? (
                  <div className="space-y-3">
                    {(sellerContact.contact_preference === "phone" || sellerContact.contact_preference === "both") && sellerContact.contact_phone && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Phone</p>
                        <p className="text-sm font-medium mb-2">{sellerContact.contact_phone}</p>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <a href={`tel:${sellerContact.contact_phone}`} className="flex-1">
                            <Button variant="secondary" className="w-full">
                              <Phone className="h-4 w-4 mr-2" />
                              Call Seller
                            </Button>
                          </a>
                          <a
                            href={`https://wa.me/256${sellerContact.contact_phone.substring(1)}?text=${encodeURIComponent(`Hi, I saw your plot listed on PlotSure (${selectedListing.district || ""} · ${selectedListing.village || ""}). I am interested and would like more details.`)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1"
                          >
                            <Button variant="secondary" className="w-full">
                              <MessageCircle className="h-4 w-4 mr-2" />
                              WhatsApp
                            </Button>
                          </a>
                        </div>
                      </div>
                    )}
                    {(sellerContact.contact_preference === "email" || sellerContact.contact_preference === "both") && sellerContact.email && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Email</p>
                        <p className="text-sm font-medium mb-2">{sellerContact.email}</p>
                        <a href={`mailto:${sellerContact.email}`} className="block">
                          <Button variant="secondary" className="w-full">
                            <Mail className="h-4 w-4 mr-2" />
                            Email Seller
                          </Button>
                        </a>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Seller has not provided contact details yet.</p>
                )}
              </div>

              {/* CTA */}
              <div className="border-t pt-4">
                <Button
                  className="w-full bg-[#0a1628] hover:bg-[#0a1628]/90 text-white"
                  size="lg"
                  onClick={() => {
                    const listing = selectedListing;
                    closePanel();
                    smartNavigate(listing);
                  }}
                >
                  <Search className="h-5 w-5 mr-2" />
                  Verify & Check Title
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BrowseLand;
