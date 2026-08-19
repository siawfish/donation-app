"use client";

import Link from "next/link";
import React, { useState, useRef, useEffect } from "react";
import { getMyAdminRole } from "@/app/app/actions/admin";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Search,
  PackagePlus,
  Menu,
  HomeIcon,
  SettingsIcon,
  LogOutIcon,
  Trophy,
  ShieldCheck,
  BookOpen,
  X,
} from "lucide-react";
import Logo from "../Logo";
import { useAuth } from "@/firebase/auth/AuthContext";
import { getInitials } from "@/lib/utils";
import { signOut } from "firebase/auth";
import { getFirebaseAuth } from "@/firebase/auth/firebase";
import { useRouter, usePathname } from "next/navigation";
import { toast } from "sonner";
import NotificationsButton from "../NotificationsButton";

export default function Navbar() {
  const [searchValue, setSearchValue] = useState("");
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // Only used to decide whether to show the Admin link. Every admin route and
  // action re-checks server-side, so this is presentation, not protection.
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
    if (!user) return setIsAdmin(false);
    let active = true;
    getMyAdminRole()
      .then((role) => { if (active) setIsAdmin(!!role) })
      .catch(() => {/* not an admin */});
    return () => { active = false };
  }, [user]);

  const profileLinks = [
    { id: "dashboard", href: "/app", label: "Dashboard", icon: <HomeIcon className="h-4 w-4" /> },
    { id: "rewards", href: "/app/rewards", label: "Your rewards", icon: <Trophy className="h-4 w-4" /> },
    ...(isAdmin ? [{ id: "admin", href: "/app/admin", label: "Admin", icon: <ShieldCheck className="h-4 w-4" /> }] : []),
    { id: "journal", href: "/blog", label: "Journal", icon: <BookOpen className="h-4 w-4" /> },
    { id: "settings", href: "/app/settings", label: "Settings", icon: <SettingsIcon className="h-4 w-4" /> },
    { id: "signout", href: "#", label: "Sign out", icon: <LogOutIcon className="h-4 w-4" /> },
  ];

  const handleSearch = (e?: React.FormEvent) => {
    e?.preventDefault();
    const q = searchValue.trim();
    if (q) router.push(`/explore?q=${encodeURIComponent(q)}`);
    else router.push("/explore");
    setMobileSearchOpen(false);
  };

  const logout = async () => {
    try {
      await Promise.all([
        signOut(getFirebaseAuth()),
        fetch("/api/logout", { method: "GET" }),
      ]);
      router.refresh();
    } catch (error: any) {
      toast.error("Error logging out", { description: error.message });
    }
  };

  // pt-safe keeps the bar below the status bar and Dynamic Island; the tinted
  // background extends up behind them so the inset doesn't read as a gap.
  return (
    <header className="sticky top-0 z-50 w-full bg-canvas/90 backdrop-blur-md border-b border-gray-200/40 pt-safe px-safe">
      <div className="max-w-[1400px] mx-auto px-4 h-16 grid grid-cols-[auto_1fr_auto] items-center gap-3 md:gap-6">

        {/* ── Logo ── */}
        <div className="flex-shrink-0 flex items-center">
          <Logo />
        </div>

        {/* ── Search bar (desktop) — centered zone ── */}
        <div className="hidden md:flex justify-center">
          <form
            onSubmit={handleSearch}
            className="flex w-full max-w-xl items-center bg-white border border-gray-200/80 rounded-full overflow-hidden focus-within:border-forest focus-within:ring-2 focus-within:ring-forest/10 transition-all shadow-sm"
          >
            <Search className="w-4 h-4 text-gray-400 ml-4 flex-shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder="Search items…"
              className="flex-1 bg-transparent text-sm text-ink placeholder-gray-400 outline-none px-3 py-2.5 min-w-0"
            />
            {searchValue && (
              <button type="button" onClick={() => setSearchValue("")} className="mr-1 p-1 rounded-full hover:bg-gray-100 transition-colors">
                <X className="w-3.5 h-3.5 text-gray-400" />
              </button>
            )}
            <button type="submit" className="bg-forest hover:bg-forest-dark text-white text-xs font-semibold px-5 py-2.5 m-1 rounded-full transition-colors flex-shrink-0">
              Search
            </button>
          </form>
        </div>

        {/* Spacer keeps grid shape on mobile (search is icon-only there) */}
        <div className="md:hidden" />

        {/* ── Right actions ── */}
        <div className="flex items-center justify-end gap-1.5 md:gap-2">

          {/* Mobile: search icon */}
          <button
            className="md:hidden p-2 rounded-full hover:bg-sand transition-colors"
            onClick={() => { setMobileSearchOpen(true); setTimeout(() => inputRef.current?.focus(), 50); }}
          >
            <Search className="w-5 h-5 text-gray-600" />
          </button>

          {/* Public leaderboard */}
          <Link
            href="/leaderboard"
            title="Community leaderboard"
            className="hidden lg:inline-flex items-center gap-1.5 text-sm font-semibold text-gray-600 hover:text-forest px-3 py-2 rounded-full hover:bg-sand transition-colors"
          >
            <Trophy className="w-4 h-4" />
            Leaderboard
          </Link>

          {/* Journal */}
          <Link
            href="/blog"
            title="Stories from the Givny community"
            className="hidden lg:inline-flex items-center gap-1.5 text-sm font-semibold text-gray-600 hover:text-forest px-3 py-2 rounded-full hover:bg-sand transition-colors"
          >
            <BookOpen className="w-4 h-4" />
            Journal
          </Link>

          {/* ── List an item — THE main CTA ── */}
          {user ? (
            <Link href="/app/add-item">
              <button className="flex items-center gap-1.5 bg-lime hover:brightness-95 text-forest text-sm font-bold px-4 md:px-5 py-2.5 rounded-full transition-all">
                <PackagePlus className="w-4 h-4" />
                <span className="hidden sm:inline">List an item</span>
              </button>
            </Link>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-1.5 bg-lime hover:brightness-95 text-forest text-sm font-bold px-4 md:px-5 py-2.5 rounded-full transition-all">
                  <PackagePlus className="w-4 h-4" />
                  <span className="hidden sm:inline">List an item</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 rounded-2xl p-3">
                <p className="text-sm font-bold text-ink px-1 pb-1">Ready to give something away?</p>
                <p className="text-xs text-gray-500 px-1 pb-3">Sign in or create a free account to list your item.</p>
                <div className="flex flex-col gap-2">
                  <Link
                    href="/auth/login?redirect=/app/add-item"
                    className="w-full text-center text-sm font-semibold text-white bg-forest hover:bg-forest-dark px-4 py-2.5 rounded-full transition-colors"
                  >
                    Sign in
                  </Link>
                  <Link
                    href="/auth/register"
                    className="w-full text-center text-sm font-semibold text-forest border border-forest/30 hover:bg-sand px-4 py-2.5 rounded-full transition-colors"
                  >
                    Create a free account
                  </Link>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Notifications (logged-in only) */}
          {user && <NotificationsButton />}

          {/* Auth: logged-in avatar */}
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full h-9 w-9">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user?.photoURL!} />
                    <AvatarFallback className="text-xs">{getInitials(user?.displayName ?? "")}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <div className="px-3 py-2 border-b border-gray-100">
                  <p className="text-sm font-medium text-gray-900 truncate">{user?.displayName}</p>
                  <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                </div>
                {profileLinks.map((link) => (
                  <DropdownMenuItem
                    key={link.id}
                    onClick={() => link.id === "signout" && logout()}
                    className="cursor-pointer"
                  >
                    <Link href={link.href} className="flex items-center gap-2 w-full">
                      {link.icon}
                      <span>{link.label}</span>
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Mobile hamburger (logged-out only or extra nav) */}
          {!user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 rounded-2xl">
                <DropdownMenuItem asChild>
                  <Link href="/explore" className="cursor-pointer">Browse items</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/leaderboard" className="cursor-pointer">Leaderboard</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/blog" className="cursor-pointer">Journal</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/careers" className="cursor-pointer flex items-center justify-between gap-2">
                    <span>Careers</span>
                    <span className="text-[10px] font-bold text-forest bg-lime px-1.5 py-0.5 rounded-full">Hiring</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/auth/login" className="cursor-pointer font-semibold text-forest">Sign in / Join free</Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* ── Mobile search overlay ── */}
      {mobileSearchOpen && (
        <div className="md:hidden px-4 pb-3 pt-1 border-t border-gray-200/50 bg-canvas">
          <form onSubmit={handleSearch} className="flex items-center bg-white border border-gray-200/80 rounded-full overflow-hidden focus-within:border-forest">
            <Search className="w-4 h-4 text-gray-400 ml-3 flex-shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder="Search items…"
              className="flex-1 bg-transparent text-sm text-gray-800 placeholder-gray-400 outline-none px-3 py-2.5"
              autoFocus
            />
            <button type="button" onClick={() => setMobileSearchOpen(false)} className="mr-2 p-1 rounded-lg hover:bg-gray-200 transition-colors">
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </form>
        </div>
      )}
    </header>
  );
}
