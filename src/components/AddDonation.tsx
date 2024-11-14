'use client'

import { SaveIcon } from "lucide-react"
import CustomButton from "./Button"
import CustomInput from "./CustomInput"
import CustomTextarea from "./CustomTextarea"
import DragAndDrop from "./ui/drag-n-drop"
import { Form, Formik } from "formik"
import * as yup from "yup"
import { CategoryType, ConditionType, ItemType, ResponseData } from "@/app/types"
import { useState, useTransition } from "react"
import { storage } from "@/firebase/auth/firebase"
import MultiSelectInput from "./MultiSelectInput"
import SelectInput from "./SelectInput"
import { Conditions } from "@/lib/utils"
import Link from "next/link"
import { useAuth } from "@/firebase/auth/AuthContext"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { getDownloadURL, ref, uploadBytesResumable } from "firebase/storage";

const defaultValues = {
  name: "",
  category: [],
  condition: "",
  description: "",
  assets: []
}

const validationSchema = yup.object({
  name: yup.string().required("Item name is required"),
  category: yup.array().of(yup.string()).min(1, "Select at least one category"),
  condition: yup.string().required("Condition is required"),
  description: yup.string().required("Description is required"),
  assets: yup.array().of(yup.mixed()).min(1, "Upload at least one asset"),
})

export default function AddDonation({ addItem, categories }: { addItem: (item: ItemType) => Promise<ResponseData<string | null>>, categories: CategoryType[] }) {
  const [initialValues, setInitialValues] = useState(defaultValues);
  const router = useRouter();
  const { user } = useAuth();
  const [_, startTransition] = useTransition();
  const saveAssets = async (assets: File[]) => {
    const storageRef = ref(storage, `donor/${user?.uid}`);
    const promises = assets.map(async (asset) => {
      const assetRef = ref(storageRef, `${asset.type.split("/")[0]}/${asset.name}_${Date.now()}`);
      const uploadResult = await uploadBytesResumable(assetRef, asset);
      const url = await getDownloadURL(uploadResult.ref);
      return {
        id: uploadResult.ref.fullPath,
        url,
        type: asset.type
      };
    });
    return await Promise.all(promises);
  }

  const handleSubmit = async (values: typeof defaultValues, { setSubmitting }: { setSubmitting: (isSubmitting: boolean) => void }) => {
   try {
      if (!user) {
        throw new Error("You seem to be unauthorized. If this persists, please log out and log back in.");
      }
      toast.loading("Uploading assets...", { description: "Please wait while we upload your assets...", id: "saving-item" });
      const assets = await saveAssets(values.assets);
      toast.loading("Saving item...", { description: "Please wait while we save your item...", id: "saving-item" });
      const data:ItemType = {
        name: values.name,
        description: values.description,
        category: values.category,
        condition: values.condition as ConditionType,
        assets
      }
      startTransition(async () => {
        const {success, message} = await addItem(data);
        if (!success) throw new Error(message);
        toast.success("Item added successfully", { description: "You can now view your item in your dashboard.", id: "saving-item" });
        router.push("/app/donor/my-items");
      });

    } catch (error: any) {
      toast.error("Something went wrong", { description: error.message, id: "saving-item" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Formik
      initialValues={initialValues}
      validationSchema={validationSchema}
      onSubmit={handleSubmit}
    >
      {
        ({
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
          <Form className="container max-w-6xl mx-auto px-4 lg:py-12" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 lg:grid-cols-[60%_40%] gap-y-4">
              <div className="flex flex-col justify-center gap-6 lg:mr-4">
                <div>
                  <h1 className="text-3xl font-bold">Add an Item</h1>
                  <p className="text-muted-foreground">Complete form to add a new item.</p>
                </div>
                <div className="flex flex-col justify-center gap-4 flex-1">
                  <CustomInput
                    label="Item Name"
                    onBlur={handleBlur}
                    name="name"
                    value={values.name}
                    onChange={handleChange}
                    placeholder="Enter item name..."
                    error={touched.name && errors.name ? errors.name : undefined}
                    disabled={isSubmitting || _}
                  />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <MultiSelectInput
                      containerClassName="w-full"
                      label="Category"
                      options={categories.map((category) => ({
                        label: category.name,
                        value: category.id
                      }))}
                      values={values.category}
                      onChange={(values) => setFieldValue("category", values)}
                      error={touched.category && errors.category ? errors.category as string : undefined}
                      onTouched={() => setFieldTouched("category", true)}
                      disabled={isSubmitting || _}
                    />
                    <SelectInput
                      containerClassName="w-full"
                      label="Condition"
                      options={Conditions}
                      value={values.condition}
                      onChange={(value) => setFieldValue("condition", value)}
                      error={touched.condition && errors.condition ? errors.condition : undefined}
                      onTouched={() => setFieldTouched("condition", true)}
                      disabled={isSubmitting || _}
                    />
                  </div>
                  <CustomTextarea
                    label="Item Description"
                    error={touched.description && errors.description ? errors.description : undefined}
                    onBlur={handleBlur}
                    name="description"
                    value={values.description}
                    onChange={handleChange}
                    disabled={isSubmitting || _}
                  />
                </div>
              </div>
              <DragAndDrop 
                files={values.assets} 
                onChange={(files) => setFieldValue("assets", files)} 
                error={touched.assets && errors.assets ? errors.assets as string : undefined} 
                onTouched={() => setFieldTouched("assets", true)} 
                disabled={isSubmitting || _}
              />
            </div>
            <div className="flex justify-end mt-6 gap-4">
              <Link href="/app/donor/my-items">
                <CustomButton
                  variant="outline"
                  className="w-[150px] rounded-full text-lg py-6"
                  disabled={isSubmitting || _}
                >
                  Cancel
                </CustomButton>
              </Link>
              <CustomButton
                className="w-[150px] rounded-full text-lg py-6"
                icon={<SaveIcon className="w-4 h-4" />}
                disabled={!isValid}
                isLoading={isSubmitting || _}
                type="submit"
              >
                Save
              </CustomButton>
            </div>
          </Form>
        )
      }
    </Formik>
  )
}