"use client";

import CustomInput from "./CustomInput"
import CustomTextarea from "./CustomTextarea";
import { ContactFormData, ContactServiceType } from "@/app/contact/types";
import * as Yup from "yup";
import { Form, Formik, FormikHelpers } from "formik";
import ContactService from "./ContactService";
import { useTransition } from "react";
import { ResponseData } from "@/app/types";
import { toast } from "sonner";
const initialFormData: ContactFormData = {
  name: "",
  email: "",
  phoneNumber: "",
  message: "",
  service: ContactServiceType.Support,
};

const validationSchema = Yup.object().shape({
  name: Yup.string().required("Name is required"),
  email: Yup.string().email("Invalid email").required("Email is required"),
  phoneNumber: Yup.string().required("Phone number is required"),
  message: Yup.string().required("Message is required"),
  service: Yup.string().required("Service is required"),
});

export default function ContactForm({
  onSubmit
}: {
  onSubmit: (payload: ContactFormData) => Promise<ResponseData<string | null>>;
}) {
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (values: ContactFormData, { resetForm, setSubmitting }: FormikHelpers<ContactFormData>) => {
    if (isPending) return;
    startTransition(async () => {
      const response = await onSubmit(values);
      if (response.success) {
        toast.success(response.message);
        resetForm();
        setSubmitting(false);
      } else {
        toast.error(response.message);
        setSubmitting(false);
      }
    });
  };

  return (
    <Formik
      initialValues={initialFormData}
      validationSchema={validationSchema}
      onSubmit={handleSubmit}
    >
      {
        ({ values, errors, handleChange, handleBlur, handleSubmit, isSubmitting, touched }) => (
          <Form className="max-w-2xl mx-auto space-y-2">
            <ContactService serviceId={values.service} onServiceChange={(serviceId) => handleChange("service")(serviceId)} />

            {/* Contact Form */}
            <div className="space-y-2">
              <CustomInput
                  type="text"
                  placeholder="Enter your name"
                  label="Name"
                  containerClassName="p-0"
                  name="name"
                  value={values.name}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  error={touched.name ? errors.name : ""}
                  disabled={isSubmitting || isPending}
              />
              <CustomInput
                  type="email"
                  placeholder="Enter your email"
                  label="Email"
                  containerClassName="p-0"
                  name="email"
                  value={values.email}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  error={touched.email ? errors.email : ""}
                  disabled={isSubmitting || isPending}
              />
              <CustomInput
                  type="tel"
                  placeholder="Enter your phone number"
                  label="Phone Number"
                  containerClassName="p-0"
                  name="phoneNumber"
                  value={values.phoneNumber}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  error={touched.phoneNumber ? errors.phoneNumber : ""}
                  disabled={isSubmitting || isPending}
              />
              <CustomTextarea
                  label="Message"
                  name="message"
                  containerClassName="p-0"
                  value={values.message}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  error={touched.message ? errors.message : ""}
                  disabled={isSubmitting || isPending}
              />
              <button 
                type="submit" 
                disabled={isSubmitting || isPending}
                className="w-full bg-primary text-white py-3 rounded-lg hover:bg-primary/90 transition-colors"
              >
                {(isSubmitting || isPending)? "Sending..." : "Send Message"}
              </button>
            </div>
          </Form>
        )
      }
    </Formik>
  );
} 