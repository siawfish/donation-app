import Image from "next/image";

export default function Loading() {
    // You can add any UI inside Loading, including a Skeleton.
    return (
        <div className="flex justify-center items-center min-h-[50vh]">
            <div className="flex flex-col justify-center gap-4 items-center">
                <Image src="/loader.png" alt="loading" width={150} height={150} className="animate-spin" />
            </div>
        </div>
    )
  }