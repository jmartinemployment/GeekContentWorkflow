import { AppSidebar } from "@/components/app/AppSidebar";
import { requireAccessToken } from "@/lib/auth/session";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAccessToken();

  return (
    <div className="flex min-h-screen bg-gcw-bg text-gcw-ink">
      <AppSidebar />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
