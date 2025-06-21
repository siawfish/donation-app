import { MinimalStatCards } from './MinimalStatCards'
import { QuickActions } from './QuickActions'
import { RecentActivity } from './RecentActivity'

export default function Dashboard() {
    return (
        <div className="container mx-auto px-4 space-y-8">
            {/* <WelcomeMessage /> */}
            
            <MinimalStatCards />
            
            <QuickActions />
            
            <RecentActivity />
        </div>
    )
}
