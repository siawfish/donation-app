'use client';

import { useQueryState } from 'nuqs'
import React, { useCallback, useEffect, useState, useTransition } from 'react'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { useAuth } from '@/firebase/auth/AuthContext';
import { SaveIcon, UserCog } from 'lucide-react';
import CustomButton from './Button';
import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';
import CustomInput from './CustomInput';
import { AccountTypes, ActivityAction, DonorType, UserType, UserTypes } from '@/app/types';
import { Tabs, TabsList, TabsTrigger } from './ui/tabs';
import { getDownloadURL, ref, uploadBytesResumable } from "firebase/storage";
import { storage } from "@/firebase/auth/firebase";
import { toast } from 'sonner';
import { updateUserProfile } from '@/app/app/actions/user';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { firestore } from "@/firebase/auth/firebase"
import { collection, doc, getDoc } from 'firebase/firestore';
import { recordActivity } from '@/app/app/actions/activities';

const donorValidationSchema = Yup.object().shape({
    name: Yup.string()
        .min(2, 'Name is too short')
        .max(50, 'Name is too long')
        .required('Name is required'),
    phone: Yup.string()
        .matches(/^[0-9+\-\s()]*$/, 'Invalid phone number')
        .required('Phone number is required'),
    address: Yup.string()
        .max(100, 'Address is too long'),
    city: Yup.string()
        .max(50, 'City is too long'),
    state: Yup.string()
        .max(50, 'State is too long'),
    zip: Yup.string()
        .max(10, 'ZIP code is too long'),
    country: Yup.string()
        .max(50, 'Country is too long'),
});

const userValidationSchema = Yup.object().shape({
    ...donorValidationSchema.fields,
    preferedCategories: Yup.array().of(Yup.string()).min(1, 'Select at least one category'),
    preferedLocation: Yup.string().required('Location is required'),
});

