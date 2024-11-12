import { cn } from "@/lib/utils"
import { Label } from "./ui/label"
import { Textarea, TextareaProps } from "./ui/textarea"

interface CustomTextareaProps extends TextareaProps {
    label?: string
    containerClassName?: string
    error?: string
}

export default function CustomTextarea({ label, containerClassName, error, ...props }: CustomTextareaProps) {
    return (
        <div className={cn("space-y-1 p-3 bg-white rounded-md", containerClassName)}>
            {label && <Label htmlFor={props.id}>{label}</Label>}
            <Textarea {...props} className={cn(props.className, error ? "border-red-500" : "")} />
            <p className={cn("text-xs text-red-500", error ? "visible" : "invisible")}>{error}</p>
        </div>
    )
};