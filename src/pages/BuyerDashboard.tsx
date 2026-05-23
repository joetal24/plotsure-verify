import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSearch } from "@/contexts/SearchContext";
import { supabase } from "@/lib/supabase";
import AppTopBar from "@/components/AppTopBar";
import RiskBadge from "@/components/RiskBadge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, AlertTriangle, Bookmark, Loader2, RefreshCw } from "lucide-react";

const BuyerDashboard = () => {
  const { user } = useAuth();
  const { searches, setCurrentResult, fetchHistory, loading, error } = useSearch();
  const navigate = useNavigate();
  const [savedCount, setSavedCount] = useState<number | null>(null);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      await Promise.all([
        fetchHistory(),
        supabase
          .from("saved_properties")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .then(({ count }) => setSavedCount(count ?? 0))
          .catch(() => setSavedCount(0)),
      ]);
    };
    load();
  }, [user, fetchHistory]);

  if (!user) return null;

  const highRisk = searches.filter(s => s.riskLevel === "HIGH").length;
  const last30d = searches.filter(s => {
    const d = new Date(s.dateSearched.split("/").reverse().join("-"));
    return (Date.now() - d.getTime()) / 86400000 <= 30;
  }).length;

  const stats = [
    { icon: <Search className="h-5 w-5 text-primary-mid" />, label: "Total Searches", value: searches.length },
    { icon: <AlertTriangle className="h-5 w-5 text-destructive" />, label: "High Risk Flagged", value: highRisk },
    { icon: <Bookmark className="h-5 w-5 text-primary" />, label: "Saved Plots", value: savedCount ?? 0 },
    { icon: <Loader2 className="h-5 w-5 text-warning" />, label: "Searches (last 30d)", value: last30d },
  ];

  const handleView = (id: string) => {
    const result = searches.find(s => s.id === id);
    if (result) {
      setCurrentResult(result);
      navigate("/search?step=3");
    }
  };

  const roleLabel = user.role === "admin" ? "Admin" : "Land Buyer";

  return (
    <div className="min-h-screen bg-background">
      <AppTopBar />
      <main className="container py-8">
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold mb-2">
            Welcome back, {user.name}
          </h1>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
            {roleLabel}
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
              <h2 className="font-display font-bold text-lg">Recent Searches</h2>
              <Button size="sm" onClick={() => navigate("/search")}>
                <Search className="mr-1.5 h-4 w-4" /> Start New Search
              </Button>
            </div>
            {loading ? (
              <div className="py-12 text-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto" />
                <p className="text-sm text-muted-foreground mt-2">Loading searches...</p>
              </div>
            ) : error ? (
              <div className="py-12 text-center">
                <RefreshCw className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground font-body">Could not load your searches. Please refresh the page.</p>
              </div>
            ) : searches.length === 0 ? (
              <div className="py-12 text-center space-y-4">
                <Search className="h-10 w-10 text-muted-foreground mx-auto" />
                <p className="text-muted-foreground font-body">No searches yet. Start a new search to verify a plot.</p>
                <Button onClick={() => navigate("/search")}>Start New Search</Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Plot ID</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Risk Level</TableHead>
                      <TableHead>Est. Price</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {searches.slice(0, 10).map(s => (
                      <TableRow key={s.id}>
                        <TableCell className="font-mono text-sm">{s.plotRef}</TableCell>
                        <TableCell>{s.location}</TableCell>
                        <TableCell><RiskBadge level={s.riskLevel} /></TableCell>
                        <TableCell className="font-body">UGX {s.estimatedPriceLow.toLocaleString()}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">{s.dateSearched}</TableCell>
                        <TableCell>
                          <Button variant="outline" size="sm" onClick={() => handleView(s.id)}>View Results</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default BuyerDashboard;
