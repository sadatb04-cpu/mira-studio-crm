import { navigationItems } from "@/config/navigation";

export default function Home() {
  const dashboard = navigationItems.find((item) => item.id === "dashboard");

  return (
    <div className="flex flex-1 flex-col gap-2 p-6">
      <h2 className="text-lg font-semibold text-foreground">{dashboard?.label ?? "Dashboard"}</h2>
      <p className="max-w-xl text-sm text-muted-foreground">{dashboard?.description}</p>
    </div>
  );
}
