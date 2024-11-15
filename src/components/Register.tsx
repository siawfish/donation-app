"use client";

import Image from "next/image"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs"
import IndividualForm from "./IndividualForm"
import OrganizationForm from "./OrganizationForm"
import { ArrowRightIcon } from "lucide-react"
import CustomButton from "./Button"
import { AccountTypes, DonorRegisterPayload, DonorType, ResponseData, UserRegisterPayload, UserType, UserTypes } from "@/app/types"
import { Form, Formik } from "formik"
import * as yup from "yup";
import { useState, useTransition } from "react";
import { redirect } from "next/navigation";
import { toast } from "sonner"
import { SetPassword } from "./SetPassword";

const donorInitialValues: DonorType = {
  id: "",
  name: "",
  email: "",
  phone: "",
  address: "",
  city: "",
  state: "",
  zip: "",
  country: "",
  type: AccountTypes.INDIVIDUAL,
  lastLogin: "",
  createdAt: "",
  updatedAt: "",
  userType: UserTypes.DONOR
}

const donorValidationSchema = yup.object({
  name: yup.string().min(1, "Name is required").required("Name is required"),
  email: yup.string().email("Invalid email address").required("Email is required"),
  phone: yup.number().lessThan(10000000000, "Phone number must be 10 digits").required("Phone number is required"),
  address: yup.string().min(1, "Address is required").required("Address is required"),
  city: yup.string().min(1, "City is required").required("City is required"),
  state: yup.string().min(1, "State is required").required("State is required"),
  zip: yup.string().min(1, "Zip code is required").required("Zip code is required"),
  country: yup.string().min(1, "Country is required").required("Country is required"),
})

const userValidationSchema = yup.object({
  ...donorValidationSchema.shape,
  preferedCategories: yup.array(yup.string()).required("At least one category is required"),
})

interface RegisterProps {
  title: string;
  caption: string;
  callbackUrl: string;
  registerAction: (payload: DonorRegisterPayload | UserRegisterPayload) => Promise<ResponseData<DonorType | UserType | null>>;
}

export function Register({
  title="Donor Registration",
  caption="Create an account to start donating",
  callbackUrl="/app/donor/my-items",
  registerAction
}:RegisterProps) {
  const [_, startTransition] = useTransition();
  const [payload, setPayload] = useState<DonorType | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = (values: DonorType) => {
    setPayload(values)
  }

  const onConfirm = (payload: DonorRegisterPayload) => {
    if(_) return;
    setSubmitting(true);
    setPayload(null);
    startTransition(async () => {
      const {success, message} = await registerAction(payload);
      if (!success) {
        toast.error("Something went wrong", {
          description: message,
        });
        setSubmitting(false);
        return;
      }
      toast.success("Account created successfully", {
        description: "Thank you for registering with Givny. Kindly proceed to login.",
      });
      setSubmitting(false);
      redirect(callbackUrl);
    })
  }

  return (
    <div className="container mx-auto min-h-[calc(100vh-160px)]">
      <div className="grid grid-cols-1 lg:grid-cols-[65%_35%] h-full w-full">
        <div className="flex-1 flex items-center lg:pr-16">

        <Formik 
          initialValues={donorInitialValues} 
          validationSchema={donorValidationSchema}
          onSubmit={handleSubmit}
        >
          {
            (props) => (
              <Form className="w-full">
                <div className="flex flex-col gap-y-12 w-full sm:px-6 lg:px-8">
                  <div className="space-y-1">
                    <h1 className="text-3xl font-bold">{title}</h1>
                    <p className="text-muted-foreground">{caption}</p>
                  </div>
                      <Tabs defaultValue={AccountTypes.INDIVIDUAL}  className="space-y-4">
                        <div className="space-y-2">
                          <div className="flex items-center space-x-4">
                            <TabsList className="p-0">
                              {
                                Object.values(AccountTypes).map((accountType) => (
                                  <TabsTrigger className="capitalize" key={accountType} value={accountType}>{accountType}</TabsTrigger>
                                ))
                              }
                            </TabsList>
                          </div>
                        </div>
                        <TabsContent value={AccountTypes.INDIVIDUAL}>
                          <IndividualForm {...props} disabled={submitting || _} />
                        </TabsContent>
                        <TabsContent value={AccountTypes.ORGANIZATION}>
                          <OrganizationForm {...props} disabled={submitting || _} />
                        </TabsContent>
                      </Tabs>
                    <CustomButton 
                      icon={<ArrowRightIcon className="w-4 h-4" />}
                      iconPosition="right"
                      className="max-w-[200px] rounded-full py-6"
                      type="submit"
                      isLoading={_ || submitting}
                    >
                      Register
                    </CustomButton>
                  </div>
                </Form>
            )
          }
        </Formik>
        <SetPassword
          onSubmit={(value) => {
            if(!payload) return;
            onConfirm({...payload, password: value})
          }}
          open={!!payload}
          setOpen={(state)=>{
            if(!state) setPayload(null);
          }}
        />
        </div>
        <div className="flex-1 justify-center items-center hidden lg:flex pr-12">
          <div className="max-w-[500px] relative">
            <Image 
              src="/give-5.jpg" 
              alt="Register" 
              width={507} 
              height={760.5} 
              className="object-cover rounded-lg transform skew-x-[-4deg] blur-[3px]" 
            />
          </div>
        </div>
      </div>
    </div>
  )
}
