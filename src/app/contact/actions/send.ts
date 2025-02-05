"use server";

import { ResponseData } from "@/app/types";
import { FirebaseErrors } from "@/firebase/errors";
import { ContactFormData } from "../types";
import sendEmail from "@/nodemailer";

export async function sendContactForm(payload: ContactFormData): Promise<ResponseData<string | null>> {
    try {
        if (!payload.name || !payload.email || !payload.phoneNumber || !payload.message) {
            throw new Error('Missing required fields');
        }
        const response = await sendEmail(payload);
        if (!response.success) {
            throw new Error(response.message);
        }
        return {
            success: true,
            message: response.message,
            data: null
        }
    } catch (error: any) {
        const message = FirebaseErrors[error.code] || error.message;
        return {
            success: false,
            message: message,
            data: null
        }
    }
}
