"use client";
import { useState } from "react";
import Link from "next/link";
import { MenuIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/shell/logo";
import { ThemeToggle } from "@/components/shell/theme-toggle";

const LINKS = [
  { href: "/#product", label: "Product" },
  { href: "/#loop", label: "How it works" },
  { href: "/pricing", label: "Pricing" },
  { href: "/security", label: "Security" },
  { href: "/docs", label: "Docs" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  return (
    <header className="bg-background/80 sticky top-0 z-40 border-b backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4">
        <Link href="/" aria-label="ForgePilot home">
          <Logo />
        </Link>
        <nav aria-label="Site" className="hidden items-center gap-1 md:flex">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="text-muted-foreground hover:text-foreground rounded-md px-3 py-2 text-sm">
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          <Button variant="ghost" asChild className="hidden sm:inline-flex">
            <Link href="/login">Sign in</Link>
          </Button>
          <Button asChild>
            <Link href="/signup">Start free</Link>
          </Button>
          <Button variant="ghost" size="icon" className="md:hidden" aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
            {open ? <XIcon /> : <MenuIcon />}
          </Button>
        </div>
      </div>
      {open && (
        <nav aria-label="Site (mobile)" className="flex flex-col gap-1 border-t px-4 py-3 md:hidden">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className="hover:bg-accent rounded-md px-3 py-2 text-sm">
              {l.label}
            </Link>
          ))}
          <Link href="/login" className="hover:bg-accent rounded-md px-3 py-2 text-sm">
            Sign in
          </Link>
        </nav>
      )}
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-2 md:grid-cols-5">
        <div className="md:col-span-2">
          <Logo />
          <p className="text-muted-foreground mt-3 max-w-xs text-sm">The engineering operations layer for teams building with AI coding agents.</p>
          <p className="text-muted-foreground mt-4 text-xs">Demo build · all companies, people and data are fictional.</p>
        </div>
        {[
          ["Product", [["DevPilot", "/#devpilot"], ["ShipSafe", "/#shipsafe"], ["CodeKeeper", "/#codekeeper"], ["Pricing", "/pricing"]]],
          ["Trust", [["Security", "/security"], ["Permissions", "/security#permissions"], ["Data handling", "/security#data"]]],
          ["Developers", [["Docs", "/docs"], ["API contract", "/docs#api"], ["Component gallery", "/dev/components"]]],
        ].map(([title, links]) => (
          <div key={title as string}>
            <h3 className="text-sm font-semibold">{title as string}</h3>
            <ul className="mt-3 flex flex-col gap-2 text-sm">
              {(links as string[][]).map(([l, h]) => (
                <li key={h}>
                  <Link href={h} className="text-muted-foreground hover:text-foreground">
                    {l}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </footer>
  );
}
