import { redirect } from "next/navigation";
import { BottomNav } from "@/components/BottomNav";
import { isManager, requireProfile } from "@/lib/session";

// Every screen depends on the signed-in user, so these routes render per request.
export const instant = false;

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const { profile, company } = await requireProfile();
  if (!profile.consent_at) redirect("/consent");

  return (
    <div className="mx-auto min-h-dvh max-w-md pb-28" style={{ ["--brand" as string]: company.brand_color }}>
      <header className="flex items-center justify-between px-5 pb-3 pt-5">
        <div className="flex items-center gap-2.5">
          {company.logo_url ? (
            <img src={company.logo_url} alt="" className="h-10 w-10 rounded-[10px] object-cover" />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-ink text-sm font-bold text-ground">
              {company.name.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div className="flex flex-col">
            <span className="text-xs text-muted">{company.name}</span>
            <span className="font-display text-lg font-bold">Hi, {profile.full_name || "there"}</span>
          </div>
        </div>
        <form action="/auth/signout" method="post">
          <button className="h-11 rounded-xl border border-line bg-white px-3 text-sm font-semibold">Sign out</button>
        </form>
      </header>
      <main className="flex flex-col gap-4 px-5">{children}</main>
      <BottomNav manager={isManager(profile.role)} />
    </div>
  );
}
