import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import PlotSureLogo from "./PlotSureLogo";
import RoleBadge from "./RoleBadge";
import { Button } from "@/components/ui/button";
import { LogOut, Search, History, Home, Package, Plus } from "lucide-react";

const AppTopBar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const isSeller = user?.role === "land_seller";

  return (
    <header className="sticky top-0 z-50 border-b bg-card">
      <div className="container flex h-16 items-center justify-between">
        <div className="cursor-pointer" onClick={() => navigate("/dashboard")}>
          <PlotSureLogo />
        </div>
        <div className="flex items-center gap-3">
          {isSeller ? (
            <>
              <Button variant="outline" size="sm" onClick={() => navigate("/sell")}>
                <Package className="mr-1.5 h-4 w-4" /> My Listings
              </Button>
              <Button size="sm" onClick={() => navigate("/sell/add")}>
                <Plus className="mr-1.5 h-4 w-4" /> Add Listing
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" size="sm" onClick={() => navigate("/browse")}>
                <Home className="mr-1.5 h-4 w-4" /> Browse Land
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigate("/history")}>
                <History className="mr-1.5 h-4 w-4" /> History
              </Button>
              <Button size="sm" onClick={() => navigate("/search")}>
                <Search className="mr-1.5 h-4 w-4" /> New Search
              </Button>
            </>
          )}
          {user && (
            <div className="hidden sm:flex items-center gap-2 ml-2">
              <span className="text-sm font-medium">{user.name}</span>
              <RoleBadge role={user.role} />
            </div>
          )}
          <Button variant="ghost" size="icon" onClick={handleLogout} title="Logout">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
};

export default AppTopBar;
