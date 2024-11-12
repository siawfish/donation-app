'use client'

import { Sheet } from "@/components/ui/sheet"
import { useQueryState } from 'nuqs'
import ItemContent from "./ItemContent"

export function ItemDetails() {
    const [id, setId] = useQueryState('id')
    const onOpenChange = (open: boolean) => {
        if (!open) {
            setId(null)
        }
    }
    return (
        <Sheet open={!!id} onOpenChange={onOpenChange}>
            <ItemContent />
        </Sheet>
    )
}
