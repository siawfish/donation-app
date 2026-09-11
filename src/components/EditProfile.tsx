'use client';

import { useQueryState } from 'nuqs'
import React, { useCallback, useEffect, useState, useTransition } from 'react'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { useAuth } from '@/firebase/auth/AuthContext';
import { SaveIcon, UserCog, Trash2 } from 'lucide-react';
import CustomButton from './Button';
import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';
import CustomInput from './CustomInput';
import { ActivityAction, UserType } from '@/app/types';
import { getDownloadURL, ref, uploadBytesResumable } from "firebase/storage";
import { storage } from "@/firebase/auth/firebase";
import { toast } from 'sonner';
import { updateUserProfile } from '@/app/app/actions/user';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import ImageCropDialog from './ImageCropDialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { firestore } from "@/firebase/auth/firebase"
import { collection, doc, getDoc } from 'firebase/firestore';
import { recordActivity } from '@/app/app/actions/activities';
import { useRouter } from 'next/navigation';

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
    const [initialValues, setInitialValues] = useState<UserType>({} as UserType)
    const isOpen = action === "edit_profile"
    const { user } = useAuth()
    const [_, startTransition] = useTransition()
    const router = useRouter()
    const fetchUser = useCallback(async function fetchUser() {
        if (!user?.uid) return
        // fetch user from firestore
        const userRef = doc(collection(firestore, 'users'), user?.uid)
        const userDoc = await getDoc(userRef)
        if (userDoc.exists()) {
            setInitialValues(userDoc.data() as UserType)
        }
    }, [user])

    useEffect(() => {
        if(!isOpen) return
        fetchUser()
    }, [fetchUser, isOpen])

    // A picked file goes through the cropper before it ever reaches Storage —
    // this holds the object URL feeding that dialog while it's open.
    const [pendingImageSrc, setPendingImageSrc] = useState<string | null>(null)

    const closeCropDialog = useCallback(() => {
        if (pendingImageSrc) URL.revokeObjectURL(pendingImageSrc)
        setPendingImageSrc(null)
    }, [pendingImageSrc])

    const handleImageUpload = async (file: Blob, setFieldValue: (field: string, value: any) => void) => {
        if (!file) return;

        try {
            // A fixed path per user rather than the original filename: every
            // crop overwrites the last one instead of leaving old avatars
            // behind in Storage.
            const storageRef = ref(storage, `profiles/${user?.uid}/avatar.jpg`);
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

    const handleSubmit = async (values: Partial<UserType>) => {
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
                    validationSchema={userValidationSchema}
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
                                            <SheetTitle className="text-xl font-semibold mb-0">Edit Profile</SheetTitle>
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
                                    <div className="flex items-center gap-3">
                                        <Label htmlFor="picture" className="cursor-pointer text-primary hover:underline text-sm">
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
                                                    // Open the cropper rather than uploading straight away — the
                                                    // input is reset so picking the same file twice still fires onChange.
                                                    setPendingImageSrc(URL.createObjectURL(file));
                                                }
                                                e.target.value = "";
                                            }}
                                        />
                                        {values.profileUrl && (
                                            <button
                                                type="button"
                                                onClick={() => setFieldValue('profileUrl', '')}
                                                className="flex items-center gap-1 text-sm text-red-500 hover:underline"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                                Remove
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <ImageCropDialog
                                    imageSrc={pendingImageSrc}
                                    onClose={closeCropDialog}
                                    onCropped={(blob) => {
                                        closeCropDialog();
                                        handleImageUpload(blob, setFieldValue);
                                    }}
                                />
                                <div className="space-y-4">
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

                                    {/* State and ZIP are gone: Ghana has regions
                                        rather than states and no postcode system
                                        that anybody writes on an address, so both
                                        boxes were only ever left blank. */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <Field
                                            as={CustomInput}
                                            id="city"
                                            name="city"
                                            label="City or town"
                                            placeholder="Accra"
                                            error={touched.city && errors.city}
                                        />

                                        <Field
                                            as={CustomInput}
                                            id="country"
                                            name="country"
                                            label="Country"
                                            placeholder="Ghana"
                                            error={touched.country && errors.country}
                                        />
                                    </div>
                                </div>
                                <div className="sticky bottom-0 px-4 bg-white py-6 flex justify-between md:justify-end gap-2">
                                    <CustomButton 
                                        type="button"
                                        variant="outline" 
                                        className="flex-1 sm:flex-none sm:w-[180px] border-forest !text-forest rounded-full hover:bg-transparent py-6"
                                        onClick={() => {
                                            setAction(null)
                                            router.refresh()
                                        }}
                                        disabled={isSubmitting || _}
                                    >
                                        Cancel
                                    </CustomButton>
                                    <CustomButton 
                                        type="submit"
                                        variant="default" 
                                        isLoading={isSubmitting || _}
                                        onClick={() => handleSubmit(values)}
                                        className="flex-1 sm:flex-none sm:w-[180px] rounded-full py-6 !bg-forest hover:!bg-forest-dark"
                                        disabled={isSubmitting || _}
                                        icon={<SaveIcon className="w-4 h-4" />}
                                    >
                                        {isSubmitting || _ ? 'Saving...' : 'Save'}
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