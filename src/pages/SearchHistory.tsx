import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSearch } from "@/contexts/SearchContext";
import AppTopBar from "@/components/AppTopBar";
import RiskBadge from "@/components/RiskBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, Download, Search, Loader2 } from "lucide-react";

const SearchHistory = () => {
  const { user } = useAuth();
  const { searches, setCurrentResult, fetchHistory, loading } = useSearch();
  const navigate = useNavigate();
  const [riskFilter, setRiskFilter] = useState<string>("All");

  useEffect(() => {
    if (!user) navigate("/login");
  }, [user, navigate]);

  useEffect(() => {
    if (user) fetchHistory();
  }, [user]);

  if (!user) return null;

  const filtered = searches.filter(s => {
    if (riskFilter !== "All" && s.riskLevel !== riskFilter) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-background">
      <AppTopBar />
      <main className="container py-8">
        <h1 className="text-2xl font-display font-bold mb-6">Search History</h1>

        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-3 mb-4">
              <Select value={riskFilter} onValueChange={setRiskFilter}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Risk Levels</SelectItem>
                  <SelectItem value="LOW">LOW</SelectItem>
                  <SelectItem value="MEDIUM">MEDIUM</SelectItem>
                  <SelectItem value="HIGH">HIGH</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {loading ? (
              <div className="py-12 text-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto" />
                <p className="text-sm text-muted-foreground mt-2">Loading search history...</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-12 text-center">
                <Search className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground font-body">No searches yet. Start your first PlotSure assessment.</p>
                <Button className="mt-4" onClick={() => navigate("/search")}>Start New Search</Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Plot Ref</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Risk Level</TableHead>
                      <TableHead>Est. Price Range</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map(s => (
                      <TableRow key={s.id}>
                        <TableCell className="text-sm text-muted-foreground">{s.dateSearched}</TableCell>
                        <TableCell className="font-mono text-sm">{s.plotRef}</TableCell>
                        <TableCell>{s.location}</TableCell>
                        <TableCell><RiskBadge level={s.riskLevel} /></TableCell>
                        <TableCell>UGX {s.estimatedPriceLow.toLocaleString()} – {s.estimatedPriceHigh.toLocaleString()}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => {
                              setCurrentResult(s);
                              navigate("/search?step=3");
                            }}>
                              <FileText className="mr-1 h-3 w-3" /> View
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => navigate(`/certificate/${s.id}`)}>
                              <Download className="mr-1 h-3 w-3" /> Cert
                            </Button>
                          </div>
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

export default SearchHistory;
