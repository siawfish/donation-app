"use client";

import Link from "next/link";
import React, { useState } from "react";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Menu, User, ChevronDown, ChevronUp, LogIn, LockIcon } from "lucide-react"
import Logo from "../Logo";
import { useAuth } from "@/firebase/auth/AuthContext";
import { getInitials } from "@/lib/utils";
import { signOut } from "firebase/auth";
import { getFirebaseAuth } from "@/firebase/auth/firebase";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import CustomButton from "../Button";

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const {user} = useAuth();
  const router = useRouter();

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  const toggleAccount = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent the event from bubbling up
    setIsAccountOpen(!isAccountOpen);
  };

  const navLinks = [
    { href: "/app/user/explore", label: "Explore" },
    { href: "/auth/register/donor", label: "List an Item" },
    { href: "#", label: "About" },
    { href: "#", label: "Contact" },
  ];

  const profileLinks = [
    { 
      id: 'profile',
      href: `/app/${user?.userType}/my-items`, 
      label: "Profile" 
    },
    { 
      id: 'settings',
      href: "#", 
      label: "Settings" 
    },
    { 
      id: 'signout',
      href: "#", 
      label: "Sign out" 
    },
  ];

  const logout = async () => {
    try {
      await Promise.all([
        signOut(getFirebaseAuth()),
        fetch('/api/logout', {
          method: 'GET',
        })
      ]);
      router.refresh();
    } catch (error: any) {
      console.error('Error logging out:', error);
      toast.error('Error logging out', { description: error.message });
    }
  }

  return (
    <header className="px-4 lg:px-6 h-14 flex items-center !bg-white">
      <div className="container mx-auto max-w-8xl flex items-center justify-between">
        <Logo />
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
          {
            user ? (
              <div className="hidden md:block">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="rounded-full">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user?.photoURL!} />
                        <AvatarFallback>{getInitials(user?.displayName ?? '')}</AvatarFallback>
                      </Avatar>
                      <span className="sr-only">Toggle user menu</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {profileLinks.map((link) => (
                      <DropdownMenuItem 
                        key={link.id}
                        onClick={() => {
                          if (link.id === 'signout') {
                            logout();
                          }
                        }}
                      >
                        <Link href={link.href} className="flex items-center gap-2 w-full" prefetch={false}>
                          <div className="h-4 w-4" />
                          <span>{link.label}</span>
                        </Link>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ) : (
              <Link href="/auth/login" className="text-sm font-medium hover:underline underline-offset-4">
                <CustomButton icon={<LockIcon className="h-4 w-4" />} className="border-primary rounded-full !text-primary min-w-[100px] pr-[40px]" variant="outline">Login</CustomButton>
              </Link>
            )
          }
        </nav>
      </div>
    </header>
  );
}
