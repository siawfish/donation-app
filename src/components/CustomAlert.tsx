import { CircleCheckIcon, CircleAlertIcon, CircleXIcon } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "./ui/alert"

interface CustomAlertProps {
    title: string
    description: string
    variant: "success" | "warning" | "destructive"
}

const getIcon = (variant: "success" | "warning" | "destructive") => {
    if (variant === "success") return <CircleCheckIcon className="h-4 w-4" />
    if (variant === "warning") return <CircleAlertIcon className="h-4 w-4" />
    if (variant === "destructive") return <CircleXIcon className="h-4 w-4" />
}

export default function CustomAlert({ title, description, variant="warning" }: CustomAlertProps) {
    return (
        <Alert variant={variant}>
            {getIcon(variant)}
            <AlertTitle className={`text-left border-b-[0.5px] pb-2 ${variant === "success" ? "border-success" : variant === "warning" ? "border-warning" : "border-destructive"}`}>
                {title}
            </AlertTitle>
            <AlertDescription className="text-left font-cabinetLight">
                {description}
            </AlertDescription>
        </Alert>
    )
}