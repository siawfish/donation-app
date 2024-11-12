import React, { Suspense } from 'react'
import AddDonation from '@/components/AddDonation'
export default function AddDonationPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <AddDonation />
        </Suspense>
    )
}
