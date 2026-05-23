import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import AppTopBar from "@/components/AppTopBar";
import SellerDashboard from "./SellerDashboard";
import BuyerDashboard from "./BuyerDashboard";
import { Loader2 } from "lucide-react";

const Dashboard = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!user) navigate("/login");
    else document.title = "Dashboard ◇ PS";
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) return null;

  if (user.role === "land_seller") {
    return <SellerDashboard />;
  }

  return <BuyerDashboard />;
};

export default Dashboard;