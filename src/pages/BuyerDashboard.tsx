import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSearch } from "@/contexts/SearchContext";
import { supabase } from "@/lib/supabase";
import { fetchMarketInsights, type MarketInsightsResponse } from "@/lib/api";
import AppTopBar from "@/components/AppTopBar";
import RiskBadge from "@/components/RiskBadge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, AlertTriangle, Bookmark, Loader2, RefreshCw, TrendingUp, MapPin, Shield, BarChart3 } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";

const BuyerDashboard = () => {
  const { user } = useAuth();
  const { searches, setCurrentResult, fetchHistory, loading, error } = useSearch();
  const navigate = useNavigate();
  const [savedCount, setSavedCount] = useState<number | null>(null);

  const [insights, setInsights] = useState<MarketInsightsResponse | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(true);

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

  useEffect(() => {
    if (!user) return;
    fetchMarketInsights()
      .then(setInsights)
      .catch(() => {})
      .finally(() => setInsightsLoading(false));
  }, [user]);

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

  const maxDistrictCount = insights
    ? Math.max(...insights.top_districts.map(d => d.search_count), 1)
    : 1;

  const rd = insights?.risk_distribution;
  const totalV = rd?.total_verified ?? 0;
  const lowPct = totalV > 0 ? Math.round(((rd?.LOW ?? 0) / totalV) * 100) : 0;

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

        {/* Uganda Land Market Insights */}
        <div className="mt-10">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-display font-bold">Uganda Land Market Insights</h2>
              <p className="text-sm text-muted-foreground">Based on PlotSure verification data</p>
            </div>
            {insights && (
              <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full whitespace-nowrap">
                {insights.total_searches.toLocaleString()} verifications and counting
              </span>
            )}
          </div>

          {insightsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-6 space-y-4">
                    <div className="h-4 bg-muted animate-pulse rounded w-1/2" />
                    <div className="h-3 bg-muted animate-pulse rounded w-3/4" />
                    <div className="h-12 bg-muted animate-pulse rounded" />
                    <div className="h-3 bg-muted animate-pulse rounded w-1/3" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : insights ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Card A — Most Active Districts */}
              <Card>
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <h3 className="font-display font-semibold text-sm">Most Active Districts</h3>
                  </div>
                  {insights.top_districts.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No district data yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {insights.top_districts.map((d, i) => (
                        <div key={d.district}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className={i === 0 ? "font-semibold text-foreground" : "text-muted-foreground"}>
                              {d.district}
                            </span>
                            <span className="text-muted-foreground">{d.search_count.toLocaleString()}</span>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${i === 0 ? "bg-[#1e293b]" : "bg-muted-foreground/30"}`}
                              style={{ width: `${(d.search_count / maxDistrictCount) * 100}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Card B — Risk Level Breakdown */}
              {totalV > 0 && (
                <Card>
                  <CardContent className="p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <Shield className="h-4 w-4 text-muted-foreground" />
                      <h3 className="font-display font-semibold text-sm">Risk Level Breakdown</h3>
                    </div>
                    <div className="grid grid-cols-3 gap-3 mb-3">
                      {[
                        { label: "LOW", value: rd?.LOW ?? 0, color: "text-emerald-600", bg: "bg-emerald-50" },
                        { label: "MEDIUM", value: rd?.MEDIUM ?? 0, color: "text-amber-600", bg: "bg-amber-50" },
                        { label: "HIGH", value: rd?.HIGH ?? 0, color: "text-red-600", bg: "bg-red-50" },
                      ].map(s => (
                        <div key={s.label} className={`rounded-lg p-3 text-center ${s.bg}`}>
                          <p className={`text-lg font-bold ${s.color}`}>{s.value.toLocaleString()}</p>
                          <p className={`text-[11px] font-medium ${s.color}`}>{s.label}</p>
                          <p className="text-[10px] text-muted-foreground">{totalV > 0 ? Math.round((s.value / totalV) * 100) : 0}%</p>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {lowPct}% of verified plots in Uganda show low fraud risk
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Card C — Verification Trend */}
              <Card>
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                    <h3 className="font-display font-semibold text-sm">Verification Trend</h3>
                  </div>
                  {insights.monthly_volume.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No data for the last 6 months.</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={160}>
                      <LineChart data={insights.monthly_volume}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={30} />
                        <Line type="monotone" dataKey="count" stroke="#1e293b" strokeWidth={2} dot={{ r: 3, fill: "#1e293b" }} />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : null}
        </div>
      </main>
    </div>
  );
};

export default BuyerDashboard;
