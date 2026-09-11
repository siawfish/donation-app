"use client"

import { Ban, Flag, MoreVertical, Trash2 } from "lucide-react"
import { Button } from "./ui/button"
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "./ui/dropdown-menu"

const ROW = "gap-3 px-4 py-3.5 rounded-none text-[15px] text-ink cursor-pointer focus:bg-gray-50"

/**
 * The "..." on a conversation — report it, clear it from your own inbox, or
 * stop hearing from whoever's on the other end. No "Help" row: unlike the
 * reference this was modelled on, there's nothing behind it here yet.
 */
export function ConversationMenu({
    onReport,
    onDelete,
    onBlock,
    blocked,
    triggerClassName,
}: {
    onReport: () => void
    onDelete: () => void
    onBlock: () => void
    blocked?: boolean
    triggerClassName?: string
}) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Conversation options"
                    className={triggerClassName}
                >
                    <MoreVertical className="h-5 w-5" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64 p-0 rounded-2xl overflow-hidden">
                <DropdownMenuItem onClick={onReport} className={ROW}>
                    <Flag className="h-5 w-5 text-red-500" />
                    Report
                </DropdownMenuItem>
                <DropdownMenuSeparator className="mx-0 my-0 bg-gray-100" />
                <DropdownMenuItem onClick={onDelete} className={ROW}>
                    <Trash2 className="h-5 w-5 text-red-500" />
                    Delete conversation
                </DropdownMenuItem>
                <DropdownMenuSeparator className="mx-0 my-0 bg-gray-100" />
                <DropdownMenuItem onClick={onBlock} className={ROW}>
                    <Ban className="h-5 w-5 text-red-500" />
                    {blocked ? "Unblock" : "Block"}
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
