import type { UserRole } from "@/contexts/AuthContext";

const roleLabels: Record<UserRole, string> = {
  "land_buyer": "Land Buyer",
  "land_seller": "Land Seller",
};

const roleStyles: Record<UserRole, string> = {
  "land_buyer": "bg-primary/10 text-primary border-primary/20",
  "land_seller": "bg-green-100 text-green-700 border-green-200",
};

const RoleBadge = ({ role }: { role: UserRole }) => (
  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${roleStyles[role] || roleStyles["land_buyer"]}`}>
    {roleLabels[role] || role}
  </span>
);

export default RoleBadge;
