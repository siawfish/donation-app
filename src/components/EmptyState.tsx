import { cn } from "@/lib/utils";
import Image from "next/image";

interface EmptyStateProps {
    title: string;
    description: string;
    imgWidth?: number;
    imgHeight?: number;
    containerClassName?: string;
}

export default function EmptyState({ title, description, imgWidth = 150, imgHeight = 150, containerClassName }: EmptyStateProps) {
    return (
        <div className={cn("flex justify-center items-center min-h-[50vh]", containerClassName)}>
            <div className="flex flex-col justify-center gap-4 items-center bg-white border border-gray-200/70 rounded-3xl px-10 py-12">
                <Image src="/empty.png" alt="empty state" width={imgWidth} height={imgHeight} />
                <div className="flex flex-col gap-1 items-center">
                    <h6 className="text-lg font-bold text-center font-cabinet text-ink mb-0">{title}</h6>
                    <p className="text-sm text-center font-cabinetLight text-gray-400 max-w-xs">{description}</p>
                </div>
            </div>
        </div>
    )
}