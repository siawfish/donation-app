'use client'

import { SaveIcon, MapPin } from "lucide-react"
import CustomButton from "./Button"
import CustomInput from "./CustomInput"
import CustomTextarea from "./CustomTextarea"
import DragAndDrop from "./ui/drag-n-drop"
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
  assets: yup.array().of(
    yup.mixed().test('is-valid-asset', 'Invalid asset format', function (value) {
      return (
        (value instanceof File) ||
        (typeof value === 'object' && value !== null && 'url' in value && 'type' in value)
      )
    })
  ).min(1, "Upload at least one photo"),
})

export default function AddDonation({ addItem, editItem, categories, defaultValues }: AddDonationProps) {
  const [initialValues, setInitialValues] = useState(INITIAL_VALUES)
  const router = useRouter()
  const { user } = useAuth()
  const [_, startTransition] = useTransition()

  // Pre-fill location from the user's profile
  useEffect(() => {
    if (defaultValues) {
      setInitialValues({
        ...defaultValues,
        assets: defaultValues.assets.map((asset, i) => ({
          ...asset,
          preview: asset.url,
          id: `image-${i + 1}`,
          type: asset.type
        }))
      })
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

  const saveAssets = async (assets: (File | AssetType)[]) => {
    const storageRef = ref(storage, `donor/${user?.uid}`)
    const promises = assets.map(async (asset) => {
      if ('url' in asset && asset.url) return asset
      const file = asset as File
      const fileType = file.type.split("/")[0]
      const fileName = `${fileType}/${Date.now()}_${file.name}`
      const assetRef = ref(storageRef, fileName)
      try {
        const uploadResult = await uploadBytesResumable(assetRef, file)
        const url = await getDownloadURL(uploadResult.ref)
        return { id: uploadResult.ref.fullPath, url, type: file.type }
      } catch (error) {
        throw new Error(`Failed to upload ${file.name}`)
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
            <h1 className="text-3xl font-bold text-gray-900">
              {defaultValues ? "Edit item" : "List an item"}
            </h1>
            <p className="text-gray-500 mt-1 text-sm">
              {defaultValues
                ? "Update your item details below."
                : "Fill in the details and pin your location — takes less than 2 minutes."}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* ── Left column: item details ── */}
            <div className="flex flex-col gap-5">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col gap-5">
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
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Photos</h2>
                <DragAndDrop
                  files={values.assets.map(asset => ({
                    ...asset,
                    lastModified: Date.now(),
                    name: asset.id,
                    webkitRelativePath: '',
                    size: 0,
                    type: asset.type,
                    arrayBuffer: async () => new ArrayBuffer(0),
                    slice: () => new Blob(),
                    stream: () => new ReadableStream(),
                    text: async () => ''
                  }))}
                  onChange={(files) => setFieldValue("assets", files)}
                  error={touched.assets && errors.assets ? errors.assets as string : undefined}
                  onTouched={() => setFieldTouched("assets", true)}
                  disabled={isSubmitting || _}
                />
              </div>
            </div>

            {/* ── Right column: location ── */}
            <div className="flex flex-col gap-5">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
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
              <div className="rounded-2xl bg-primary-light border border-primary/10 p-5 text-sm text-primary leading-relaxed">
                <p className="font-semibold mb-1">📦 Listing tips</p>
                <ul className="list-disc list-inside space-y-1 text-primary/80">
                  <li>Add clear photos — front, back, any defects</li>
                  <li>Be specific about condition (scratches, missing parts)</li>
                  <li>Pin a nearby meeting spot, not your exact door</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Action bar */}
          <div className="flex items-center justify-end gap-4 mt-8 pt-6 border-t border-gray-100">
            <Link href="/app/my-items">
              <CustomButton
                variant="outline"
                className="rounded-full px-8 py-3"
                disabled={isSubmitting || _}
              >
                Cancel
              </CustomButton>
            </Link>
            <CustomButton
              className="rounded-full px-8 py-3 min-w-[140px]"
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
