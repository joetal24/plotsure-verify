import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { SearchProvider } from "@/contexts/SearchContext";
import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import LandSearch from "@/pages/LandSearch";
import Certificate from "@/pages/Certificate";
import SearchHistory from "@/pages/SearchHistory";
import NotFound from "@/pages/NotFound";
import LandListings from "@/pages/LandListings";
import SellerDashboard from "@/pages/SellerDashboard";
import AddListing from "@/pages/AddListing";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <SearchProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<Login />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/search" element={<LandSearch />} />
              <Route path="/certificate/:id" element={<Certificate />} />
              <Route path="/history" element={<SearchHistory />} />
              <Route path="/land" element={<LandListings />} />
              <Route path="/sell" element={<SellerDashboard />} />
              <Route path="/sell/add" element={<AddListing />} />
              <Route path="/sell/edit/:id" element={<AddListing />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </SearchProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
