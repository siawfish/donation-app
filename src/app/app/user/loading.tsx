import Logo from "@/components/Logo";
import Image from "next/image";

export default function Loading() {
    // You can add any UI inside Loading, including a Skeleton.
    return (
        <div className="flex justify-center items-center min-h-[50vh]">
            <div className="flex flex-col justify-center gap-4 items-center">
                <div className="animate-pulse transition-all duration-300">
                    <Logo />
                </div>
            </div>
        </div>
    )
  }