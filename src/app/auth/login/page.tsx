import CustomButton from "@/components/Button";
import CustomInput from "@/components/CustomInput";
import Logo from "@/components/Logo";
import Link from "next/link";
import React from "react";

export default function Login() {
    return (
        <div className="bg-secondary">
            <div className="container mx-auto">
                <div className="flex flex-col justify-center items-center min-h-screen gap-y-6 w-full px-4 lg:px-8">
                    <Logo />
                    <div className="w-full max-w-[500px] bg-white p-4 lg:p-6 rounded-lg shadow-lg">
                        <div className="space-y-1">
                            <h1 className="text-2xl font-bold">Login</h1>
                            <p className="text-muted-foreground">Sign in to your account to continue</p>
                        </div>
                        <div className="mt-6 flex flex-col gap-y-4">
                            <CustomInput containerClassName="bg-primary-foreground border-none" className="border-none" label="Email Address" id="email" type="email" placeholder="Enter your email" />
                            <CustomInput containerClassName="bg-primary-foreground border-none" className="border-none" label="Password" id="password" type="password" placeholder="Enter your password" />
                        </div>
                        <div className="flex flex-row justify-end mt-2">
                            <Link href="/auth/register" className="text-primary text-sm font-medium hover:underline underline-offset-4">Forgot password?</Link>
                        </div>
                        <CustomButton className="w-full mt-4 text-white py-6 rounded-full">Submit</CustomButton>
                        <div className="flex flex-row justify-center mt-4">
                            <p className="text-muted-foreground font-cabinet">Don&apos;t have an account? <Link href="/auth/register/user" className="text-primary font-medium hover:underline underline-offset-4">Sign up</Link></p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}