import { cn } from "@/lib/utils"
import { Input, InputProps } from "./ui/input"
import { Label } from "./ui/label"

interface CustomInputProps extends InputProps {
    label?: string
    containerClassName?: string
    error?: string
}

export default function CustomInput({ label, containerClassName, error, ...props }: CustomInputProps) {
    return (
        <div className={cn("space-y-1.5", containerClassName)}>
            {label && (
                <Label htmlFor={props.id} className="text-sm font-medium text-gray-700">
                    {label}
                </Label>
            )}
            <Input
                {...props}
                className={cn(
                    "h-10 rounded-xl border-gray-200 bg-gray-50 text-sm placeholder:text-gray-400 focus-visible:ring-primary/20 focus-visible:border-primary transition-colors",
                    error ? "border-red-400 focus-visible:ring-red-100" : "",
                    props.className
                )}
            />
            {error && <p className="text-xs text-red-500">{error}</p>}
        </div>
    )
}
