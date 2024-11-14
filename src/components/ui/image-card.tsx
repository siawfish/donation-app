import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Image from "next/image"

interface ImageCardProps {
    image: string;
    title: string;
    description: string;
    containerClassName?: string;
    titleClassName?: string;
    descriptionClassName?: string;
}

export default function ImageCard({
    image,
    title,
    description,
    containerClassName,
    titleClassName,
    descriptionClassName,
}: ImageCardProps) {
    return (
        <Card className={`w-full max-w-md overflow-hidden border-none bg-secondary h-full shadow-none rounded-none ${containerClassName}`}>
            <div className="relative w-full h-48">
                <Image
                    src={image}
                    alt="Card image"
                    layout="fill"
                    objectFit="cover"
                />
            </div>
            <CardHeader className="px-0 py-2">
                <CardTitle className={`text-lg font-medium ${titleClassName}`}>{title}</CardTitle>
            </CardHeader>
            <CardContent className="px-0">
                <p className={`text-sm text-muted-foreground line-clamp-3 ${descriptionClassName}`}>
                    {description}
                </p>
            </CardContent>
        </Card>
    )
}