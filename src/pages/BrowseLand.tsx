import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { getListings, type ListingResponse } from "@/lib/api";
import AppTopBar from "@/components/AppTopBar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Home, MapPin, Loader2, Search } from "lucide-react";

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

  const handleCtaClick = (listing: ListingResponse) => {
    if (!user) {
      toast({ title: "Sign in to verify this plot", description: "Create an account or log in to continue." });
      navigate("/login");
      return;
    }
    if (user.role === "land_seller") {
      const ref = listing.plot_reference || "";
      const { volume, folio } = parsePlotRef(ref);
      const params = new URLSearchParams();
      if (volume) params.set("volume", volume);
      if (folio) params.set("folio", folio);
      navigate(`/search?${params.toString()}`);
      return;
    }
    const ref = listing.plot_reference || "";
    const { volume, folio } = parsePlotRef(ref);
    const params = new URLSearchParams();
    if (volume) params.set("volume", volume);
    if (folio) params.set("folio", folio);
    navigate(`/search?${params.toString()}`);
  };

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
                      UGX {(listing.price_min ?? 0).toLocaleString()} – UGX {(listing.price_max ?? 0).toLocaleString()}
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
                      onClick={() => handleCtaClick(listing)}
                    >
                      View Details
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
                      onClick={() => handleCtaClick(listing)}
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
    </div>
  );
};

export default BrowseLand;
