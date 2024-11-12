import { cn } from "@/lib/utils";
import { Button, ButtonProps } from "./ui/button"
import { Loader2 } from "lucide-react";

interface CustomButtonProps extends ButtonProps {
    icon?: React.ReactNode;
    iconPosition?: "left" | "right";
    className?: string;
    isLoading?: boolean;
}

export default function CustomButton({ children, icon, iconPosition = "right", className, isLoading, ...props }: CustomButtonProps) {
    return (
        <Button disabled={isLoading} className={`relative group ${className}`} {...props}>
            {isLoading && 
                <span className={cn("absolute flex justify-center items-center", iconPosition === "left" ? "right-4" : "left-4")}>
                    <Loader2 className="w-4 h-4 animate-spin" />
                </span>
            }
            {icon && <span className={cn("absolute group-hover:translate-x-1 transition-transform", iconPosition === "left" ? "left-4" : "right-4")}>{icon}</span>}
            <span className="group-hover:scale-105 transition-transform">{children}</span>
        </Button>
    )
}