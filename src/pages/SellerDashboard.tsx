import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { getMyListings, getMyInquiries, updateListingStatus, type ListingResponse, type InquiryResponse } from "@/lib/api";
import AppTopBar from "@/components/AppTopBar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Eye, CheckCircle, ClipboardList, Package, ShieldCheck, AlertTriangle, Clock, MessageSquare, Mail, Phone, MapPin, ThumbsUp, Info } from "lucide-react";

const SellerDashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const listingsFetched = useRef(false);
  const [listings, setListings] = useState<ListingResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [inquiriesOpen, setInquiriesOpen] = useState(false);
  const [inquiries, setInquiries] = useState<InquiryResponse[]>([]);
  const [inquiriesLoading, setInquiriesLoading] = useState(false);

  useEffect(() => {
    document.title = "My Listings ◇ PS";
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/login");
      return;
    }
    if (!listingsFetched.current) {
      listingsFetched.current = true;
      loadListings();
    }
  }, [user, authLoading, navigate]);

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

  const approveListing = async (listingId: string) => {
    try {
      await updateListingStatus(listingId, "ACTIVE");
      toast({ title: "Listing approved", description: "It will now appear on Browse Land." });
      setListings(prev => prev.map(l => l.id === listingId ? { ...l, listing_status: "ACTIVE" as const } : l));
    } catch (err: any) {
      toast({ title: "Failed to approve", description: err.message, variant: "destructive" });
    }
  };

  const openInquiries = async () => {
    setInquiriesOpen(true);
    setInquiriesLoading(true);
    try {
      const data = await getMyInquiries();
      setInquiries(data.inquiries);
    } catch (error) {
      console.error("Failed to load inquiries:", error);
    } finally {
      setInquiriesLoading(false);
    }
  };

  if (authLoading) return null;
  if (!user) return null;

  const totalInquiries = listings.reduce((sum, l) => sum + l.views_count, 0);

  const stats = [
    { icon: <Package className="h-5 w-5 text-primary-mid" />, label: "Total Listings", value: listings.length },
    { icon: <CheckCircle className="h-5 w-5 text-success" />, label: "Active Listings", value: listings.filter(l => l.listing_status === "ACTIVE").length },
    { icon: <MessageSquare className="h-5 w-5 text-warning" />, label: "Inquiries Received", value: totalInquiries },
    { icon: <ClipboardList className="h-5 w-5 text-primary" />, label: "Listings Verified", value: listings.length },
  ];

  return (
    <div className="min-h-screen bg-background">
      <AppTopBar />
      <main className="container py-8">
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold mb-2">
            Welcome back, {user.name}
          </h1>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-200">
            Land Seller
          </span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map((s, i) => (
            <Card key={i}>
              <CardContent className="pt-6 pb-4 px-4">
                <div className="flex items-center gap-3 mb-2">{s.icon}<span className="text-xs text-muted-foreground font-body">{s.label}</span></div>
                <p className="text-2xl font-bold font-body">{s.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="font-display font-bold text-lg">My Listings</h2>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={openInquiries}>
                  <MessageSquare className="mr-1.5 h-4 w-4" /> Inquiries
                </Button>
                <Button size="sm" onClick={() => navigate("/sell/add")}>
                  <Plus className="mr-1.5 h-4 w-4" /> Add New Land Entry
                </Button>
              </div>
            </div>
            {loading ? (
              <div className="py-12 text-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto" />
                <p className="text-sm text-muted-foreground mt-2">Loading listings...</p>
              </div>
            ) : listings.length === 0 ? (
              <div className="py-12 text-center">
                <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No listings yet. Add your first land entry!</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <div className="px-4 py-3 bg-muted/30 border-b text-sm text-muted-foreground flex items-center gap-2">
                  <Info className="h-4 w-4 shrink-0" />
                  Your listing is under review. It will appear on Browse Land once approved (status: PENDING → ACTIVE).
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Location</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Verification</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Views</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {listings.map(l => {
                      const getVerificationBadge = () => {
                        if (!l.search_id) {
                          return { label: "Unverified", variant: "outline" as const, icon: <Clock className="h-3.5 w-3.5 mr-1" /> };
                        }
                        switch (l.risk_level) {
                          case "LOW":
                            return { label: "Verified ✓", variant: "default" as const, icon: <ShieldCheck className="h-3.5 w-3.5 mr-1 text-green-600" /> };
                          case "MEDIUM":
                            return { label: "Pending", variant: "secondary" as const, icon: <Clock className="h-3.5 w-3.5 mr-1 text-yellow-600" /> };
                          case "HIGH":
                            return { label: "Flagged ⚠", variant: "destructive" as const, icon: <AlertTriangle className="h-3.5 w-3.5 mr-1" /> };
                          default:
                            return { label: "Verified", variant: "default" as const, icon: <ShieldCheck className="h-3.5 w-3.5 mr-1" /> };
                        }
                      };
                      const vb = getVerificationBadge();
                      return (
                      <TableRow key={l.id}>
                        <TableCell>{l.district || l.specific_area || l.location || `${l.county}, ${l.village}`}</TableCell>
                        <TableCell className="font-body">UGX {((l.price_min || 0) / 1_000_000).toFixed(1)}M - {((l.price_max || 0) / 1_000_000).toFixed(1)}M</TableCell>
                        <TableCell>
                          <Badge variant={vb.variant} className="gap-0.5">
                            {vb.icon}{vb.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={l.listing_status === "ACTIVE" ? "default" : "secondary"}>
                            {l.listing_status}
                          </Badge>
                        </TableCell>
                        <TableCell>{l.views_count}</TableCell>
                        <TableCell className="flex gap-1">
                          <Button variant="outline" size="sm" onClick={() => navigate(`/sell/edit/${l.id}`)}>Edit</Button>
                          {l.listing_status === "PENDING" && user.role === "admin" && (
                            <Button variant="default" size="sm" onClick={() => approveListing(l.id)}>
                              <ThumbsUp className="h-3.5 w-3.5 mr-1" /> Approve
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <Dialog open={inquiriesOpen} onOpenChange={setInquiriesOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Buyer Inquiries</DialogTitle>
            <DialogDescription>Messages from buyers interested in your listings</DialogDescription>
          </DialogHeader>
          {inquiriesLoading ? (
            <div className="py-12 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto" />
            </div>
          ) : inquiries.length === 0 ? (
            <div className="py-12 text-center">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No inquiries yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {inquiries.map(inq => (
                <Card key={inq.id}>
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-semibold">{inq.buyer_name}</p>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                          <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" />{inq.buyer_email}</span>
                          {inq.buyer_phone && <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{inq.buyer_phone}</span>}
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground">{new Date(inq.created_at).toLocaleDateString("en-GB")}</span>
                    </div>
                    {inq.message && <p className="text-sm mt-2 text-muted-foreground border-t pt-2">{inq.message}</p>}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SellerDashboard;