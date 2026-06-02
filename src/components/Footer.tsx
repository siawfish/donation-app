import Link from "next/link";
import { FacebookIcon, InstagramIcon, TwitterIcon } from "lucide-react";

const links = {
  Explore: [
    { label: "Browse donations", href: "/explore" },
    { label: "Popular items", href: "/explore?sort=popular" },
    { label: "Near me", href: "/explore?radius=5" },
  ],
  Account: [
    { label: "Sign in", href: "/auth/login" },
    { label: "Join free", href: "/auth/register" },
    { label: "List an item", href: "/app/items/new" },
  ],
  Company: [
    { label: "How it works", href: "/#how-it-works" },
    { label: "Terms of Service", href: "/terms-of-use" },
    { label: "Privacy Policy", href: "/" },
  ],
};

export default function Footer() {
  return (
    <footer className="w-full bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-14">
        {/* Top row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-12">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <span className="text-2xl font-bold text-white tracking-tight">Givny</span>
            <p className="mt-3 text-sm text-gray-400 leading-relaxed max-w-xs">
              A free community marketplace where neighbours give and receive pre-loved items.
            </p>
            <div className="flex items-center gap-3 mt-5">
              <Link href="/" className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-gray-400 hover:text-white">
                <FacebookIcon className="h-4 w-4" />
              </Link>
              <Link href="/" className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-gray-400 hover:text-white">
                <InstagramIcon className="h-4 w-4" />
              </Link>
              <Link href="/" className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-gray-400 hover:text-white">
                <TwitterIcon className="h-4 w-4" />
              </Link>
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(links).map(([section, items]) => (
            <div key={section}>
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">{section}</h4>
              <ul className="space-y-2.5">
                {items.map((item) => (
                  <li key={item.label}>
                    <Link
                      href={item.href}
                      className="text-sm text-gray-400 hover:text-white transition-colors"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Divider */}
        <div className="h-px bg-white/5 mb-6" />

        {/* Bottom row */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-500">
          <span>© {new Date().getFullYear()} Givny. All rights reserved.</span>
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            <span>100% free · community-driven</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
