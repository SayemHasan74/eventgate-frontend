import Link from "next/link";
import { ArrowRight, TicketX } from "lucide-react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export default function NotFound() { return <div className="site-shell"><SiteHeader /><main id="main-content" className="wrap not-found"><TicketX size={42} aria-hidden="true" /><p className="eyebrow"><span /> 404</p><h1>This ticket<br /><b>doesn’t exist.</b></h1><p>The page may have moved, or the link is no longer valid.</p><Link className="button button-primary" href="/events">Browse events <ArrowRight size={16} /></Link></main><SiteFooter /></div>; }
