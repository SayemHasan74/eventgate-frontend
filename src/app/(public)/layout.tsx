import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="site-shell">
      <SiteHeader />
      {children}
      <SiteFooter />
    </div>
  );
}
