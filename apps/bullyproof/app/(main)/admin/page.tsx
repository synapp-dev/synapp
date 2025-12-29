import { generateMetadataFromSegments } from "@/utils/metadata";
import { getEnabledAdminItems } from "@/lib/admin-items";
import { AdminCard } from "./components/admin-card";

export const metadata = generateMetadataFromSegments(["admin"]);

export default function AdminPage() {
  const adminItems = getEnabledAdminItems();

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {adminItems.map((item) => (
          <AdminCard
            key={item.title}
            title={item.title}
            url={item.url}
            iconName={item.iconName}
            description={item.description}
            disabled={item.disabled}
          />
        ))}
      </div>
    </div>
  );
}
