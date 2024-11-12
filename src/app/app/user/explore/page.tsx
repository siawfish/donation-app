import Donations from '@/components/Donations'
import React, { Suspense } from 'react'

export default function Explore() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <Donations />
        </Suspense>
    )
}
