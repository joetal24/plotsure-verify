import { Shield } from "lucide-react";

const PlotSureLogo = ({ size = "md" }: { size?: "sm" | "md" | "lg" }) => {
  const sizes = { sm: "text-lg", md: "text-xl", lg: "text-3xl" };
  const iconSizes = { sm: 18, md: 22, lg: 32 };
  return (
    <div className="flex items-center gap-2">
      <Shield className="text-primary" size={iconSizes[size]} strokeWidth={2.5} />
      <span className={`font-display font-bold text-primary ${sizes[size]}`}>
        Plot<span className="text-primary-mid">Sure</span>
      </span>
    </div>
  );
};

export default PlotSureLogo;
