"use client";

import { useState, useTransition } from "react";
import { Progress } from "@/components/ui/progress";
import CustomButton from "./Button";
import { ArrowRightIcon, SendIcon } from "lucide-react";
import MultiSelectInput from "./MultiSelectInput";
import { Form, Formik } from "formik";
import { CategoryType, ResponseData, UserRegisterPayload, UserType } from "@/app/types";
import * as yup from "yup";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import CustomInput from "./CustomInput";
import Link from "next/link";
import dynamic from "next/dynamic";

// Leaflet must be loaded client-side only
const LocationPicker = dynamic(() => import("./LocationPicker"), { ssr: false });

const steps = [
  { title: "Create your account", description: "Just the basics to get you started" },
  { title: "Your area", description: "Pin your location and choose what you care about" },
  { title: "Set a password", description: "Keep your account secure" },
];

const initialValues = {
  name: "",
  email: "",
  lat: 0,
  lng: 0,
  preferedLocation: "",
  preferedCategories: [] as string[],
  password: "",
  confirmPassword: "",
};

const schemas = [
  yup.object().shape({
    name: yup.string().min(1, "Name is required").required("Name is required"),
    email: yup.string().email("Invalid email address").required("Email is required"),
  }),
  yup.object().shape({
    preferedLocation: yup.string().min(1, "Please pick a location on the map").required("Location is required"),
    preferedCategories: yup.array(yup.string()).min(1, "Pick at least one category").required(),
  }),
  yup.object().shape({
    password: yup.string().min(8, "At least 8 characters").required("Password is required"),
    confirmPassword: yup.string().oneOf([yup.ref("password")], "Passwords don't match").required("Please confirm your password"),
  }),
];

