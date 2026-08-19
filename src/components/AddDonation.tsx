'use client'

import { SaveIcon, MapPin } from "lucide-react"
import CustomButton from "./Button"
import CustomInput from "./CustomInput"
import CustomTextarea from "./CustomTextarea"
import DragAndDrop, { UploadItem, isUploadedAsset } from "./ui/drag-n-drop"
import { Form, Formik } from "formik"
import * as yup from "yup"
import { AssetType, CategoryType, ItemType, ResponseData } from "@/app/types"
import { useEffect, useState, useTransition } from "react"
import { storage, firestore } from "@/firebase/auth/firebase"
import MultiSelectInput from "./MultiSelectInput"
import SelectInput from "./SelectInput"
import { Conditions } from "@/lib/utils"
import Link from "next/link"
import { useAuth } from "@/firebase/auth/AuthContext"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { getDownloadURL, ref, uploadBytesResumable } from "firebase/storage"
import { doc, getDoc } from "firebase/firestore"
import dynamic from "next/dynamic"

// SSR-safe map import
const LocationPicker = dynamic(() => import("./LocationPicker"), { ssr: false })

const INITIAL_VALUES: ItemType = {
  id: "",
  name: "",
  categories: [],
  condition: null,
  description: "",
  assets: [],
  views: 0,
  lat: undefined,
  lng: undefined,
  locationName: "",
}

interface AddDonationProps {
  addItem: (item: ItemType) => Promise<ResponseData<string | null>>
  editItem?: (item: ItemType, id: string) => Promise<ResponseData<ItemType | null>>
  categories: CategoryType[]
  defaultValues?: ItemType
}

const validationSchema = yup.object({
  name: yup.string().required("Item name is required"),
  categories: yup.array().of(
    yup.object().shape({
      id: yup.string().required(),
      name: yup.string().required()
    })
  ).min(1, "Select at least one category"),
  condition: yup.string().required("Condition is required"),
  description: yup.string().required("Description is required"),
  // `mixed` rather than `array().of()` on purpose: `.of()` reports errors as an
  // array (which rendered as the wrong message), and yup's array cast can clone
  // items — which would quietly turn File objects into plain ones again.
  assets: yup
    .mixed<unknown[]>()
    .test('has-photo', 'Add at least one photo', (value) => Array.isArray(value) && value.length > 0)
    .test(
      'usable-photos',
      'One of your photos didn’t attach properly. Remove it and add it again.',
      (value) => !Array.isArray(value) || value.every(isUsableAsset)
    ),
})

/** A pending upload (File) or something already in Storage (has a url). */
function isUsableAsset(value: unknown): boolean {
  if (typeof File !== 'undefined' && value instanceof File) return true
  return typeof value === 'object' && value !== null && 'url' in value
}

