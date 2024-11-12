import User from '@/components/User'
import React, { Suspense } from 'react'

export default function UserPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <User />
        </Suspense>
    )
}
