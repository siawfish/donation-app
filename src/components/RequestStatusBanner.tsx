import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { X, Check } from 'lucide-react'
import { toast } from 'sonner'
import { RequestStatus, RequestType } from '@/app/types'
import CustomAlert from './CustomAlert'
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
        title: "Cancel Request",
        description: "This will cancel the donation request. Are you sure?",
        action: "Cancel Request",
        status: RequestStatus.CANCELLED
      }
    }
    return {
      title: "Complete Request",
      description: "This will mark the donation as completed. This action cannot be undone. Are you sure?",
      action: "Complete Request",
      status: RequestStatus.COMPLETED
    }
  }

  return (
    <div className="sticky bg-white top-0 left-0 right-0 z-20 mb-4">
      <CustomAlert
        containerClassName="p-2"
        description={
          <div className="flex items-center justify-between">
            <span>Would you like to mark this request as completed or cancelled?</span>
            <div className="flex gap-2">
              <Button 
                variant="destructive" 
                size="sm"
                className="bg-destructive/10 text-destructive hover:bg-destructive/20"
                disabled={isUpdating}
                onClick={() => setDialogType(RequestStatus.CANCELLED)}
              >
                <X className="h-4 w-4" />
              </Button>
              <Button 
                size="sm"
                className="bg-primary-foreground text-primary"
                disabled={isUpdating}
                onClick={() => setDialogType(RequestStatus.COMPLETED)}
              >
                <Check className="h-4 w-4" />
              </Button>
            </div>
          </div>
        }
        variant="warning"
      />

      {dialogType && (
        <ConfirmDialog
          open={!!dialogType}
          onOpenChange={() => setDialogType(null)}
          title={getDialogContent(dialogType).title}
          onConfirm={() => handleStatusChange(getDialogContent(dialogType).status)}
        >
          {getDialogContent(dialogType).description}
        </ConfirmDialog>
      )}
    </div>
  )
} 