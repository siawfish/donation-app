import { CircleCheckIcon, CircleAlertIcon, CircleXIcon, X } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "./ui/alert"

interface CustomAlertProps {
    title?: string
    description: string | React.ReactNode
    variant: "success" | "warning" | "destructive",
    onCancel?: () => void
    containerClassName?: string
}

const getIcon = (variant: "success" | "warning" | "destructive") => {
    if (variant === "success") return <CircleCheckIcon className="h-4 w-4" />
    if (variant === "warning") return <CircleAlertIcon className="h-4 w-4" />
    if (variant === "destructive") return <CircleXIcon className="h-4 w-4" />
}

export default function CustomAlert({ title, description, variant="warning", onCancel, containerClassName }: CustomAlertProps) {
    return (
        <Alert variant={variant} className={containerClassName}>
            {
                title && (
                    <>
                        {getIcon(variant)}
                        <AlertTitle className={`text-left border-b-[0.5px] pb-2 ${variant === "success" ? "border-success" : variant === "warning" ? "border-warning" : "border-destructive"}`}>
                            {title}

                            {
                                onCancel && (
                                    <button className="text-destructive absolute right-3 top-3 focus:outline-none" onClick={onCancel}>
                                        <X className="h-4 w-4" />
                                    </button>
                                )
                            }
                        </AlertTitle>
                    </>
                )
            }
            <AlertDescription className="text-left font-cabinetLight">
                {description}
            </AlertDescription>
        </Alert>
    )
}