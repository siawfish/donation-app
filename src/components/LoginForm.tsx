"use client";

import { Formik, Form } from "formik";
import Logo from "./Logo";
import CustomInput from "./CustomInput";
import Link from "next/link";
import CustomButton from "./Button";
import * as Yup from "yup";
import { useTransition } from "react";
import { ResponseData, UserType } from "@/app/types";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useQueryState } from "nuqs";

const initialValues = {
    email: "",
    password: ""
}

const validationSchema = Yup.object().shape({
    email: Yup.string().email("Invalid email address").required("Email is required"),
    password: Yup.string().min(8, "Password must be at least 8 characters long").required("Password is required"),
})

interface LoginFormProps {
    loginAction: (email: string, password: string) => Promise<ResponseData<UserType | null>>;
}

export default function LoginForm({loginAction}: LoginFormProps) {
    const [_, startTransition] = useTransition();
    const [redirect] = useQueryState("redirect");
    const router = useRouter();

    const handleSubmit = (values: typeof initialValues, {setSubmitting}: {setSubmitting: (value: boolean) => void}) => {
        startTransition(async () => {
            const {success, message, data} = await loginAction(values.email, values.password);
            if (!success) {
                toast.error("Login failed", {description: message});
                setSubmitting(false);
                return;
            }
            router.push(redirect || "/app");
        });
    }

    return (
        <Formik initialValues={initialValues} onSubmit={handleSubmit} validationSchema={validationSchema}>
            {
                ({values, handleChange, handleSubmit, errors, touched, isSubmitting, isValid}) => (
                    <Form onSubmit={handleSubmit}>
                        <div className="flex flex-col justify-center items-center min-h-screen gap-y-6 w-full px-4 lg:px-8">
                            <Logo />
                            <div className="w-full max-w-[500px]">
                                <div className="space-y-1">
                                    <h1 className="text-2xl font-bold">Login</h1>
                                    <p className="text-muted-foreground">Sign in to your account to continue</p>
                                </div>
                                <div className="mt-6 flex flex-col gap-y-4">
                                    <CustomInput
                                        containerClassName="bg-primary-foreground border-none"
                                        className="border-none"
                                        label="Email Address"
                                        id="email"
                                        type="email"
                                        placeholder="Enter your email"
                                        name="email"
                                        onChange={handleChange}
                                        error={touched.email && errors.email ? errors.email : undefined}
                                        value={values.email}
                                        disabled={isSubmitting}
                                    />
                                    <CustomInput 
                                        containerClassName="bg-primary-foreground border-none" 
                                        className="border-none" 
                                        label="Password" 
                                        id="password" 
                                        type="password" 
                                        placeholder="Enter your password" 
                                        name="password" 
                                        onChange={handleChange} 
                                        value={values.password} 
                                        error={touched.password && errors.password ? errors.password : undefined}
                                        disabled={isSubmitting}
                                    />
                                </div>
                                <div className="flex flex-row justify-end mt-2">
                                    <Link 
                                        href="#" 
                                        className="text-primary text-sm font-medium hover:underline underline-offset-4"
                                    >
                                        Forgot password?
                                    </Link>
                                </div>
                                <CustomButton 
                                    isLoading={isSubmitting}
                                    disabled={!isValid}
                                    type="submit"
                                    className="w-full mt-4 text-white py-6 rounded-full"
                                >
                                    Submit
                                </CustomButton>
                                <div className="flex flex-row justify-center mt-4">
                                    <p className="text-muted-foreground font-cabinet">Don&apos;t have an account? <Link href="/auth/register" className="text-primary font-medium hover:underline underline-offset-4">Sign up</Link></p>
                                </div>
                            </div>
                        </div>
                    </Form>
                )
            }
        </Formik>
    )
}