export default function RegisterPage({
  categories,
  registerUserAction,
}: {
  categories: CategoryType[];
  registerUserAction: (payload: UserRegisterPayload) => Promise<ResponseData<UserType | null>>;
}) {
  const [currentStep, setCurrentStep] = useState(0);
  const [_, startTransaction] = useTransition();
  const router = useRouter();

  const handleSubmit = (
    values: typeof initialValues,
    { setSubmitting }: { setSubmitting: (v: boolean) => void }
  ) => {
    startTransaction(async () => {
      const payload: UserRegisterPayload = {
        name: values.name,
        email: values.email,
        preferedLocation: values.preferedLocation,
        preferedCategories: values.preferedCategories,
        lat: values.lat,
        lng: values.lng,
        password: values.password,
        id: "",
        lastLogin: "",
        createdAt: "",
        updatedAt: "",
      };
      const { success, message } = await registerUserAction(payload);
      if (!success) {
        toast.error("Registration failed", { description: message });
      } else {
        router.push("/app");
        toast.success("Welcome to Givny!");
      }
      setSubmitting(false);
    });
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Left brand panel */}
      <div className="md:w-5/12 bg-primary flex flex-col justify-between p-10 md:p-14 relative overflow-hidden">
        <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-white opacity-5" />
        <div className="absolute bottom-16 -left-8 w-40 h-40 rounded-full bg-white opacity-5" />
        <div className="relative z-10">
          <span className="text-white text-2xl font-bold">Givny</span>
        </div>
        <div className="relative z-10 space-y-6 py-8">
          <h1 className="text-4xl font-bold text-white leading-snug">
            Find what you need,<br />give what you don&apos;t.
          </h1>
          <p className="text-white/70 text-lg leading-relaxed max-w-sm">
            Join thousands of community members sharing items for free. No cost, no catch.
          </p>
          <ul className="flex flex-col gap-3 pt-2">
            {["Location-based item discovery", "Wide range of categories", "100% free — always"].map((item) => (
              <li key={item} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-white/20 flex-shrink-0 flex items-center justify-center">
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                    <path d="M1 4l2.5 2.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <span className="text-white/80 text-sm">{item}</span>
              </li>
            ))}
          </ul>
        </div>
        <p className="text-white/30 text-xs relative z-10">© {new Date().getFullYear()} Givny. All rights reserved.</p>
      </div>

      {/* Right form panel */}
      <div className="md:w-7/12 bg-white flex flex-col justify-center px-6 py-10 md:px-14">
        <div className="w-full max-w-lg mx-auto">
          {/* Step header */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-4">
              {steps.map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${i <= currentStep ? "bg-primary" : "bg-gray-200"}`}
                />
              ))}
            </div>
            <p className="text-xs font-medium text-primary mb-1">
              Step {currentStep + 1} of {steps.length}
            </p>
            <h2 className="text-2xl font-bold text-gray-900">{steps[currentStep].title}</h2>
            <p className="text-sm text-gray-500 mt-1">{steps[currentStep].description}</p>
          </div>

          <Formik
            initialValues={initialValues}
            validationSchema={schemas[currentStep]}
            onSubmit={currentStep < steps.length - 1 ? () => {} : handleSubmit}
            validateOnBlur
          >
            {({ values, handleChange, handleBlur, setFieldValue, setFieldTouched, touched, errors, isSubmitting, validateForm }) => (
              <Form className="space-y-5">
                {/* Step 1 — Account */}
                {currentStep === 0 && (
                  <>
                    <CustomInput
                      label="Full Name"
                      name="name"
                      placeholder="Jane Doe"
                      value={values.name}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      error={touched.name && errors.name ? errors.name : undefined}
                      disabled={isSubmitting}
                    />
                    <CustomInput
                      label="Email Address"
                      name="email"
                      type="email"
                      placeholder="you@example.com"
                      value={values.email}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      error={touched.email && errors.email ? errors.email : undefined}
                      disabled={isSubmitting}
                    />
                  </>
                )}

                {/* Step 2 — Location + Categories */}
                {currentStep === 1 && (
                  <>
                    <LocationPicker
                      lat={values.lat || undefined}
                      lng={values.lng || undefined}
                      locationName={values.preferedLocation}
                      disabled={isSubmitting}
                      onChange={(lat, lng, name) => {
                        setFieldValue("lat", lat);
                        setFieldValue("lng", lng);
                        setFieldValue("preferedLocation", name);
                      }}
                    />
                    {touched.preferedLocation && errors.preferedLocation && (
                      <p className="text-xs text-red-500 -mt-1">{errors.preferedLocation}</p>
                    )}
                    <MultiSelectInput
                      label="What categories interest you?"
                      placeholder="Select categories…"
                      options={categories.map((c) => ({ label: c.name, value: c.id }))}
                      values={values.preferedCategories}
                      onChange={(v) => setFieldValue("preferedCategories", v)}
                      error={touched.preferedCategories && errors.preferedCategories ? errors.preferedCategories as string : undefined}
                      onTouched={() => setFieldTouched("preferedCategories", true)}
                      disabled={isSubmitting}
                    />
                  </>
                )}

                {/* Step 3 — Password */}
                {currentStep === 2 && (
                  <>
                    <CustomInput
                      label="Password"
                      name="password"
                      type="password"
                      placeholder="Min. 8 characters"
                      value={values.password}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      error={touched.password && errors.password ? errors.password : undefined}
                      disabled={isSubmitting}
                    />
                    <CustomInput
                      label="Confirm Password"
                      name="confirmPassword"
                      type="password"
                      placeholder="Repeat your password"
                      value={values.confirmPassword}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      error={touched.confirmPassword && errors.confirmPassword ? errors.confirmPassword : undefined}
                      disabled={isSubmitting}
                    />
                  </>
                )}

                {/* Navigation */}
                <div className="flex items-center justify-between pt-2">
                  {currentStep > 0 ? (
                    <button
                      type="button"
                      onClick={() => setCurrentStep((s) => s - 1)}
                      className="text-sm text-gray-500 hover:text-gray-700 font-medium"
                      disabled={isSubmitting}
                    >
                      ← Back
                    </button>
                  ) : (
                    <p className="text-sm text-gray-500">
                      Already have an account?{" "}
                      <Link href="/auth/login" className="text-primary font-medium hover:underline">
                        Sign in
                      </Link>
                    </p>
                  )}

                  {currentStep < steps.length - 1 ? (
                    <CustomButton
                      type="button"
                      icon={<ArrowRightIcon className="w-4 h-4" />}
                      className="rounded-full px-6 py-5 text-white"
                      onClick={async () => {
                        const errs = await validateForm();
                        const stepFields: Record<number, string[]> = {
                          0: ["name", "email"],
                          1: ["preferedLocation", "preferedCategories"],
                        };
                        const hasErr = stepFields[currentStep]?.some((f) => (errs as any)[f]);
                        stepFields[currentStep]?.forEach((f) => setFieldTouched(f, true));
                        if (!hasErr) setCurrentStep((s) => s + 1);
                      }}
                    >
                      Continue
                    </CustomButton>
                  ) : (
                    <CustomButton
                      type="submit"
                      icon={<SendIcon className="w-4 h-4" />}
                      className="rounded-full px-6 py-5 text-white"
                      isLoading={isSubmitting}
                    >
                      Create account
                    </CustomButton>
                  )}
                </div>
              </Form>
            )}
          </Formik>
        </div>
      </div>
    </div>
  );
}
