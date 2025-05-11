export default function Loading() {
    return (
        <div className="container mx-auto max-w-7xl px-4">
            <div className="flex flex-row items-center justify-between flex-wrap">
                <div>
                    <div className="h-8 w-48 bg-gray-200 animate-pulse rounded mb-2" />
                    <div className="h-4 w-64 bg-gray-200 animate-pulse rounded mb-8" />
                </div>
                <div className="mb-8 w-full sm:w-64">
                    <div className="h-10 w-full bg-gray-200 animate-pulse rounded" />
                </div>
            </div>
            <div className="flex flex-row items-center gap-2 mb-8">
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-8 w-20 bg-gray-200 animate-pulse rounded-full" />
                ))}
            </div>
            <div className="p-1 flex flex-col">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-8">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="flex flex-col gap-2">
                            <div className="aspect-square w-full bg-gray-200 animate-pulse rounded-lg" />
                            <div className="h-4 w-3/4 bg-gray-200 animate-pulse rounded" />
                            <div className="h-4 w-1/2 bg-gray-200 animate-pulse rounded" />
                        </div>
                    ))}
                </div>
                <div className="flex justify-center">
                    <div className="h-10 w-64 bg-gray-200 animate-pulse rounded" />
                </div>
            </div>
        </div>
    )
}