import React from 'react'
import { Register } from '@/components/Register'
import { registerDonorAction } from '../../actions/register'

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
