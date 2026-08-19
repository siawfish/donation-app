'use client'

import { SaveIcon, MapPin, ArrowLeft, ArrowRight, Check, Camera, FileText, Send } from "lucide-react"
import CustomButton from "./Button"
import CustomInput from "./CustomInput"
import CustomTextarea from "./CustomTextarea"
import DragAndDrop, { UploadItem, isUploadedAsset } from "./ui/drag-n-drop"
import { Form, Formik, FormikProps } from "formik"
import * as yup from "yup"
import { AssetType, CategoryType, ItemType, ResponseData } from "@/app/types"
import { useEffect, useMemo, useState, useTransition } from "react"
import { storage, firestore } from "@/firebase/auth/firebase"
import MultiSelectInput from "./MultiSelectInput"
import SelectInput from "./SelectInput"
import { Conditions } from "@/lib/utils"
import { PARCEL_SIZES } from "@/lib/delivery"
import Link from "next/link"
import { useAuth } from "@/firebase/auth/AuthContext"
import { awaitClientAuth } from "@/firebase/auth/clientAuth"
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
  parcelSize: undefined,
}

interface AddDonationProps {
  addItem: (item: ItemType) => Promise<ResponseData<string | null>>
  editItem?: (item: ItemType, id: string) => Promise<ResponseData<ItemType | null>>
  categories: CategoryType[]
  defaultValues?: ItemType
}

/** A pending upload (File) or something already in Storage (has a url). */
function isUsableAsset(value: unknown): boolean {
  if (typeof File !== 'undefined' && value instanceof File) return true
  return typeof value === 'object' && value !== null && 'url' in value
}

