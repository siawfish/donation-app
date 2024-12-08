'use client';

import { useQueryState } from 'nuqs'
import React from 'react'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { useAuth } from '@/firebase/auth/AuthContext';
import { Edit2Icon, EditIcon, HandIcon, SaveIcon } from 'lucide-react';
import CustomButton from './Button';
import { MessageCircleIcon } from 'lucide-react';
import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';
import CustomInput from './CustomInput';
import { Label } from './ui/label';
import { AccountTypes, DonorType, UserTypes } from '@/app/types';
import { Tabs, TabsList, TabsTrigger } from './ui/tabs';

const validationSchema = Yup.object().shape({
    password: Yup.string()
        .min(8, 'Password is too short')
        .max(50, 'Password is too long')
        .required('Password is required'),
    confirmPassword: Yup.string()
        .oneOf([Yup.ref('password')], 'Passwords do not match')
        .required('Confirm password is required'),
});

export default function ChangePassword() {
    const [action, setAction] = useQueryState('action')
    const isOpen = action === "change_password"
    const { user } = useAuth()

    const initialValues = {
        password: '',
        confirmPassword: '',
    }

    const handleSubmit = async (values: { password: string, confirmPassword: string }) => {
        try {
            // TODO: Implement update profile logic
            console.log('Form values:', values);
            setAction(null);
        } catch (error) {
            console.error('Error updating profile:', error);
        }
    }

    const onOpenChange = (open: boolean) => {
        if (!open) {
            setAction(null)
        }
    }

    return (
        <Sheet open={isOpen} onOpenChange={onOpenChange}>
            <SheetContent className="min-w-[100vw] lg:min-w-[600px] px-0 bg-secondary">
                <Formik
                    initialValues={initialValues}
                    validationSchema={validationSchema}
                    onSubmit={handleSubmit}
                >
                    {({ errors, touched, isSubmitting, values, setFieldValue }) => (
                        <Form className="h-full relative">
                            <div className="mt-6 px-6 space-y-6">
                                <div className="flex flex-col gap-1">
                                    <div className="flex gap-2">
                                        <span className="bg-primary-foreground text-primary rounded-md p-2 h-fit mt-1">
                                            <EditIcon className="w-4 h-4" />
                                        </span>
                                        <div className="flex flex-col">
                                            <h2 className="text-xl font-semibold mb-0">Change Password</h2>
                                            <p className="text-muted-foreground mb-0">
                                                Update your password here.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <Field
                                        as={CustomInput}
                                        id="password"
                                        name="password"
                                        label="Password"
                                        placeholder="Your password"
                                        error={touched.password && errors.password}
                                    />

                                    <Field
                                        as={CustomInput}
                                        id="confirmPassword"
                                        name="confirmPassword"
                                        label="Confirm Password"
                                        placeholder="Your confirm password"
                                        error={touched.confirmPassword && errors.confirmPassword}
                                    />
                                </div>
                                <div className="absolute bottom-0 left-0 right-0 px-4 bg-white py-6 flex justify-between md:justify-end gap-2">
                                    <CustomButton 
                                        type="button"
                                        variant="outline" 
                                        className="w-[180px] border-primary !text-primary rounded-full hover:bg-transparent py-6"
                                        onClick={() => setAction(null)}
                                    >
                                        Cancel
                                    </CustomButton>
                                    <CustomButton 
                                        type="submit"
                                        variant="default" 
                                        className="w-[180px] rounded-full py-6"
                                        disabled={isSubmitting}
                                        icon={<SaveIcon className="w-4 h-4" />}
                                    >
                                        Save
                                    </CustomButton>
                                </div>
                            </div>
                        </Form>
                    )}
                </Formik>
            </SheetContent>
        </Sheet>
    )
}