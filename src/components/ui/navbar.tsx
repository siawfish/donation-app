"use client";

import Link from "next/link";
import React, { useState, useRef } from "react";
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

  const profileLinks = [
    { id: "dashboard", href: "/app", label: "Dashboard", icon: <HomeIcon className="h-4 w-4" /> },
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

  const listHref = user ? "/app/add-item" : "/auth/register";

  return (
    <header className="sticky top-0 z-50 w-full bg-white border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center gap-3 md:gap-4">

        {/* ── Logo ── */}
        <div className="flex-shrink-0">
          <Logo />
        </div>

        {/* ── Search bar (desktop) ── */}
        <form
          onSubmit={handleSearch}
          className="hidden md:flex flex-1 max-w-xl items-center bg-gray-50 border border-gray-200 rounded-xl overflow-hidden focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/10 transition-all"
        >
          <Search className="w-4 h-4 text-gray-400 ml-3.5 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder="Search items…"
            className="flex-1 bg-transparent text-sm text-gray-800 placeholder-gray-400 outline-none px-3 py-2.5"
          />
          {searchValue && (
            <button type="button" onClick={() => setSearchValue("")} className="mr-1 p-1 rounded-lg hover:bg-gray-200 transition-colors">
              <X className="w-3.5 h-3.5 text-gray-400" />
            </button>
          )}
          <button type="submit" className="bg-primary hover:bg-primary/90 text-white text-xs font-semibold px-4 py-2.5 transition-colors flex-shrink-0">
            Search
          </button>
        </form>

        {/* ── Right actions ── */}
        <div className="ml-auto md:ml-0 flex items-center gap-2">

          {/* Mobile: search icon */}
          <button
            className="md:hidden p-2 rounded-xl hover:bg-gray-100 transition-colors"
            onClick={() => { setMobileSearchOpen(true); setTimeout(() => inputRef.current?.focus(), 50); }}
          >
            <Search className="w-5 h-5 text-gray-600" />
          </button>

          {/* List an item — always visible */}
          <Link href={listHref}>
            <button className="flex items-center gap-1.5 bg-primary hover:bg-primary/90 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors">
              <PackagePlus className="w-4 h-4" />
              <span className="hidden sm:inline">List an item</span>
            </button>
          </Link>

          {/* Notifications (logged-in only) */}
          {user && <NotificationsButton />}

          {/* Auth: logged-out */}
          {!user && (
            <>
              <Link
                href="/auth/login"
                className="hidden md:inline-flex items-center text-sm font-medium text-gray-600 hover:text-gray-900 px-3 py-2 rounded-xl hover:bg-gray-100 transition-colors"
              >
                Sign in
              </Link>
              <Link
                href="/auth/register"
                className="hidden md:inline-flex items-center text-sm font-semibold text-primary border border-primary px-4 py-2 rounded-xl hover:bg-primary-light transition-colors"
              >
                Join free
              </Link>
            </>
          )}

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
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem asChild>
                  <Link href="/explore" className="cursor-pointer">Browse items</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/auth/login" className="cursor-pointer">Sign in</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/auth/register" className="cursor-pointer font-semibold text-primary">Join free</Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* ── Mobile search overlay ── */}
      {mobileSearchOpen && (
        <div className="md:hidden px-4 pb-3 pt-1 border-t border-gray-100 bg-white">
          <form onSubmit={handleSearch} className="flex items-center bg-gray-50 border border-gray-200 rounded-xl overflow-hidden focus-within:border-primary">
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
