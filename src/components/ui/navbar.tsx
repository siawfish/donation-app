"use client";

import Link from "next/link";
import React, { useState } from "react";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import Image from "next/image"
import { Menu, User, ChevronDown, ChevronUp } from "lucide-react"

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  const toggleAccount = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent the event from bubbling up
    setIsAccountOpen(!isAccountOpen);
  };

  const navLinks = [
    { href: "/app/requester/explore", label: "Explore" },
    { href: "/auth/register/samaritan", label: "List an Item" },
    { href: "#", label: "About" },
    { href: "#", label: "Contact" },
  ];

  const profileLinks = [
    { href: "/app/requester", label: "Profile" },
    { href: "#", label: "Settings" },
    { href: "/", label: "Sign out" },
  ];

  return (
    <header className="px-4 lg:px-6 h-14 flex items-center !bg-white">
      <div className="container mx-auto max-w-7xl flex items-center justify-between">
        <Link href="/" className="flex items-center justify-center" prefetch={false}>
          <Image src="/logo.png" alt="Givny" width={100} height={34.8} />
          <span className="sr-only">Givny</span>
        </Link>
        <nav className="ml-auto flex gap-4 sm:gap-6 items-center">
          {/* Desktop menu */}
          <div className="hidden md:flex gap-4 sm:gap-6 items-center">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href} className="text-sm font-medium hover:underline underline-offset-4" prefetch={false}>
                {link.label}
              </Link>
            ))}
          </div>
          
          {/* Mobile menu */}
          <div className="md:hidden">
            <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" onClick={toggleMenu}>
                  <Menu className="h-6 w-6" />
                  <span className="sr-only">Toggle menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-screen mt-2">
                {navLinks.map((link) => (
                  <DropdownMenuItem key={link.href}>
                    <Link href={link.href} className="w-full" prefetch={false}>
                      {link.label}
                    </Link>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem className="p-0" onSelect={(e) => e.preventDefault()}>
                  <button 
                    className="w-full p-2 hover:bg-accent hover:text-accent-foreground cursor-pointer flex items-center justify-between" 
                    onClick={toggleAccount}
                  >
                    <span className="flex items-center">
                      <User className="mr-2 h-4 w-4" />
                      <span>Account</span>
                    </span>
                    {isAccountOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                </DropdownMenuItem>
                {isAccountOpen && profileLinks.map((link) => (
                  <DropdownMenuItem key={link.href} className="pl-8">
                    <Link href={link.href} className="w-full" prefetch={false}>
                      {link.label}
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* User menu (visible only on desktop) */}
          <div className="hidden md:block">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src="/placeholder-user.jpg" />
                    <AvatarFallback>JD</AvatarFallback>
                  </Avatar>
                  <span className="sr-only">Toggle user menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {profileLinks.map((link) => (
                  <DropdownMenuItem key={link.href}>
                    <Link href={link.href} className="flex items-center gap-2 w-full" prefetch={false}>
                      <div className="h-4 w-4" />
                      <span>{link.label}</span>
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </nav>
      </div>
    </header>
  );
}
