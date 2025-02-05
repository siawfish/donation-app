import { ContactFormData } from "@/app/contact/types";
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: 587,
    secure: false, // true for port 465, false for other ports
    auth: {
        user: process.env.EMAIL,
        pass: process.env.EMAIL_PASSWORD,
    },
});

const mailOptions = {
    from: process.env.EMAIL,
    to: 'support@givny.com',
    subject: 'Contact Form Submission',
    text: ``,
};

const sendEmail = async (payload: ContactFormData): Promise<{
    success: boolean;
    message: string;
}> => {
    try {
        const data = {
            ...mailOptions,
            text: `Name: ${payload.name}\nEmail: ${payload.email}\nPhone Number: ${payload.phoneNumber}\nMessage: ${payload.message}`,
        };
        const info = await transporter.sendMail(data);
        return {
            success: true,
            message: info.response,
        };
    } catch (error: any) {
        console.log(error);
        return {
            success: false,
            message: error.message,
        };
    }
};

export default sendEmail;