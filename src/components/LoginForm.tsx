"use client";

import { Formik, Form } from "formik";
import CustomInput from "./CustomInput";
import Link from "next/link";
import CustomButton from "./Button";
import * as Yup from "yup";
import { useTransition } from "react";
import { ResponseData, UserType } from "@/app/types";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useQueryState } from "nuqs";
import Logo from "./Logo";

const initialValues = { email: "", password: "" };

const validationSchema = Yup.object().shape({
  email: Yup.string().email("Invalid email address").required("Email is required"),
  password: Yup.string().min(8, "Password must be at least 8 characters long").required("Password is required"),
});

interface LoginFormProps {
  loginAction: (email: string, password: string) => Promise<ResponseData<UserType | null>>;
}

export default function LoginForm({ loginAction }: LoginFormProps) {
  const [_, startTransition] = useTransition();
  const [redirect] = useQueryState("redirect");
  const router = useRouter();

  const handleSubmit = (
    values: typeof initialValues,
    { setSubmitting }: { setSubmitting: (value: boolean) => void }
  ) => {
    startTransition(async () => {
      const { success, message, data } = await loginAction(values.email, values.password);
      if (!success) {
        toast.error("Login failed", { description: message });
        setSubmitting(false);
        return;
      }

      // Confirm before navigating. The Toaster lives in the root layout, so the
      // message survives the route change and lands on the page they arrive at
      // — otherwise a successful sign-in is silent and reads as a page that
      // simply moved on its own.
      const firstName = data?.name?.trim().split(/\s+/)[0];
      toast.success(firstName ? `Welcome back, ${firstName}` : "Welcome back", {
        description: "You're signed in.",
      });
      router.push(redirect || "/app");
    });
  };

  return (
    <div className="flex min-h-screen bg-canvas">
      {/* Left brand panel */}
      <div className="hidden lg:flex lg:w-1/2 p-3">
        <div className="forest-panel w-full rounded-[2rem] flex flex-col justify-between p-12 relative overflow-hidden">
          <div className="relative z-10">
            <span className="text-white text-2xl font-bold tracking-tight">Givny</span>
          </div>

          <div className="relative z-10 space-y-6">
            <h2 className="text-5xl font-bold text-white leading-[1.05] tracking-tight">
              Welcome back.<br /><span className="text-lime">Ready to give?</span>
            </h2>
            <p className="text-white/60 text-lg leading-relaxed max-w-sm">
              Every item shared is a story of generosity. Sign in to continue making a difference in your community.
            </p>

            <div className="flex flex-col gap-4 pt-4">
              {[
                "1,200+ things given a second life",
                "800+ neighbours passing things on",
                "100% free — always",
              ].map((stat) => (
                <div key={stat} className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-lime flex-shrink-0 flex items-center justify-center">
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                      <path d="M1 4l2.5 2.5L9 1" stroke="#0C3B2E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <span className="text-white/80 text-sm">{stat}</span>
                </div>
              ))}
            </div>
          </div>

          <p className="text-white/30 text-xs relative z-10">
            © {new Date().getFullYear()} Givny. All rights reserved.
          </p>
        </div>
      </div>

      {/* Right form panel */}
      <div className="w-full lg:w-1/2 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-[420px]">
          {/* Mobile logo */}
          <div className="lg:hidden mb-8 flex justify-center">
            <Logo />
          </div>

          <div className="space-y-1 mb-8">
            <p className="text-xs font-bold tracking-[0.2em] uppercase text-primary mb-2">Sign in</p>
            <h1 className="text-3xl md:text-4xl font-bold text-ink tracking-tight">Good to see you again</h1>
            <p className="text-gray-500 pt-1">Enter your credentials to continue</p>
          </div>

          <Formik initialValues={initialValues} onSubmit={handleSubmit} validationSchema={validationSchema}>
            {({ values, handleChange, handleSubmit, errors, touched, isSubmitting, isValid }) => (
              <Form onSubmit={handleSubmit} className="flex flex-col gap-y-4">
                <CustomInput
                  containerClassName="bg-white border border-gray-200/80 rounded-2xl"
                  className="border-none bg-transparent"
                  label="Email Address"
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  name="email"
                  onChange={handleChange}
                  error={touched.email && errors.email ? errors.email : undefined}
                  value={values.email}
                  disabled={isSubmitting}
                />
                <CustomInput
                  containerClassName="bg-white border border-gray-200/80 rounded-2xl"
                  className="border-none bg-transparent"
                  label="Password"
                  id="password"
                  type="password"
                  placeholder="Min. 8 characters"
                  name="password"
                  onChange={handleChange}
                  value={values.password}
                  error={touched.password && errors.password ? errors.password : undefined}
                  disabled={isSubmitting}
                />

                <div className="flex justify-end -mt-1">
                  <Link href="/contact" className="text-primary text-sm font-medium hover:underline underline-offset-4">
                    Forgot password?
                  </Link>
                </div>

                <CustomButton
                  isLoading={isSubmitting}
                  disabled={!isValid}
                  type="submit"
                  className="w-full mt-2 text-white py-6 rounded-full text-base !bg-forest hover:!bg-forest-dark"
                >
                  Sign in
                </CustomButton>

                <p className="text-center text-gray-500 text-sm mt-2">
                  Don&apos;t have an account?{" "}
                  <Link href="/auth/register" className="text-primary font-medium hover:underline underline-offset-4">
                    Create one free
                  </Link>
                </p>
              </Form>
            )}
          </Formik>
        </div>
      </div>
    </div>
  );
}
