export default function Loading() {
    return (
        <div className="container max-w-6xl mx-auto px-4 lg:py-12">
            <div className="grid grid-cols-1 lg:grid-cols-[60%_40%] gap-y-4">
                <div className="flex flex-col justify-center gap-6 lg:mr-4">
                    <div>
                        <div className="h-8 w-48 bg-gray-200 animate-pulse rounded mb-2" />
                        <div className="h-4 w-64 bg-gray-200 animate-pulse rounded" />
                    </div>
                    <div className="flex flex-col justify-center gap-4 flex-1">
                        {/* Item Name Input */}
                        <div className="flex flex-col gap-2">
                            <div className="h-4 w-24 bg-gray-200 animate-pulse rounded" />
                            <div className="h-10 w-full bg-gray-200 animate-pulse rounded" />
                        </div>

                        {/* Category and Condition Inputs */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex flex-col gap-2">
                                <div className="h-4 w-20 bg-gray-200 animate-pulse rounded" />
                                <div className="h-10 w-full bg-gray-200 animate-pulse rounded" />
                            </div>
                            <div className="flex flex-col gap-2">
                                <div className="h-4 w-20 bg-gray-200 animate-pulse rounded" />
                                <div className="h-10 w-full bg-gray-200 animate-pulse rounded" />
                            </div>
                        </div>

                        {/* Description Textarea */}
                        <div className="flex flex-col gap-2">
                            <div className="h-4 w-32 bg-gray-200 animate-pulse rounded" />
                            <div className="h-32 w-full bg-gray-200 animate-pulse rounded" />
                        </div>
                    </div>
                </div>

                {/* Drag and Drop Area */}
                <div className="h-[400px] w-full bg-gray-200 animate-pulse rounded-lg" />
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end mt-6 gap-4">
                <div className="h-12 w-[150px] bg-gray-200 animate-pulse rounded-full" />
                <div className="h-12 w-[150px] bg-gray-200 animate-pulse rounded-full" />
            </div>
        </div>
    )
}