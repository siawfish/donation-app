'use client'

import { useState, useTransition } from 'react'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import CustomInput from './CustomInput'
import { Progress } from "@/components/ui/progress"
import CustomButton from './Button'
import { ArrowRightIcon, SendIcon } from 'lucide-react'
import MultiSelectInput from './MultiSelectInput'
import { Form, Formik } from 'formik'
import { CategoryType, ResponseData, UserRegisterPayload, UserType } from '@/app/types'
import * as yup from 'yup'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

const steps = [
  { title: 'Basic Information', description: 'Enter your personal information' },
  { title: 'Preferred Categories & Location', description: 'Select prefered categories and locations you would like to be notified about' },
  { title: 'Set Password', description: 'Set a password to secure your account' },
]

const initialValues = {
    name: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    zip: "",
    country: "",
    preferedLocation: "",
    preferedCategories: [],
    password: "",
    confirmPassword: ""
}

const validationSchema = yup.object().shape({
    name: yup.string().min(1, "Name is required").required("Name is required"),
    email: yup.string().email("Invalid email address").required("Email is required"),
    phone: yup.number().lessThan(10000000000, "Phone number must be 10 digits").required("Phone number is required"),
    address: yup.string().min(1, "Address is required").required("Address is required"),
    city: yup.string().min(1, "City is required").required("City is required"),
    state: yup.string().min(1, "State is required").required("State is required"),
    zip: yup.string().min(1, "Zip code is required").required("Zip code is required"),
    country: yup.string().min(1, "Country is required").required("Country is required"),
    preferedCategories: yup.array(yup.string()).required("At least one category is required"),
    preferedLocation: yup.string().min(1, "Location is required").required("Location is required"),
    password: yup.string().min(8, "Password must be at least 8 characters long").required("Password is required"),
    confirmPassword: yup.string().oneOf([yup.ref('password')], "Passwords do not match").required("Confirm password is required"),
})

