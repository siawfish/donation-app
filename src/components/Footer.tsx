import Link from "next/link";
import { FacebookIcon, InstagramIcon, TwitterIcon, ArrowUpRight } from "lucide-react";

type FooterLink = { label: string; href: string; badge?: string };

const links: Record<string, FooterLink[]> = {
  Explore: [
    { label: "Browse nearby", href: "/explore" },
    { label: "Near me", href: "/explore?radius=5" },
    { label: "Leaderboard", href: "/leaderboard" },
    { label: "How it works", href: "/#how-it-works" },
  ],
  Account: [
    { label: "Sign in", href: "/auth/login" },
    { label: "Join free", href: "/auth/register" },
    { label: "List an item", href: "/app/add-item" },
  ],
  Company: [
    { label: "Journal", href: "/blog" },
    { label: "About", href: "/about" },
    { label: "Team", href: "/team" },
    // Flagged rather than buried: a careers link only works if someone notices it.
    { label: "Careers", href: "/careers", badge: "We're hiring" },
  ],
  Legal: [
    { label: "Terms of Service", href: "/terms-of-use" },
    { label: "Privacy Policy", href: "/" },
    { label: "Contact", href: "/contact" },
  ],
};

export default function Footer() {
  return (
    <footer className="w-full px-3 sm:px-4 pb-4 bg-canvas">
      <div className="forest-panel max-w-[1400px] mx-auto rounded-[2rem] md:rounded-[2.5rem] overflow-hidden text-white">
        <div className="px-5 sm:px-10 md:px-16 pt-12 md:pt-20 pb-8 md:pb-10">

          {/* Big CTA row */}
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 pb-10 md:pb-16 border-b border-white/10">
            <h2 className="text-3xl sm:text-5xl md:text-6xl font-bold leading-[1.05] md:leading-[1.02] tracking-tight text-balance max-w-2xl">
              Got something you no longer need?{" "}
              <span className="text-lime">Give it a second life.</span>
            </h2>
            <Link
              href="/auth/register"
              className="group inline-flex items-center justify-center gap-3 bg-lime text-forest font-bold text-sm sm:text-base px-6 sm:px-8 py-3.5 sm:py-4 rounded-full hover:brightness-95 transition-all flex-shrink-0 w-full sm:w-fit"
            >
              Join Givny — it&apos;s free
              <ArrowUpRight className="w-5 h-5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </Link>
          </div>

          {/* Link columns */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-x-8 gap-y-10 py-12">
            <div className="col-span-2 md:col-span-1">
              <span className="text-2xl font-bold tracking-tight">Givny</span>
              <p className="mt-3 text-sm text-white/50 leading-relaxed max-w-xs">
                Where good things get a second life instead of going to waste.
              </p>
              <div className="flex items-center gap-2.5 mt-6">
                {[FacebookIcon, InstagramIcon, TwitterIcon].map((Icon, i) => (
                  <Link
                    key={i}
                    href="/"
                    className="flex items-center justify-center w-9 h-9 rounded-full border border-white/15 text-white/60 hover:bg-lime hover:text-forest hover:border-lime transition-all"
                  >
                    <Icon className="h-4 w-4" />
                  </Link>
                ))}
              </div>
            </div>

            {Object.entries(links).map(([section, items]) => (
              <div key={section}>
                <h4 className="text-xs font-bold text-lime/80 uppercase tracking-[0.2em] mb-4">{section}</h4>
                <ul className="space-y-2.5">
                  {items.map((item) => (
                    <li key={item.label}>
                      <Link
                        href={item.href}
                        className="text-sm text-white/60 hover:text-white transition-colors inline-flex items-center gap-2 flex-wrap"
                      >
                        {item.label}
                        {item.badge && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-lime/15 border border-lime/30 px-2 py-0.5 text-[10px] font-bold text-lime whitespace-nowrap">
                            <span className="w-1.5 h-1.5 rounded-full bg-lime animate-pulse" />
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Bottom row */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 border-t border-white/10 text-xs text-white/40">
            <span>© {new Date().getFullYear()} Givny. All rights reserved.</span>
            <div className="flex items-center gap-1.5">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-lime animate-pulse" />
              <span>100% free · community-driven</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
