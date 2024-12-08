"use client"

import { useState } from 'react'
import { Line, LineChart, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { useAuth } from '@/firebase/auth/AuthContext'
import { WelcomeMessage } from './WelcomeMessage'
import Link from 'next/link'
import ImageCard from './ui/image-card'
import EmptyState from './EmptyState'
import { usePathname } from 'next/navigation'
import { UserTypes } from '@/app/types'
import StatCards from './StatCards'
import ActivitesAndTrends from './ActivitesAndTrends'
import MostPopularListings from './MostPopularListings'
import RecentViews from './RecentViews'

export default function Dashboard() {
    const pathname = usePathname();
    const { user } = useAuth();
    return (
        <div className="container mx-auto px-6 md:px-8 space-y-6">
            <WelcomeMessage />
        
            <StatCards />

            <ActivitesAndTrends />
            {
                user?.userType === UserTypes.DONOR && (
                    <MostPopularListings />
                )
            }
            {
                user?.userType === UserTypes.USER && (
                    <RecentViews />
                )
            }
        </div>
    )
}