export default function RegisterPage({
    categories,
    registerUserAction
}: {
    categories: CategoryType[];
    registerUserAction: (payload: UserRegisterPayload) => Promise<ResponseData<UserType | null>>
}) {

    const [currentStep, setCurrentStep] = useState(1)
    const [_, startTransaction] = useTransition()
    const router = useRouter();

    const handleNext = () => {
        if (currentStep < steps.length) setCurrentStep(currentStep + 1)
    }

    const handlePrevious = () => {
        if (currentStep > 1) setCurrentStep(currentStep - 1)
    }

    const handleSubmit = (values: typeof initialValues, { setSubmitting }: { setSubmitting: (isSubmitting: boolean) => void }) => {
        startTransaction(async () => {
            const payload: UserRegisterPayload = {
                name: values.name,
                email: values.email,
                phone: values.phone,
                address: values.address,
                city: values.city,
                state: values.state,
                zip: values.zip,
                country: values.country,
                preferedLocation: values.preferedLocation,
                preferedCategories: values.preferedCategories,
                password: values.password,
                id: "",
                lastLogin: "",
                createdAt: "",
                updatedAt: "",
            }
            const { success, message} = await registerUserAction(payload);
            if (!success) {
                toast.error("Failed to register user", {description: message});
            } else {
                router.push("/app");
                toast.success("User registered successfully", {description: "You can proceed to login"});
            }
            setSubmitting(false);
        })
    }

    return (
        <div className="container bg-gray-100 flex flex-col md:flex-row">
        <div className="md:w-1/2 bg-white p-8 flex flex-col justify-center">
            <h1 className="text-4xl font-bold text-gray-800 mb-6">Find What You Need,<br /> When You Need It For Free</h1>
            <p className="text-xl text-gray-600 mb-8">Join our platform to discover items based on categories, location, and condition donated by amazing people. It&apos;s never been easier to find exactly what you&apos;re looking for.</p>
            <ul className="space-y-4">
            <li className="flex items-center text-gray-700">
                <svg className="w-6 h-6 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                Wide range of categories
            </li>
            <li className="flex items-center text-gray-700">
                <svg className="w-6 h-6 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                Location-based searches
            </li>
            <li className="flex items-center text-gray-700">
                <svg className="w-6 h-6 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                Filter by item condition
            </li>
            </ul>
        </div>
        <div className="md:w-1/2 bg-gray-100 pt-8 md:p-8 flex items-center justify-center">
            <Formik
                initialValues={initialValues}
                validationSchema={validationSchema}
                onSubmit={handleSubmit}
            >
                {
                    ({
                        values,
                        handleChange,
                        handleSubmit,
                        handleBlur,
                        setFieldValue,
                        setFieldTouched,
                        touched,
                        errors,
                        isValid,
                        isSubmitting,
                        dirty
                    }) => (
                        <Form onSubmit={(e) => {
                            e.preventDefault();
                            handleSubmit(e);
                            if (Object.keys(errors).length > 0) {
                                toast("Form Submission Error", {
                                    description: "Please check the form for errors and try again."
                                });
                            }
                        }}>
                            <Card className="w-full max-w-lg">
                                <CardHeader>
                                    <CardTitle className="text-lg font-bold text-gray-800">{steps[currentStep - 1].title} - Step {currentStep} of {steps.length}</CardTitle>
                                    <Progress value={(currentStep / steps.length) * 100} className="w-full h-[8px]" />
                                    <p className="text-sm text-gray-500 max-w-[80%]">{steps[currentStep - 1].description}</p>
                                </CardHeader>
                                <CardContent>
                                    <form onSubmit={handleSubmit}>
                                    {currentStep === 1 && (
                                        <div className="">
                                        <CustomInput 
                                            name="name"
                                            label="Full Name"
                                            placeholder="Enter full name"
                                            containerClassName="px-0 pt-0 pb-6"
                                            onChange={handleChange}
                                            value={values.name}
                                            onBlur={handleBlur}
                                            error={touched.name && errors.name ? errors.name : undefined}
                                            disabled={isSubmitting}
                                        />
                                        <div className="flex flex-row flex-wrap md:flex-nowrap gap-4">
                                            <CustomInput 
                                                name="email"
                                                label="Email"
                                                placeholder="Enter email address"
                                                containerClassName="px-0 pt-0 pb-6 w-full"
                                                onChange={handleChange}
                                                value={values.email}
                                                onBlur={handleBlur}
                                                error={touched.email && errors.email ? errors.email : undefined}
                                                disabled={isSubmitting}
                                            />
                                            <CustomInput 
                                                name="phone"
                                                label="Phone Number"
                                                placeholder="Enter phone number"
                                                containerClassName="px-0 pt-0 pb-6 w-full"
                                                onChange={handleChange}
                                                value={values.phone}
                                                onBlur={handleBlur}
                                                error={touched.phone && errors.phone ? errors.phone : undefined}
                                                disabled={isSubmitting}
                                            />
                                        </div>
                                        <div className="flex flex-row flex-wrap md:flex-nowrap gap-4">
                                                <CustomInput 
                                                    containerClassName="px-0 pt-0 pb-6 w-full"
                                                    label="Street Address" 
                                                    id="address" 
                                                    type="tel" 
                                                    placeholder="Enter your street address" 
                                                    name="address"
                                                    onChange={handleChange}
                                                    value={values.address}
                                                    onBlur={handleBlur}
                                                    error={touched.address && errors.address ? errors.address : undefined}
                                                    disabled={isSubmitting}
                                                />
                                                <CustomInput 
                                                    label="Country" 
                                                    id="country" 
                                                    placeholder="Select your country" 
                                                    name="country" 
                                                    containerClassName="px-0 pt-0 pb-6 w-full"
                                                    onChange={handleChange}
                                                    value={values.country}
                                                    onBlur={handleBlur}
                                                    error={touched.country && errors.country ? errors.country : undefined}
                                                    disabled={isSubmitting}
                                                />
                                            </div>
                                            <div className="flex flex-row flex-wrap md:flex-nowrap gap-4">
                                                <CustomInput 
                                                    label="City" 
                                                    id="city" 
                                                    placeholder="Enter your city" 
                                                    name="city" 
                                                    containerClassName="px-0 pt-0 pb-6 w-full"
                                                    onChange={handleChange}
                                                    value={values.city}
                                                    onBlur={handleBlur}
                                                    error={touched.city && errors.city ? errors.city : undefined}
                                                    disabled={isSubmitting}
                                                />
                                                <CustomInput 
                                                    label="State" 
                                                    id="state" 
                                                    placeholder="Enter your state" 
                                                    name="state" 
                                                    containerClassName="px-0 pt-0 pb-6 w-full"
                                                    onChange={handleChange}
                                                    value={values.state}
                                                    onBlur={handleBlur}
                                                    error={touched.state && errors.state ? errors.state : undefined}
                                                    disabled={isSubmitting}
                                                />
                                                <CustomInput 
                                                    label="Zip Code" 
                                                    id="zip" 
                                                    placeholder="Enter your zip code" 
                                                    name="zip" 
                                                    containerClassName="px-0 pt-0 pb-6 w-full"
                                                    onChange={handleChange}
                                                    value={values.zip}
                                                    onBlur={handleBlur}
                                                    error={touched.zip && errors.zip ? errors.zip : undefined}
                                                    disabled={isSubmitting}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {currentStep === 2 && (
                                        <div>
                                            <MultiSelectInput
                                                label="Categories"
                                                placeholder="Select categories"
                                                options={categories.map(category => ({
                                                    label: category.name,
                                                    value: category.id
                                                }))}
                                                values={values.preferedCategories}
                                                onChange={(value) => setFieldValue('preferedCategories', value)}
                                                containerClassName="px-0 pt-0 pb-6"
                                                error={touched.preferedCategories && errors.preferedCategories ? errors.preferedCategories as string : undefined}
                                                onTouched={() => setFieldTouched('preferedCategories', true)}
                                                disabled={isSubmitting}
                                            />
                                            <CustomInput
                                                label="Location"
                                                placeholder="Enter your preferred location"
                                                name="preferedLocation"
                                                containerClassName="px-0 pt-0 pb-6"
                                                onChange={handleChange}
                                                value={values.preferedLocation}
                                                onBlur={handleBlur}
                                                error={touched.preferedLocation && errors.preferedLocation ? errors.preferedLocation : undefined}
                                                disabled={isSubmitting}
                                            />
                                            <p className="text-sm text-gray-500">
                                                This will help us find items near you. We use this information to show you items and opportunities that are within your preferred area. Please provide a specific location (e.g., city, neighborhood, or postal code) to get the most relevant results.
                                            </p>
                                        </div>
                                    )}

                                    {currentStep === 3 && (
                                        <div>
                                        <CustomInput 
                                            name="password"
                                            label="Password"
                                            type="password"
                                            placeholder="Enter your password"
                                            containerClassName="px-0 pt-0 pb-6"
                                            onChange={handleChange}
                                            value={values.password}
                                            onBlur={handleBlur}
                                            error={touched.password && errors.password ? errors.password : undefined}
                                            disabled={isSubmitting}
                                        />
                                        <CustomInput 
                                            name="confirmPassword"
                                            label="Confirm Password"
                                            type="password"
                                            placeholder="Confirm your password"
                                            containerClassName="px-0 pt-0 pb-6"
                                            onChange={handleChange}
                                            value={values.confirmPassword}
                                            onBlur={handleBlur}
                                            error={touched.confirmPassword && errors.confirmPassword ? errors.confirmPassword : undefined}
                                            disabled={isSubmitting}
                                        />
                                        <p className="text-sm text-gray-500">
                                            Your password must be at least 8 characters long and include a mix of letters, numbers, and special characters.
                                        </p>
                                        </div>
                                    )}
                                    </form>
                                </CardContent>
                                <CardFooter className="flex justify-between flex-wrap gap-4">
                                    {currentStep > 1 && (
                                        <CustomButton 
                                            variant="outline" 
                                            onClick={handlePrevious} 
                                            className="py-6 w-full lg:max-w-[150px] rounded-full text-base"
                                            type="button"
                                            disabled={isSubmitting}
                                        >
                                            Previous
                                        </CustomButton>
                                    )}
                                    {currentStep < steps.length ? (
                                        <CustomButton 
                                            onClick={handleNext} 
                                            className="py-6 w-full lg:max-w-[150px] rounded-full text-base"
                                            icon={<ArrowRightIcon className="w-4 h-4" />}
                                            type="button"
                                            disabled={!dirty}
                                            isLoading={isSubmitting}
                                        >
                                            Next
                                        </CustomButton>
                                    ) : (
                                        <CustomButton 
                                            disabled={!isValid}
                                            className="py-6 w-full lg:max-w-[150px] rounded-full text-base"
                                            icon={<SendIcon className="w-4 h-4" />}
                                            type="submit"
                                            isLoading={isSubmitting}
                                        >
                                            Submit
                                        </CustomButton>
                                    )}
                                </CardFooter>
                                </Card>
                        </Form>
                    )
                }
            </Formik>
        </div>
    </div>
  )
}