const validationSchema = yup.object({
  name: yup.string().required("Give it a name"),
  categories: yup.array().of(
    yup.object().shape({
      id: yup.string().required(),
      name: yup.string().required()
    })
  ).min(1, "Pick at least one category"),
  condition: yup.string().required("Choose a condition"),
  description: yup.string().required("Add a short description"),
  parcelSize: yup
    .string()
    .oneOf(["small", "medium", "large"])
    .required("Pick a size so people can estimate collection cost"),
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

/**
 * Photos lead deliberately. It's the step people are most motivated to start,
 * and once a photo is in, the rest of the form feels like finishing something
 * rather than beginning it.
 */
const STEPS = [
  { id: "photos", label: "Photos", icon: Camera, fields: ["assets"] as const },
  { id: "details", label: "Details", icon: FileText, fields: ["name", "categories", "condition", "description", "parcelSize"] as const },
  { id: "pickup", label: "Pickup", icon: MapPin, fields: [] as const },
]

export default function AddDonation({ addItem, editItem, categories, defaultValues }: AddDonationProps) {
  const [initialValues, setInitialValues] = useState(INITIAL_VALUES)
  const [step, setStep] = useState(0)
  const [furthest, setFurthest] = useState(0)
  const router = useRouter()
  const { user } = useAuth()
  const [_, startTransition] = useTransition()
  const isEditing = !!defaultValues

  useEffect(() => {
    if (defaultValues) {
      // Kept verbatim: these already carry the Storage path in `id`, and an
      // earlier mapping replaced it with "image-1", losing the real reference.
      setInitialValues({ ...defaultValues, assets: defaultValues.assets ?? [] })
      setFurthest(STEPS.length - 1) // everything is already filled in
      return
    }

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
    // Storage rules check the *client* SDK's user, which is signed in with a
    // custom token after mount. Without this the first upload after a page load
    // can race that and come back as storage/unauthorized.
    const signedIn = await awaitClientAuth()
    if (!signedIn) {
      throw new Error("Couldn't verify your session for uploads. Refresh the page and try again.")
    }

    const storageRef = ref(storage, `donor/${user?.uid}`)

    // Order matters — assets[0] is the cover shown everywhere — and Promise.all
    // preserves it regardless of which upload finishes first.
    const promises = assets.map(async (asset, index) => {
      if (isUploadedAsset(asset)) return asset

      const file = asset
      if (!(file instanceof File) || file.size === 0) {
        throw new Error(`Photo ${index + 1} didn’t attach properly. Remove it and add it again.`)
      }

      // Storage object names choke on spaces and non-ASCII, and two photos
      // picked in the same millisecond would otherwise collide.
      const safeName = (file.name || `photo-${index + 1}`).replace(/[^a-zA-Z0-9._-]/g, '_').slice(-64)
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
          toast.success("Listing updated", { description: "Your changes are live.", id: "saving-item" })
        } else {
          const { success, message } = await addItem(data)
          if (!success) throw new Error(message)
          toast.success("It's live!", { description: "Your item is now up for grabs.", id: "saving-item" })
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
      {(formik) => {
        const { values, errors, touched, setFieldTouched, validateForm, isSubmitting } = formik
        const busy = isSubmitting || _
        const isLast = step === STEPS.length - 1

        /** Only advance when this step's own fields are clean. */
        const goNext = async () => {
          const found = await validateForm()
          const fields = STEPS[step].fields
          fields.forEach((f) => setFieldTouched(f as string, true))
          const blocked = fields.some((f) => (found as any)[f])
          if (blocked) return
          const next = Math.min(step + 1, STEPS.length - 1)
          setStep(next)
          setFurthest((v) => Math.max(v, next))
          window.scrollTo({ top: 0, behavior: "smooth" })
        }

        const stepError = (field: string) =>
          (touched as any)[field] && (errors as any)[field] ? String((errors as any)[field]) : undefined

        return (
          <Form className="w-full max-w-5xl mx-auto pb-32">
            {/* Header */}
            <div className="mb-6">
              <p className="text-xs font-bold tracking-[0.2em] uppercase text-primary mb-2">
                {isEditing ? "Edit listing" : "New listing"}
              </p>
              <h1 className="text-3xl md:text-4xl font-bold text-ink tracking-tight">
                {isEditing ? "Edit your listing" : "Pass something on"}
              </h1>
              <p className="text-gray-500 mt-1.5 text-sm">
                {isEditing
                  ? "Update anything below — jump straight to the part you need."
                  : "Three quick steps. Most people finish in under two minutes."}
              </p>
            </div>

            {/* Progress */}
            <div className="flex items-center gap-2 mb-8">
              {STEPS.map((s, i) => {
                const done = i < furthest || (isEditing && i !== step)
                const active = i === step
                const reachable = isEditing || i <= furthest
                const Icon = s.icon
                return (
                  <button
                    key={s.id}
                    type="button"
                    disabled={!reachable}
                    onClick={() => reachable && setStep(i)}
                    className={`flex items-center gap-2 flex-1 rounded-2xl px-3 py-2.5 border transition-colors ${
                      active
                        ? "bg-forest text-white border-forest"
                        : done
                        ? "bg-white text-ink border-gray-200 hover:border-forest/40"
                        : "bg-white text-gray-400 border-gray-200"
                    } ${!reachable ? "cursor-not-allowed" : "cursor-pointer"}`}
                  >
                    <span
                      className={`flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-extrabold flex-shrink-0 ${
                        active ? "bg-lime text-forest" : done ? "bg-lime text-forest" : "bg-sand text-gray-400"
                      }`}
                    >
                      {done && !active ? <Check className="w-3 h-3" /> : i + 1}
                    </span>
                    <span className="text-sm font-bold truncate hidden sm:block">{s.label}</span>
                    <Icon className="w-4 h-4 sm:hidden" />
                  </button>
                )
              })}
            </div>

            {/* ── Step 1: photos ── */}
            {step === 0 && (
              <section className="bg-white rounded-3xl border border-gray-200/70 p-5 md:p-6">
                <h2 className="text-xl font-bold text-ink">What are you passing on?</h2>
                <p className="text-sm text-gray-500 mt-1 mb-5">
                  Good photos are the single biggest thing that gets an item picked up.
                </p>
                <DragAndDrop
                  files={values.assets as unknown as UploadItem[]}
                  onChange={(files) => formik.setFieldValue("assets", files)}
                  error={stepError("assets")}
                  onTouched={() => setFieldTouched("assets", true)}
                  disabled={busy}
                />
              </section>
            )}

            {/* ── Step 2: details ── */}
            {step === 1 && (
              <section className="bg-white rounded-3xl border border-gray-200/70 p-5 md:p-6 flex flex-col gap-5">
                <div>
                  <h2 className="text-xl font-bold text-ink">Tell people what it is</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Be honest about wear — it saves everyone a wasted trip.
                  </p>
                </div>

                <CustomInput
                  label="Item name"
                  name="name"
                  placeholder="e.g. Baby stroller, Ikea bookshelf…"
                  value={values.name}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={stepError("name")}
                  disabled={busy}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <MultiSelectInput
                    containerClassName="w-full"
                    label="Category"
                    options={categories.map((c) => ({ label: c.name, value: c.id }))}
                    values={values.categories.map((c) => (typeof c === "string" ? c : c.id))}
                    onChange={(vals) =>
                      formik.setFieldValue(
                        "categories",
                        vals.map((v) => categories.find((c) => c.id === v) || { id: v, name: "" })
                      )
                    }
                    error={stepError("categories")}
                    onTouched={() => setFieldTouched("categories", true)}
                    disabled={busy}
                  />
                  <SelectInput
                    containerClassName="w-full"
                    label="Condition"
                    options={Conditions}
                    value={values.condition || ""}
                    onChange={(v) => formik.setFieldValue("condition", v)}
                    error={stepError("condition")}
                    onTouched={() => setFieldTouched("condition", true)}
                    disabled={busy}
                  />
                </div>

                <CustomTextarea
                  label="Description"
                  name="description"
                  placeholder="Size, colour, any scratches or missing parts…"
                  value={values.description}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={stepError("description")}
                  disabled={busy}
                />

                {/* Size drives the delivery estimate people see before they ask
                    for it. Framed by what it takes to carry, since nobody knows
                    their sofa in kilograms. */}
                <div>
                  <label className="block text-sm font-semibold text-ink mb-1">How big is it?</label>
                  <p className="text-xs text-gray-500 mb-3">
                    Lets people work out what collection would cost them.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {PARCEL_SIZES.map((s) => {
                      const active = values.parcelSize === s.id
                      return (
                        <button
                          key={s.id}
                          type="button"
                          disabled={busy}
                          aria-pressed={active}
                          onClick={() => {
                            formik.setFieldValue("parcelSize", s.id)
                            setFieldTouched("parcelSize", true)
                          }}
                          className={`text-left p-3.5 rounded-2xl border transition-colors disabled:opacity-50 ${
                            active
                              ? "border-forest bg-forest text-white"
                              : "border-gray-200 bg-white hover:border-forest/40"
                          }`}
                        >
                          <span className="block text-sm font-bold">{s.label}</span>
                          <span className={`block text-xs mt-0.5 ${active ? "text-lime" : "text-gray-500"}`}>
                            {s.hint}
                          </span>
                          <span className={`block text-[11px] mt-1.5 leading-snug ${active ? "text-white/70" : "text-gray-400"}`}>
                            {s.example}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                  {stepError("parcelSize") && (
                    <p className="text-xs text-red-500 mt-2">{stepError("parcelSize")}</p>
                  )}
                </div>
              </section>
            )}

            {/* ── Step 3: pickup + review ── */}
            {step === 2 && (
              <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-5">
                <section className="bg-white rounded-3xl border border-gray-200/70 p-5 md:p-6">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-primary" />
                    <h2 className="text-xl font-bold text-ink">Where can people collect it?</h2>
                  </div>
                  <p className="text-sm text-gray-500 mt-1 mb-5">
                    Only the neighbourhood is shown publicly — pin a nearby spot, not your door.
                  </p>
                  <LocationPicker
                    lat={values.lat}
                    lng={values.lng}
                    locationName={values.locationName}
                    disabled={busy}
                    onChange={(lat, lng, locationName) => {
                      formik.setFieldValue("lat", lat)
                      formik.setFieldValue("lng", lng)
                      formik.setFieldValue("locationName", locationName)
                    }}
                  />
                </section>

                {/* Seeing the actual card removes the "what will this look like?"
                    doubt right before the commit point. */}
                <section className="bg-white rounded-3xl border border-gray-200/70 p-5 md:p-6 h-fit">
                  <p className="text-xs font-bold tracking-[0.2em] uppercase text-primary mb-3">Preview</p>
                  <ListingPreview values={values} />
                  <p className="text-[11px] text-gray-400 mt-3 leading-relaxed">
                    This is how your item appears while people are browsing.
                  </p>
                </section>
              </div>
            )}

            {/* Sticky action bar */}
            <div className="fixed bottom-0 inset-x-0 bg-canvas/95 backdrop-blur-md border-t border-gray-200/60 z-30">
              <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
                {step > 0 ? (
                  <button
                    type="button"
                    onClick={() => { setStep(step - 1); window.scrollTo({ top: 0, behavior: "smooth" }) }}
                    disabled={busy}
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-ink px-3 py-2 rounded-full transition-colors disabled:opacity-50"
                  >
                    <ArrowLeft className="w-4 h-4" /> Back
                  </button>
                ) : (
                  <Link
                    href="/app/my-items"
                    className="text-sm font-semibold text-gray-500 hover:text-ink px-3 py-2 rounded-full transition-colors"
                  >
                    Cancel
                  </Link>
                )}

                <span className="ml-auto text-xs text-gray-400 hidden sm:block">
                  Step {step + 1} of {STEPS.length}
                </span>

                {isLast ? (
                  <CustomButton
                    type="submit"
                    className="rounded-full px-7 py-3 !bg-forest hover:!bg-forest-dark min-w-[160px]"
                    icon={isEditing ? <SaveIcon className="w-4 h-4" /> : <Send className="w-4 h-4" />}
                    disabled={busy}
                    isLoading={busy}
                  >
                    {isEditing ? "Save changes" : "Publish listing"}
                  </CustomButton>
                ) : (
                  <CustomButton
                    type="button"
                    onClick={goNext}
                    className="rounded-full px-7 py-3 !bg-forest hover:!bg-forest-dark min-w-[140px]"
                    icon={<ArrowRight className="w-4 h-4" />}
                    disabled={busy}
                  >
                    Continue
                  </CustomButton>
                )}
              </div>
            </div>
          </Form>
        )
      }}
    </Formik>
  )
}

/** Mini version of the browse card, fed by the live form values. */
function ListingPreview({ values }: { values: ItemType }) {
  const cover = (values.assets as unknown as UploadItem[])?.[0]

  const src = useMemo(() => {
    if (!cover) return null
    if (isUploadedAsset(cover)) return cover.url
    if (cover instanceof File) return URL.createObjectURL(cover)
    return null
  }, [cover])

  // Revoke the preview blob when the cover changes or the step unmounts.
  useEffect(() => {
    return () => { if (src?.startsWith("blob:")) URL.revokeObjectURL(src) }
  }, [src])

  return (
    <div className="rounded-3xl border border-gray-200/70 overflow-hidden bg-white max-w-[240px]">
      <div className="relative aspect-square bg-sand">
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt="" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-gray-300">
            <Camera className="w-7 h-7" />
          </div>
        )}
        <span className="absolute top-3 left-3 bg-lime text-forest text-[10px] font-extrabold px-2.5 py-1 rounded-full tracking-widest">
          FREE
        </span>
      </div>
      <div className="p-3.5">
        <p className="text-sm font-bold text-ink truncate">{values.name || "Your item"}</p>
        <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">
          {values.description || "Your description appears here"}
        </p>
        {values.locationName && (
          <p className="flex items-center gap-1 text-xs text-gray-400 mt-2 truncate">
            <MapPin className="w-3 h-3 flex-shrink-0" /> {values.locationName}
          </p>
        )}
      </div>
    </div>
  )
}
