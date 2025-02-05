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
        <div className={cn("space-y-1 p-3 pb-5 bg-white rounded-md relative", containerClassName)}>
            {label && <Label htmlFor={props.id}>{label}</Label>}
            <Input {...props} className={cn(props.className, error ? "border-red-500" : "")} />
            <p className={cn("text-xs text-red-500", error ? "visible" : "invisible")}>{error}</p>
        </div>
    )
};