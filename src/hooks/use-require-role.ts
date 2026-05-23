import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export function useRequireRole(
  role: string,
  options?: { redirectTo?: string; message?: string },
) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate(options?.redirectTo || "/login");
      return;
    }
    if (user.role !== role && (!user.roles || !user.roles.includes(role as any))) {
      toast({
        title: "Access denied",
        description: options?.message || `This page requires the "${role}" role.`,
        variant: "destructive",
      });
      navigate(options?.redirectTo || "/dashboard");
    }
  }, [user, loading, role, navigate, toast, options?.redirectTo, options?.message]);

  return { authorized: !loading && !!user && (user.role === role || user.roles?.includes(role as any)), loading };
}
