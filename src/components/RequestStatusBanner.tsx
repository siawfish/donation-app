import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { X, Check, HandHeart } from 'lucide-react'
import { toast } from 'sonner'
import { RequestStatus, RequestType } from '@/app/types'
import { ConfirmDialog } from './ConfirmDialog'

interface RequestStatusBannerProps {
  request: RequestType
  onStatusChange: (status: RequestStatus) => Promise<void>
}

export function RequestStatusBanner({ onStatusChange }: RequestStatusBannerProps) {
  const [isUpdating, setIsUpdating] = useState(false)
  const [dialogType, setDialogType] = useState<RequestStatus.COMPLETED | RequestStatus.CANCELLED | null>(null)

  const handleStatusChange = async (status: RequestStatus) => {
    if (isUpdating) return
    setIsUpdating(true)
    try {
      await onStatusChange(status)
      toast.success(`Request marked as ${status.toLowerCase()}`)
      setDialogType(null)
    } catch (error) {
      toast.error('Failed to update request status')
    } finally {
      setIsUpdating(false)
    }
  }

  const getDialogContent = (type: RequestStatus.COMPLETED | RequestStatus.CANCELLED) => {
    if (type === RequestStatus.CANCELLED) {
      return {
        title: "Cancel this request?",
        description: "This calls off the handover — the item goes back to being available. This can't be undone.",
        action: "Cancel request",
        status: RequestStatus.CANCELLED
      }
    }
    return {
      title: "Mark as completed?",
      description: "This confirms the item has actually changed hands. This can't be undone.",
      action: "Mark completed",
      status: RequestStatus.COMPLETED
    }
  }

  return (
    <div className="sticky top-0 left-0 right-0 z-20 bg-white pb-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-primary-light/60 border border-primary-light rounded-2xl p-3.5">
        <div className="flex items-center gap-2.5">
          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-white text-forest flex-shrink-0">
            <HandHeart className="w-4 h-4" />
          </span>
          <p className="text-sm text-ink font-medium leading-snug">
            How did the handover go? Mark this request as done.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            variant="outline"
            size="sm"
            className="rounded-full border-red-200 !text-red-600 hover:bg-red-50 hover:border-red-300"
            disabled={isUpdating}
            onClick={() => setDialogType(RequestStatus.CANCELLED)}
          >
            <X className="h-3.5 w-3.5" />
            Cancel request
          </Button>
          <Button
            size="sm"
            className="rounded-full !bg-forest hover:!bg-forest-dark !text-white"
            disabled={isUpdating}
            onClick={() => setDialogType(RequestStatus.COMPLETED)}
          >
            <Check className="h-3.5 w-3.5" />
            Mark completed
          </Button>
        </div>
      </div>

      {dialogType && (
        <ConfirmDialog
          open={!!dialogType}
          onOpenChange={() => setDialogType(null)}
          title={getDialogContent(dialogType).title}
          submitLabel={getDialogContent(dialogType).action}
          onConfirm={() => handleStatusChange(getDialogContent(dialogType).status)}
        >
          {getDialogContent(dialogType).description}
        </ConfirmDialog>
      )}
    </div>
  )
}