export default function EditProfile() {
    const [action, setAction] = useQueryState('action')
    const [initialValues, setInitialValues] = useState<DonorType | UserType>({} as DonorType | UserType)
    const isOpen = action === "edit_profile"
    const { user } = useAuth()
    const [_, startTransition] = useTransition()

    const fetchUser = useCallback(async function fetchUser() {
        if (!user?.uid) return
        // fetch user from firestore
        const userRef = doc(collection(firestore, 'users'), user?.uid)
        const userDoc = await getDoc(userRef)
        if (userDoc.exists()) {
            setInitialValues(userDoc.data() as DonorType | UserType)
        }
    }, [user])

    useEffect(() => {
        fetchUser()
    }, [fetchUser])

    const handleImageUpload = async (file: File, setFieldValue: (field: string, value: any) => void) => {
        if (!file) return;
        
        try {
            const storageRef = ref(storage, `profiles/${user?.uid}/${file.name}`);
            const uploadTask = uploadBytesResumable(storageRef, file);

            uploadTask.on('state_changed',
                (snapshot) => {
                    const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    toast.loading(`Upload is ${progress}% done`, { id: 'upload' });
                },
                (error) => {
                    toast.error('Error uploading image', { id: 'upload' });
                    console.error('Upload error:', error);
                },
                async () => {
                    const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                    setFieldValue('profileUrl', downloadURL);
                    toast.success('Image uploaded successfully', { id: 'upload' });
                }
            );
        } catch (error) {
            toast.error('Error uploading image');
            console.error('Upload error:', error);
        }
    };

    const handleSubmit = async (values: Partial<DonorType | UserType>) => {
        if (!user?.uid || _) return
        await startTransition(async () => {
            try {
                toast.loading('Updating profile...', { id: 'update' });
                let data = {
                    ...initialValues,
                    ...values
                }
                await Promise.allSettled([updateUserProfile(data), recordActivity({
                    recipientId: user?.uid,
                    action: ActivityAction.ACCOUNT_UPDATED
                })]);
                toast.success('Profile updated successfully', { id: 'update' });
            } catch (error) {
                toast.error('Error updating profile', { id: 'update' });
                console.error('Error updating profile:', error);
            }
        })
        fetchUser()
    }

    const onOpenChange = (open: boolean) => {
        if (!open) {
            setAction(null)
        }
    }

    return (
        <Sheet open={isOpen} onOpenChange={onOpenChange}>
            <SheetContent className="min-w-[100vw] lg:min-w-[600px] px-0 bg-secondary overflow-y-auto">
                <Formik
                    initialValues={initialValues}
                    validationSchema={initialValues.userType === UserTypes.DONOR ? donorValidationSchema : userValidationSchema}
                    onSubmit={handleSubmit}
                    enableReinitialize
                >
                    {({ errors, touched, isSubmitting, values, setFieldValue }) => (
                        <Form className="h-full relative">
                            <div className="mt-6 px-6 space-y-6 pb-6">
                                <div className="flex flex-col gap-1">
                                    <div className="flex gap-2">
                                        <span className="bg-primary-foreground text-primary rounded-md p-2 h-fit mt-1">
                                            <UserCog className="w-4 h-4" />
                                        </span>
                                        <div className="flex flex-col">
                                            <h2 className="text-xl font-semibold mb-0">Edit Profile</h2>
                                            <p className="text-muted-foreground mb-0">
                                                Update your profile information here.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex flex-col items-center gap-4">
                                    <Avatar className="w-24 h-24">
                                        <AvatarImage src={values.profileUrl} />
                                        <AvatarFallback className="bg-primary-foreground text-primary">{values.name?.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex flex-col items-center gap-2">
                                        <Label htmlFor="picture" className="cursor-pointer text-primary hover:underline">
                                            Change Picture
                                        </Label>
                                        <Input
                                            id="picture"
                                            type="file"
                                            accept="image/*"
                                            name="profileUrl"
                                            className="hidden"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                    handleImageUpload(file, setFieldValue);
                                                }
                                            }}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <Tabs defaultValue={values.type} onValueChange={(value) => setFieldValue('type', value)}>
                                        <div className="flex items-center space-x-4">
                                            <TabsList className="p-0">
                                                {
                                                    Object.values(AccountTypes).map((accountType) => (
                                                        <TabsTrigger className="capitalize" key={accountType} value={accountType}>{accountType}</TabsTrigger>
                                                    ))
                                                }
                                            </TabsList>
                                        </div>
                                    </Tabs>
                                    <Field
                                        as={CustomInput}
                                        id="name"
                                        name="name"
                                        label="Name"
                                        placeholder="Your name"
                                        error={touched.name && errors.name}
                                    />

                                    <Field
                                        as={CustomInput}
                                        id="phone"
                                        name="phone"
                                        label="Phone"
                                        placeholder="Your phone number"
                                        error={touched.phone && errors.phone}
                                    />

                                    <Field
                                        as={CustomInput}
                                        id="address"
                                        name="address"
                                        label="Address"
                                        placeholder="Your address"
                                        error={touched.address && errors.address}
                                    />

                                    <div className="grid grid-cols-2 gap-4">
                                        <Field
                                            as={CustomInput}
                                            id="city"
                                            name="city"
                                            label="City"
                                            placeholder="City"
                                            error={touched.city && errors.city}
                                        />

                                        <Field
                                            as={CustomInput}
                                            id="state"
                                            name="state"
                                            label="State"
                                            placeholder="State"
                                            error={touched.state && errors.state}
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <Field
                                            as={CustomInput}
                                            id="zip"
                                            name="zip"
                                            label="ZIP Code"
                                            placeholder="ZIP Code"
                                            error={touched.zip && errors.zip}
                                        />

                                        <Field
                                            as={CustomInput}
                                            id="country"
                                            name="country"
                                            label="Country"
                                            placeholder="Country"
                                            error={touched.country && errors.country}
                                        />
                                    </div>
                                </div>
                                <div className="sticky bottom-0 px-4 bg-white py-6 flex justify-between md:justify-end gap-2">
                                    <CustomButton 
                                        type="button"
                                        variant="outline" 
                                        className="w-[180px] border-primary !text-primary rounded-full hover:bg-transparent py-6"
                                        onClick={() => setAction(null)}
                                        disabled={isSubmitting}
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
                                        {isSubmitting ? 'Saving...' : 'Save'}
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