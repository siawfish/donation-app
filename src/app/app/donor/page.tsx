import React, { Suspense } from 'react'
import Donor from '@/components/Donor'
export const metadata = {
  title: 'Donor Dashboard',
  description: 'Donor dashboard',
}

export default function Account() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <Donor />
        </Suspense>
    )
}
