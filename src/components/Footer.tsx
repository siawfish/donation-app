import Link from "next/link";
import Logo from "./Logo";
import Image from "next/image";
import { FacebookIcon, InstagramIcon, TwitterIcon } from "lucide-react";

export default function Footer() {
    return (
        <footer className="w-full bg-primary-light text-primary py-6 px-4">
            <div className="container max-w-7xl mx-auto">
                {/* Main Content */}
                <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
                    {/* Logo and Copyright */}
                    <div className="flex flex-col space-y-2 md:space-y-0">
                        <Link href="/" className="flex items-center">
                            <span className="text-xl font-semibold">Givny</span>
                        </Link>
                        <span className="text-sm text-primary/80">
                            © {new Date().getFullYear()} Givny. All rights reserved.
                        </span>
                    </div>

                    {/* Links */}
                    <div className="flex flex-col space-y-2 md:flex-row md:space-y-0 md:space-x-6">
                        <Link href="/terms-of-use" className="text-sm font-normal hover:text-primary/80 transition-colors">
                            Terms of Service
                        </Link>
                        <Link href="/" className="text-sm font-normal hover:text-primary/80 transition-colors">
                            Privacy Policy
                        </Link>
                    </div>

                    {/* Social Media */}
                    <div className="flex items-center space-x-4 pt-2 md:pt-0">
                        <Link href="/" className="hover:text-primary/80 transition-colors p-1">
                            <FacebookIcon className="h-5 w-5" />
                            <span className="sr-only">Facebook</span>
                        </Link>
                        <Link href="/" className="hover:text-primary/80 transition-colors p-1">
                            <InstagramIcon className="h-5 w-5" />
                            <span className="sr-only">Instagram</span>
                        </Link>
                        <Link href="/" className="hover:text-primary/80 transition-colors p-1">
                            <TwitterIcon className="h-5 w-5" />
                            <span className="sr-only">Twitter</span>
                        </Link>
                    </div>
                </div>
            </div>
        </footer>
    );
}