import Link from "next/link";
import Logo from "./Logo";
import Image from "next/image";
import { FacebookIcon, InstagramIcon, TwitterIcon } from "lucide-react";

export default function Footer() {
    return (
        <footer className="w-full bg-primary text-white pt-16 pb-8 px-4 md:px-6">
            <div className="container mx-auto max-w-8xl grid grid-cols-1 md:grid-cols-4 gap-8">
                {/* Product Section */}
                <div className="space-y-2 max-w-lg">
                    <Image src="/logo_1.png" alt="Givny Logo" width={70.56} height={30.95} />
                    <p className="text-sm">Givny connects people to share pre-loved items, whether you’re giving or receiving. Join us in reducing waste, supporting sustainability, and uplifting communities.</p>
                </div>

                <div className="space-y-2 max-w-lg"></div>

                {/* Company Section */}
                <div className="space-y-4">
                    <h3 className="font-semibold">COMPANY</h3>
                    <nav className="flex flex-col space-y-3">
                        <Link href="/" className="text-sm font-normal hover:text-gray-300">Home</Link>
                        <Link href="/explore" className="text-sm font-normal hover:text-gray-300">Explore</Link>
                        <Link href="/about" className="text-sm font-normal hover:text-gray-300">About us</Link>
                        <Link href="/contact" className="text-sm font-normal hover:text-gray-300">Contact</Link>
                    </nav>
                </div>

                {/* Legal Section */}
                <div className="space-y-4">
                    <h3 className="font-semibold">LEGAL</h3>
                    <nav className="flex flex-col space-y-3">
                        <Link href="/terms-of-use" className="text-sm font-normal hover:text-gray-300">Terms</Link>
                        <Link href="/terms-of-use#privacy" className="text-sm font-normal hover:text-gray-300">Privacy</Link>
                        <Link href="/terms-of-use#cookies" className="text-sm font-normal hover:text-gray-300">Cookies</Link>
                    </nav>
                </div>
            </div>

            {/* Bottom Section */}
            <div className="container mx-auto mt-12 flex flex-col sm:flex-row items-center justify-between">
                <div className="flex items-center">
                    <Link href="/" className="flex items-center">
                        <span className="text-xl font-semibold">Givny</span>
                    </Link>
                    <span className="ml-4 text-sm">© {new Date().getFullYear()} Givny. All rights reserved.</span>
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