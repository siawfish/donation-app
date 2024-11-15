import React from 'react'
import { Register } from '@/components/Register'
import { registerDonorAction } from '../../actions/register'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: "Register as Donor",
  description: "Create an account and start listing items",
};

export default function RegisterPage() {
    return (
        <Register
            title="Donor Registration"
            caption="Create an account to start donating"
            callbackUrl="/app/donor/my-items"
            registerAction={registerDonorAction}
        />
    )
}