export default function AddDonation({ addItem, editItem, categories, defaultValues }: AddDonationProps) {
  const [initialValues, setInitialValues] = useState(INITIAL_VALUES)
  const router = useRouter()
  const { user } = useAuth()
  const [_, startTransition] = useTransition()

  // Pre-fill location from the user's profile
  useEffect(() => {
    if (defaultValues) {
      // Kept verbatim: these already carry the Storage path in `id`, and the
      // previous mapping replaced it with "image-1", losing the real reference.
      setInitialValues({ ...defaultValues, assets: defaultValues.assets ?? [] })
      return
    }

    // Fetch user's saved location to pre-populate the map
    if (user?.uid) {
      getDoc(doc(firestore, "users", user.uid)).then((snap) => {
        if (snap.exists()) {
          const data = snap.data()
          if (data?.lat && data?.lng) {
            setInitialValues((prev) => ({
              ...prev,
              lat: data.lat,
              lng: data.lng,
              locationName: data.preferedLocation ?? "",
            }))
          }
        }
      }).catch(() => {/* silently ignore */})
    }
  }, [defaultValues, user?.uid])

  const saveAssets = async (assets: UploadItem[]): Promise<AssetType[]> => {
    const storageRef = ref(storage, `donor/${user?.uid}`)

    // Order matters — assets[0] is the cover shown everywhere — and Promise.all
    // preserves it regardless of which upload finishes first.
    const promises = assets.map(async (asset, index) => {
      // Already in Storage (edit mode): keep it as-is.
      if (isUploadedAsset(asset)) return asset

      const file = asset
      if (!(file instanceof File) || file.size === 0) {
        throw new Error(`Photo ${index + 1} didn’t attach properly. Remove it and add it again.`)
      }

      // Storage object names choke on spaces and non-ASCII, and two photos
      // picked in the same millisecond would otherwise collide.
      const safeName = (file.name || `photo-${index + 1}`)
        .replace(/[^a-zA-Z0-9._-]/g, '_')
        .slice(-64)
      const path = `image/${Date.now()}_${index}_${safeName}`

      try {
        const uploadResult = await uploadBytesResumable(ref(storageRef, path), file, {
          contentType: file.type || 'image/jpeg',
        })
        const url = await getDownloadURL(uploadResult.ref)
        return { id: uploadResult.ref.fullPath, url, type: file.type || 'image/jpeg' }
      } catch (error: any) {
        throw new Error(
          `Couldn’t upload ${file.name || `photo ${index + 1}`}${error?.code ? ` (${error.code})` : ''}`
        )
      }
    })

    return await Promise.all(promises)
  }

  const handleSubmit = async (values: ItemType, { setSubmitting }: { setSubmitting: (v: boolean) => void }) => {
    try {
      if (!user) throw new Error("You seem to be unauthorized. Please log out and log back in.")
      toast.loading("Uploading photos…", { description: "Please wait…", id: "saving-item" })
      const assets = await saveAssets(values.assets)
      toast.loading("Saving item…", { description: "Almost done…", id: "saving-item" })

      const data: ItemType = { ...values, assets, views: values.views || 0 }

      startTransition(async () => {
        if (defaultValues && editItem) {
          const { success, message } = await editItem(data, defaultValues.id!)
          if (!success) throw new Error(message)
          toast.success("Item updated!", { description: "Your item has been updated.", id: "saving-item" })
        } else {
          const { success, message } = await addItem(data)
          if (!success) throw new Error(message)
          toast.success("Item listed!", { description: "Your item is now live on Givny.", id: "saving-item" })
        }
        router.push("/app/my-items")
      })
    } catch (error: any) {
      toast.error("Something went wrong", { description: error.message, id: "saving-item" })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Formik
      initialValues={initialValues}
      validationSchema={validationSchema}
      onSubmit={handleSubmit}
      enableReinitialize
    >
      {({
        values,
        handleChange,
        isSubmitting,
        setFieldValue,
        handleBlur,
        setFieldTouched,
        handleSubmit,
        errors,
        touched,
        isValid,
      }) => (
        <Form className="w-full max-w-5xl mx-auto px-4 py-8" onSubmit={handleSubmit}>
          {/* Header */}
          <div className="mb-8">
            <p className="text-xs font-bold tracking-[0.2em] uppercase text-primary mb-2">
              {defaultValues ? "Edit listing" : "New listing"}
            </p>
            <h1 className="text-3xl md:text-4xl font-bold text-ink tracking-tight">
              {defaultValues ? "Edit item" : "List an item"}
            </h1>
            <p className="text-gray-500 mt-1.5 text-sm">
              {defaultValues
                ? "Update your item details below."
                : "Fill in the details and pin your location — takes less than 2 minutes."}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* ── Left column: item details ── */}
            <div className="flex flex-col gap-5">
              <div className="bg-white rounded-3xl border border-gray-200/70 p-6 flex flex-col gap-5">
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Item details</h2>

                <CustomInput
                  label="Item name"
                  onBlur={handleBlur}
                  name="name"
                  value={values.name}
                  onChange={handleChange}
                  placeholder="e.g. Baby stroller, Ikea bookshelf…"
                  error={touched.name && errors.name ? errors.name : undefined}
                  disabled={isSubmitting || _}
                />

                <input type="hidden" name="id" value={values.id} />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <MultiSelectInput
                    containerClassName="w-full"
                    label="Category"
                    options={categories.map((c) => ({ label: c.name, value: c.id }))}
                    values={values.categories.map(c => typeof c === 'string' ? c : c.id)}
                    onChange={(vals) => {
                      const selected = vals.map(v => categories.find(c => c.id === v) || { id: v, name: '' })
                      setFieldValue("categories", selected)
                    }}
                    error={touched.categories && errors.categories ? errors.categories as string : undefined}
                    onTouched={() => setFieldTouched("categories", true)}
                    disabled={isSubmitting || _}
                  />
                  <SelectInput
                    containerClassName="w-full"
                    label="Condition"
                    options={Conditions}
                    value={values.condition || ''}
                    onChange={(v) => setFieldValue("condition", v)}
                    error={touched.condition && errors.condition ? errors.condition : undefined}
                    onTouched={() => setFieldTouched("condition", true)}
                    disabled={isSubmitting || _}
                  />
                </div>

                <CustomTextarea
                  label="Description"
                  error={touched.description && errors.description ? errors.description : undefined}
                  onBlur={handleBlur}
                  name="description"
                  value={values.description}
                  onChange={handleChange}
                  placeholder="Describe the item — size, colour, any wear…"
                  disabled={isSubmitting || _}
                />
              </div>

              {/* Photos */}
              <div className="bg-white rounded-3xl border border-gray-200/70 p-6">
                <DragAndDrop
                  // Passed through untouched. Mapping these into plain objects
                  // used to strip File instances bare — File fields live on the
                  // prototype, so the spread copied nothing and uploads sent
                  // zero-byte files that failed validation.
                  files={values.assets as unknown as UploadItem[]}
                  onChange={(files) => setFieldValue("assets", files)}
                  error={touched.assets && errors.assets ? errors.assets as string : undefined}
                  onTouched={() => setFieldTouched("assets", true)}
                  disabled={isSubmitting || _}
                />
              </div>
            </div>

            {/* ── Right column: location ── */}
            <div className="flex flex-col gap-5">
              <div className="bg-white rounded-3xl border border-gray-200/70 p-6">
                <div className="flex items-center gap-2 mb-1">
                  <MapPin className="w-4 h-4 text-primary" />
                  <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Pickup location</h2>
                </div>
                <p className="text-xs text-gray-400 mb-4">
                  Pin where people can collect this item. Only the neighbourhood is shown publicly.
                </p>
                <LocationPicker
                  lat={values.lat}
                  lng={values.lng}
                  locationName={values.locationName}
                  onChange={(lat, lng, locationName) => {
                    setFieldValue("lat", lat)
                    setFieldValue("lng", lng)
                    setFieldValue("locationName", locationName)
                  }}
                  disabled={isSubmitting || _}
                />
              </div>

              {/* Tip card */}
              <div className="rounded-3xl bg-lime p-6 text-sm text-forest leading-relaxed">
                <p className="font-bold mb-1">📦 Listing tips</p>
                <ul className="list-disc list-inside space-y-1 text-forest/80">
                  <li>Add clear photos — front, back, any defects</li>
                  <li>Be specific about condition (scratches, missing parts)</li>
                  <li>Pin a nearby meeting spot, not your exact door</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Action bar */}
          <div className="flex items-center justify-end gap-3 sm:gap-4 mt-8 pt-6 border-t border-gray-200/60">
            <Link href="/app/my-items" className="flex-1 sm:flex-none">
              <CustomButton
                variant="outline"
                className="w-full sm:w-auto rounded-full px-8 py-3"
                disabled={isSubmitting || _}
              >
                Cancel
              </CustomButton>
            </Link>
            <CustomButton
              className="flex-1 sm:flex-none rounded-full px-8 py-3 sm:min-w-[140px] !bg-forest hover:!bg-forest-dark"
              icon={<SaveIcon className="w-4 h-4" />}
              disabled={!isValid || isSubmitting || _}
              isLoading={isSubmitting || _}
              type="submit"
            >
              {defaultValues ? "Save changes" : "Publish listing"}
            </CustomButton>
          </div>
        </Form>
      )}
    </Formik>
  )
}
