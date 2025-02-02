"use client"

import { WelcomeMessage } from './WelcomeMessage'
import StatCards from './StatCards'
import ActivitesAndTrends from './ActivitesAndTrends'
import MostPopularListings from './MostPopularListings'
import RecentViews from './RecentViews'

export default function Dashboard() {
    return (
        <div className="container mx-auto px-6 md:px-8 space-y-6">
            <WelcomeMessage />
        
            <StatCards />

            <ActivitesAndTrends />
            <MostPopularListings />

            <RecentViews />

        </div>
    )
}
