import type { UserRole } from "@/contexts/AuthContext";

const roleStyles: Record<UserRole, string> = {
  "Land Buyer": "bg-primary/10 text-primary border-primary/20",
  "Land Agent": "bg-warning/10 text-warning border-warning/20",
  "Bank Loan Officer": "bg-success/10 text-success border-success/20",
};

const RoleBadge = ({ role }: { role: UserRole }) => (
  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${roleStyles[role]}`}>
    {role}
  </span>
);

export default RoleBadge;
