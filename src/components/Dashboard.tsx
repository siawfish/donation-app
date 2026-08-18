'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { PackagePlus } from 'lucide-react'
import { useAuth } from '@/firebase/auth/AuthContext'
import { AttentionCenter } from './AttentionCenter'
import { LoyaltyCard } from './loyalty/LoyaltyCard'
import { MinimalStatCards } from './MinimalStatCards'
import { QuickActions } from './QuickActions'
import { RecentActivity } from './RecentActivity'

export default function Dashboard() {
    const { user } = useAuth()
    const firstName = user?.displayName?.split(' ')[0]

    // Resolved after mount — the server and client clocks can disagree,
    // and a time-based greeting rendered during SSR would break hydration.
    const [greeting, setGreeting] = useState('Welcome back')
    useEffect(() => {
        const h = new Date().getHours()
        setGreeting(h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening')
    }, [])

    return (
        <div className="space-y-8 md:space-y-10">

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-5">
                <div>
                    <p className="text-xs font-bold tracking-[0.2em] uppercase text-primary mb-2">Dashboard</p>
                    <h1 className="text-3xl md:text-4xl font-bold text-ink tracking-tight">
                        {greeting}{firstName ? `, ${firstName}` : ''} 👋
                    </h1>
                    <p className="text-gray-500 text-sm mt-1.5">
                        Here&apos;s what&apos;s happening with your items.
                    </p>
                </div>
                <Link
                    href="/app/add-item"
                    className="inline-flex items-center justify-center gap-2 bg-lime text-forest font-bold text-sm px-6 py-3.5 rounded-full hover:brightness-95 transition-all flex-shrink-0 w-full sm:w-auto"
                >
                    <PackagePlus className="w-4 h-4" />
                    List an item
                </Link>
            </div>

            {/* Anything waiting on a decision from this user comes first */}
            <AttentionCenter />

            <LoyaltyCard />

            <MinimalStatCards />

            <QuickActions />

            <RecentActivity />
        </div>
    )
}
