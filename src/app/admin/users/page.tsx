import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { UserManager } from "./user-manager";
export default function AdminUsersPage() { return <div className="site-shell"><SiteHeader /><main id="main-content" className="wrap"><UserManager /></main><SiteFooter /></div>; }
