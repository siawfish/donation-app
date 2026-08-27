import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";

export const metadata: Metadata = {
    title: "Reset your password — Givny",
    description: "Send yourself a link to set a new Givny password.",
    robots: { index: false, follow: true },
};

export default function ForgotPasswordPage() {
    return <ForgotPasswordForm />;
}
