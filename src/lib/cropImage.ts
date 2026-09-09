import type { Area } from "react-easy-crop"

function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.addEventListener("load", () => resolve(image))
    image.addEventListener("error", (error) => reject(error))
    // Object/data URLs are same-origin already; Storage downloads (re-cropping
    // an existing avatar) need this or the canvas below comes back tainted.
    image.crossOrigin = "anonymous"
    image.src = url
  })
}

/**
 * Renders the selected crop area of `imageSrc` onto a canvas sized to match
 * and returns it as a Blob — the shape `uploadBytesResumable` already expects.
 */
export async function getCroppedImageBlob(
  imageSrc: string,
  cropPixels: Area,
  mimeType = "image/jpeg"
): Promise<Blob> {
  const image = await createImage(imageSrc)
  const canvas = document.createElement("canvas")
  canvas.width = cropPixels.width
  canvas.height = cropPixels.height
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("Could not get canvas context")

  ctx.drawImage(
    image,
    cropPixels.x,
    cropPixels.y,
    cropPixels.width,
    cropPixels.height,
    0,
    0,
    cropPixels.width,
    cropPixels.height
  )

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Canvas is empty"))),
      mimeType,
      0.92
    )
  })
}
