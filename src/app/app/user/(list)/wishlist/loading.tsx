export default function Loading() {
    return (
        <div className="p-1 flex flex-col mt-4">
            <div className="flex flex-row justify-between items-center mb-4">
                <div className="h-6 w-48 bg-gray-200 animate-pulse rounded" />
                <div className="h-8 w-64 bg-gray-200 animate-pulse rounded" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-8">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="flex flex-col gap-2">
                        <div className="aspect-square w-full bg-gray-200 animate-pulse rounded-lg" />
                        <div className="h-4 w-3/4 bg-gray-200 animate-pulse rounded" />
                        <div className="h-4 w-1/2 bg-gray-200 animate-pulse rounded" />
                    </div>
                ))}
            </div>
        </div>
    )
}