import LoginForm from "@/components/LoginForm";
import React from "react";
import { loginAction } from "../actions/login";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Login",
  description: "Login to your account",
};

export default function Login() {
    return (
        <div className="bg-secondary">
            <div className="container mx-auto">
                <LoginForm loginAction={loginAction} />
            </div>
        </div>
    )
}