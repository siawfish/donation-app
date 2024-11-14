import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
  } from "@/components/ui/alert-dialog"
import { Form, Formik } from "formik";
import CustomButton from "./Button";
import CustomInput from "./CustomInput";
import * as Yup from "yup";
import { ArrowRightIcon } from "lucide-react";

const initialValues = {
    password: "",
    confirmPassword: ""
}

const validationSchema = Yup.object({
    password: Yup.string().min(8, "Password must be at least 8 characters long").required("Password is required"),
    confirmPassword: Yup.string().oneOf([Yup.ref("password")], "Passwords do not match").required("Confirm Password is required")
})
  
interface SetPasswordProps {
    onSubmit: (value: string) => void;
    open: boolean;
    setOpen: (value: boolean) => void;
}

export function SetPassword({
    onSubmit,
    open,
    setOpen
}: SetPasswordProps) {
    const handleSubmit = (values: typeof initialValues) => {
        onSubmit(values.password);
    }
    return (
        <AlertDialog open={open} onOpenChange={setOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle className="text-2xl">Create a password</AlertDialogTitle>
                    <div className="flex flex-col gap-4">
                        <AlertDialogDescription className="max-w-[350px] font-base font-cabinetLight leading-tight">
                            Please create a password to continue. Password must be at least 8 characters long.
                        </AlertDialogDescription>
                        <Formik
                            initialValues={initialValues}
                            validationSchema={validationSchema}
                            onSubmit={handleSubmit}
                        >
                            {
                                ({values, handleChange, handleSubmit, errors, touched, handleBlur}) => (
                                    <Form className="flex flex-col gap-4" onSubmit={handleSubmit}>
                                        <CustomInput
                                            label="Password"
                                            name="password"
                                            type="password"
                                            placeholder="Password"
                                            value={values.password}
                                            containerClassName="pt-0 px-0"
                                            onChange={handleChange}
                                            error={touched.password && errors.password ? errors.password : ""}
                                            onBlur={handleBlur}
                                        />
                                        <CustomInput
                                            label="Confirm Password"
                                            name="confirmPassword"
                                            type="password"
                                            containerClassName="pt-0 px-0"
                                            placeholder="Confirm Password"
                                            value={values.confirmPassword}
                                            onChange={handleChange}
                                            error={touched.confirmPassword && errors.confirmPassword ? errors.confirmPassword : ""}
                                            onBlur={handleBlur}
                                        />
                                        <div className="flex justify-end gap-4">
                                            <CustomButton 
                                                type="button" 
                                                variant="outline"
                                                onClick={() => setOpen(false)}
                                                className="w-[150px] rounded-full"
                                            >
                                                Cancel
                                            </CustomButton>
                                            <CustomButton 
                                                type="submit" 
                                                className="w-[150px] rounded-full"
                                                icon={<ArrowRightIcon className="w-4 h-4" />}
                                                iconPosition="right"
                                            >
                                                Continue
                                            </CustomButton>
                                        </div>
                                    </Form>
                                )
                            }
                        </Formik>
                    </div>
                </AlertDialogHeader>
            </AlertDialogContent>
        </AlertDialog>
    )
}