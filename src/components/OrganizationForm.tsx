import React from "react"
import CustomInput from "./CustomInput"
import { FormikProps } from "formik"
import { DonorType } from "@/app/types"

interface OrganizationFormProps extends FormikProps<DonorType> {
    disabled?: boolean;
}

export default function OrganizationForm({
    disabled,
    ...props
}: OrganizationFormProps) {
    return (
        <div className="space-y-4">
            <CustomInput 
                label="Organization Name" 
                id="organizationName"
                placeholder="Enter your organization name"
                name="name"
                value={props.values.name}
                onChange={props.handleChange}
                onBlur={props.handleBlur}
                error={props.touched.name && props.errors.name ? props.errors.name : undefined}
                disabled={disabled}
            />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <CustomInput label="Email Address" id="email" type="email" placeholder="Enter your email" name="email" value={props.values.email} onChange={props.handleChange} onBlur={props.handleBlur} error={props.touched.email && props.errors.email ? props.errors.email : undefined} disabled={disabled} />
                <CustomInput label="Phone Number" id="phone" type="tel" placeholder="Enter your phone number" name="phone" value={props.values.phone} onChange={props.handleChange} onBlur={props.handleBlur} error={props.touched.phone && props.errors.phone ? props.errors.phone : undefined} disabled={disabled} />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-[60%_40%] gap-4 lg:gap-0">
                <CustomInput containerClassName="lg:mr-4" label="Street Address" id="address" type="tel" placeholder="Enter your street address" name="address" value={props.values.address} onChange={props.handleChange} onBlur={props.handleBlur} error={props.touched.address && props.errors.address ? props.errors.address : undefined} disabled={disabled} />
                <CustomInput label="Country" id="country" placeholder="Select your country" name="country" value={props.values.country} onChange={props.handleChange} onBlur={props.handleBlur} error={props.touched.country && props.errors.country ? props.errors.country : undefined} disabled={disabled} />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <CustomInput label="City" id="city" placeholder="Enter your city" name="city" value={props.values.city} onChange={props.handleChange} onBlur={props.handleBlur} error={props.touched.city && props.errors.city ? props.errors.city : undefined} disabled={disabled} />
                <CustomInput label="State" id="state" placeholder="Enter your state" name="state" value={props.values.state} onChange={props.handleChange} onBlur={props.handleBlur} error={props.touched.state && props.errors.state ? props.errors.state : undefined} disabled={disabled} />
                <CustomInput label="Zip Code" id="zip" placeholder="Enter your zip code" name="zip" value={props.values.zip} onChange={props.handleChange} onBlur={props.handleBlur} error={props.touched.zip && props.errors.zip ? props.errors.zip : undefined} disabled={disabled} />
            </div>
        </div>
    )
}