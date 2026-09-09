"use client"

import { useState, useCallback } from "react"
import Cropper, { type Area, type Point } from "react-easy-crop"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import CustomButton from "./Button"
import { ZoomIn } from "lucide-react"
import { toast } from "sonner"
import { getCroppedImageBlob } from "@/lib/cropImage"

interface ImageCropDialogProps {
  /** Object/data URL of the picture the user just picked — closing clears it. */
  imageSrc: string | null
  onClose: () => void
  onCropped: (blob: Blob) => void
}

/**
 * A round, fixed-aspect crop — this only ever feeds an avatar, so there's no
 * reason to expose aspect ratio or shape choices nobody asked for.
 */
export default function ImageCropDialog({ imageSrc, onClose, onCropped }: ImageCropDialogProps) {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const [saving, setSaving] = useState(false)

  const onCropComplete = useCallback((_area: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels)
  }, [])

  const reset = () => {
    setCrop({ x: 0, y: 0 })
    setZoom(1)
    setCroppedAreaPixels(null)
    setSaving(false)
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const handleSave = async () => {
    if (!imageSrc || !croppedAreaPixels) return
    setSaving(true)
    try {
      const blob = await getCroppedImageBlob(imageSrc, croppedAreaPixels)
      onCropped(blob)
      reset()
    } catch (error) {
      toast.error("Couldn't crop that image — try again")
      console.error("Crop error:", error)
      setSaving(false)
    }
  }

  return (
    <Sheet open={!!imageSrc} onOpenChange={(open) => !open && handleClose()}>
      <SheetContent
        side="bottom"
        className="mx-auto max-w-lg rounded-t-3xl px-5 pb-[calc(1.5rem+var(--safe-bottom))] max-h-[92vh] overflow-y-auto"
      >
        <SheetTitle>Crop your photo</SheetTitle>

        {imageSrc && (
          <>
            <div className="relative w-full h-[320px] bg-black rounded-2xl overflow-hidden mt-4">
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            </div>

            <div className="flex items-center gap-3 mt-4">
              <ZoomIn className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <input
                type="range"
                min={1}
                max={3}
                step={0.05}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="w-full accent-forest"
                aria-label="Zoom"
              />
            </div>

            <div className="flex justify-end gap-2 mt-5">
              <CustomButton
                type="button"
                variant="outline"
                className="border-forest !text-forest rounded-full hover:bg-transparent"
                onClick={handleClose}
                disabled={saving}
              >
                Cancel
              </CustomButton>
              <CustomButton
                type="button"
                className="rounded-full !bg-forest hover:!bg-forest-dark"
                onClick={handleSave}
                isLoading={saving}
                disabled={saving || !croppedAreaPixels}
              >
                {saving ? "Cropping…" : "Use photo"}
              </CustomButton>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
