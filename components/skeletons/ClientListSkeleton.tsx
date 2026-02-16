import React from 'react';

const ClientListSkeleton: React.FC = () => {
    // Determine valid items count based on screen size (approximate)
    const isMobile = window.innerWidth < 768;
    const items = Array.from({ length: isMobile ? 6 : 12 });

    return (
        <div className={`h-full w-full p-2 ${isMobile ? 'flex flex-col gap-2' : 'grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4 content-start'}`}>
            {items.map((_, index) => (
                <div
                    key={index}
                    className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm animate-pulse flex flex-col gap-3"
                >
                    {/* Header: Avatar + Title */}
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3 w-full">
                            <div className="w-10 h-10 rounded-full bg-gray-200 flex-shrink-0" />
                            <div className="flex flex-col gap-1.5 w-full">
                                <div className="h-4 bg-gray-200 rounded w-3/4" />
                                <div className="h-3 bg-gray-200 rounded w-1/2" />
                            </div>
                        </div>
                        <div className="w-6 h-6 bg-gray-200 rounded-full flex-shrink-0" />
                    </div>

                    {/* Body: Info Rows */}
                    <div className="space-y-2 mt-1">
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 bg-gray-200 rounded" />
                            <div className="h-3 bg-gray-200 rounded w-full" />
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 bg-gray-200 rounded" />
                            <div className="h-3 bg-gray-200 rounded w-2/3" />
                        </div>
                    </div>

                    {/* Footer: Tags/Actions */}
                    <div className="mt-2 flex gap-2 pt-2 border-t border-gray-50">
                        <div className="h-6 w-16 bg-gray-200 rounded-full" />
                        <div className="h-6 w-16 bg-gray-200 rounded-full" />
                    </div>
                </div>
            ))}
        </div>
    );
};

export default ClientListSkeleton;
