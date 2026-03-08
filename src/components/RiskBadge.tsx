import type { RiskLevel } from "@/contexts/SearchContext";

const styles: Record<RiskLevel, string> = {
  LOW: "bg-success/10 text-success border-success/20",
  MEDIUM: "bg-warning/10 text-warning border-warning/20",
  HIGH: "bg-destructive/10 text-destructive border-destructive/20",
};

const RiskBadge = ({ level }: { level: RiskLevel }) => (
  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${styles[level]}`}>
    {level}
  </span>
);

export default RiskBadge;
