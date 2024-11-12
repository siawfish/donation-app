import React from "react"
import CustomInput from "./CustomInput"

export default function OrganizationForm() {
    return (
        <div className="space-y-4">
            <CustomInput 
                label="Organization Name" 
                id="organizationName"
                placeholder="Enter your organization name"
                required
            />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <CustomInput label="Email Address" id="email" type="email" placeholder="Enter your email" />
                <CustomInput label="Phone Number" id="phone" type="tel" placeholder="Enter your phone number" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-[65%_35%] gap-4 lg:gap-0">
                <CustomInput containerClassName="lg:mr-4" label="Street Address" id="address" type="tel" placeholder="Enter your street address" />
                <CustomInput label="Country" id="country" placeholder="Select your country" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <CustomInput label="City" id="city" placeholder="Enter your city" />
                <CustomInput label="State" id="state" placeholder="Enter your state" />
                <CustomInput label="Zip Code" id="zip" placeholder="Enter your zip code" />
            </div>
        </div>
    )
}