import Link from "next/link";
import Logo from "./Logo";
import Image from "next/image";
import { FacebookIcon, InstagramIcon, TwitterIcon } from "lucide-react";

export default function Footer() {
    return (
        <footer className="w-full bg-primary-light text-primary py-4">

            {/* Bottom Section */}
            <div className="container max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/" className="flex items-center">
                        <span className="text-xl font-semibold">Givny</span>
                    </Link>
                    <span className="ml-4 text-sm">© {new Date().getFullYear()} Givny. All rights reserved.</span>

                    <Link href="/" className="text-sm font-normal">Terms of Service</Link>
                    <Link href="/" className="text-sm font-normal">Privacy Policy</Link>
                </div>

                {/* Socials */}
                <div className="flex items-center space-x-4">
                    <Link href="/" className="hover:text-gray-300">
                        <FacebookIcon className="h-5 w-5" />
                        <span className="sr-only">Facebook</span>
                    </Link>
                    <Link href="/" className="hover:text-gray-300">
                        <InstagramIcon className="h-5 w-5" />
                        <span className="sr-only">Instagram</span>
                    </Link>
                    <Link href="/" className="hover:text-gray-300">
                        <TwitterIcon className="h-5 w-5" />
                        <span className="sr-only">Twitter</span>
                    </Link>
                </div>
            </div>
        </footer>
    );
}