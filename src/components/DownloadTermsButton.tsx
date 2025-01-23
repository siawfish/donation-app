"use client";

import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

export default function DownloadTermsButton() {
    const handleDownload = () => {
        window.open("/terms_of_use.pdf", "_blank");
    }
    return (
        <Button
            size="lg"
            className="flex items-center gap-2 text-white bg-primary border-primary hover:bg-primary/10"
            onClick={handleDownload}
        >
            <Download size={20} />
            Download Now
        </Button>
    )
}