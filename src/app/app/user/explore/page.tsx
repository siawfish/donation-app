import React, { Suspense } from 'react'
import Donations from '@/components/Donations'
export default function Explore() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <Donations />
        </Suspense>
    )
}
