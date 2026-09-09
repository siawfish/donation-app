"use client"

import Link from "next/link"
import { ShieldCheck, Check } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface SafetyDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  intro: string
  tips: string[]
  ctaLabel?: string
  onAcknowledge?: () => void
}

/**
 * A one-time reminder, not a wall between the person and what they came to
 * do — this is why it's a single "Got it" rather than the usual
 * confirm/cancel pair. Used both right after a listing goes live and the
 * first time someone opens a listing, so the copy differs but the shape
 * doesn't: a short intro, a few concrete tips, a link to the full page.
 */
export function SafetyDialog({
  open,
  onOpenChange,
  title,
  intro,
  tips,
  ctaLabel = "Got it",
  onAcknowledge,
}: SafetyDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-forest" />
            <AlertDialogTitle>{title}</AlertDialogTitle>
          </div>
          <AlertDialogDescription>{intro}</AlertDialogDescription>
        </AlertDialogHeader>

        <ul className="flex flex-col gap-2.5">
          {tips.map((tip) => (
            <li key={tip} className="flex items-start gap-2.5 text-sm text-ink">
              <Check className="w-4 h-4 text-forest flex-shrink-0 mt-0.5" />
              <span className="leading-relaxed">{tip}</span>
            </li>
          ))}
        </ul>

        <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 pt-1">
          <Link
            href="/safety"
            className="text-xs font-semibold text-gray-500 hover:text-forest underline underline-offset-2 text-center sm:text-left"
          >
            Read our full safety guide
          </Link>
          <AlertDialogAction onClick={onAcknowledge} className="w-full sm:w-auto">
            {ctaLabel}
          </AlertDialogAction>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  )
}
