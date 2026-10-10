"use client";

import { ArrowRight, Menu, UserRound, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/components/auth-provider";

const navigation = [
  { href: "/events", label: "Browse events" },
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#organizers", label: "For organizers" },
];

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { isReady, session } = useAuth();
  const closeMenu = () => setMenuOpen(false);
  const accountLink = isReady && session ? { href: "/account", label: "My account" } : { href: "/auth/sign-in", label: "Sign in" };

  return (
    <>
      <a className="skip-link" href="#main-content">Skip to content</a>
      <header className="site-header">
        <Link className="brand" href="/" aria-label="EventGate home" onClick={closeMenu}>
          <i aria-hidden="true" />
          <span>EventGate</span>
        </Link>

        <nav className="site-nav" aria-label="Main navigation">
          {navigation.map((item) => <Link key={item.href} href={item.href}>{item.label}</Link>)}
          <Link href={accountLink.href}>{accountLink.label}</Link>
          <Link className="nav-pill" href="/events">Get tickets <ArrowRight size={15} /></Link>
        </nav>

        <div className="header-actions">
          <ThemeToggle />
          <button
            className="mobile-menu-button"
            type="button"
            aria-expanded={menuOpen}
            aria-controls="mobile-navigation"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            onClick={() => setMenuOpen((isOpen) => !isOpen)}
          >
            {menuOpen ? <X size={21} /> : <Menu size={22} />}
          </button>
        </div>

        <nav className="mobile-nav" id="mobile-navigation" aria-label="Mobile navigation" data-open={menuOpen}>
          {navigation.map((item) => <Link key={item.href} href={item.href} onClick={closeMenu}>{item.label}</Link>)}
          <Link href={accountLink.href} onClick={closeMenu}>{accountLink.label} <UserRound size={15} /></Link>
          <Link className="nav-pill" href="/events" onClick={closeMenu}>Get tickets <ArrowRight size={15} /></Link>
        </nav>
      </header>
    </>
  );
}
