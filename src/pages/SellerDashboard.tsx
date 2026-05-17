import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { getMyListings, type ListingResponse } from "@/lib/api";
import AppTopBar from "@/components/AppTopBar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Plus, Package, Eye, Clock, CheckCircle, XCircle } from "lucide-react";

const SellerDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [listings, setListings] = useState<ListingResponse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }
    if (user.role !== "land_seller") {
      navigate("/dashboard");
      return;
    }
    loadListings();
  }, [user, navigate]);

  const loadListings = async () => {
    try {
      const data = await getMyListings(1);
      setListings(data.listings);
    } catch (error) {
      console.error("Failed to load listings:", error);
    } finally {
      setLoading(false);
    }
  };

  const stats = {
    active: listings.filter(l => l.listing_status === "ACTIVE").length,
    pending: listings.filter(l => l.listing_status === "PENDING").length,
    sold: listings.filter(l => l.listing_status === "SOLD").length,
    totalViews: listings.reduce((sum, l) => sum + l.views_count, 0),
  };

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
            <h1 className="text-2xl font-bold text-gray-900">Seller Dashboard</h1>
            <p className="text-gray-600">Manage your land listings</p>
          </div>
          <Button onClick={() => navigate("/sell/add")}>
            <Plus className="h-4 w-4 mr-2" />
            Add Listing
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">Active Listings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center">
                <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                <span className="text-2xl font-bold">{stats.active}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">Pending</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center">
                <Clock className="h-5 w-5 text-yellow-500 mr-2" />
                <span className="text-2xl font-bold">{stats.pending}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">Sold</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center">
                <XCircle className="h-5 w-5 text-gray-500 mr-2" />
                <span className="text-2xl font-bold">{stats.sold}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">Total Views</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center">
                <Eye className="h-5 w-5 text-blue-500 mr-2" />
                <span className="text-2xl font-bold">{stats.totalViews}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="active">
          <TabsList>
            <TabsTrigger value="active">Active ({stats.active})</TabsTrigger>
            <TabsTrigger value="pending">Pending ({stats.pending})</TabsTrigger>
            <TabsTrigger value="sold">Sold ({stats.sold})</TabsTrigger>
          </TabsList>

          <TabsContent value="active">
            <ListingListings listings={listings.filter(l => l.listing_status === "ACTIVE")} />
          </TabsContent>
          <TabsContent value="pending">
            <ListingListings listings={listings.filter(l => l.listing_status === "PENDING")} />
          </TabsContent>
          <TabsContent value="sold">
            <ListingListings listings={listings.filter(l => l.listing_status === "SOLD")} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

const ListingListings = ({ listings }: { listings: ListingResponse[] }) => {
  const navigate = useNavigate();

  if (listings.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
        <p>No listings found</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 mt-4">
      {listings.map((listing) => (
        <Card key={listing.id} className="hover:shadow-md transition-shadow">
          <CardContent className="py-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-medium">{listing.specific_area || listing.location}</h3>
                <p className="text-sm text-gray-500">
                  {listing.county}, {listing.village}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="font-medium">UGX {((listing.price_min || 0) / 1_000_000).toFixed(1)}M</p>
                  <p className="text-sm text-gray-500">{listing.views_count} views</p>
                </div>
                <Badge variant={listing.listing_status === "ACTIVE" ? "default" : "secondary"}>
                  {listing.listing_status}
                </Badge>
                <Button variant="outline" size="sm" onClick={() => navigate(`/sell/edit/${listing.id}`)}>
                  Edit
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default SellerDashboard;