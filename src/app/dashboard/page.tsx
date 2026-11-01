import { redirect } from "next/navigation";
import { getSession, isAdminUsername } from "@/lib/auth";
import { DashboardClient } from "./dashboard-client";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  return (
    <DashboardClient
      fullName={session.fullName ?? session.username}
      isAdmin={isAdminUsername(session.username)}
    />
  );
}
