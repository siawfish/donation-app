import Link from "next/link";
import { ItemType } from "@/app/types";

/**
 * An organisation's listings.
 *
 * Rehomed items stay visible rather than disappearing: for a business or NGO
 * the record of what they have already passed on *is* the proof, and hiding it
 * would leave a storefront that looks empty on the days it has been busiest.
 * They are visibly marked so nobody asks for something that has gone.
 */
export function StorefrontGrid({ items }: { items: ItemType[] }) {
    return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {items.map((item) => {
                const gone = !!item.donatedTo;
                return (
                    <Link
                        key={item.id}
                        href={`/explore?id=${item.id}`}
                        className={`group bg-white border border-gray-200/70 rounded-3xl overflow-hidden card-hover ${
                            gone ? "opacity-70" : ""
                        }`}
                    >
                        <div className="aspect-square bg-sand overflow-hidden relative">
                            {item.assets?.[0]?.url ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                    src={item.assets[0].url}
                                    alt={item.name}
                                    loading="lazy"
                                    className={`w-full h-full object-cover transition-transform duration-500 ${
                                        gone ? "grayscale" : "group-hover:scale-[1.04]"
                                    }`}
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">
                                    No photo
                                </div>
                            )}

                            {gone && (
                                <span className="absolute top-2 left-2 bg-forest text-lime text-[10px] font-bold px-2 py-1 rounded-full">
                                    Rehomed
                                </span>
                            )}
                        </div>

                        <div className="p-3">
                            <p className="text-sm font-bold text-ink leading-tight line-clamp-2 group-hover:text-forest transition-colors">
                                {item.name}
                            </p>
                            {item.categories?.[0]?.name && (
                                <p className="text-[11px] text-gray-400 mt-1 truncate">{item.categories[0].name}</p>
                            )}
                        </div>
                    </Link>
                );
            })}
        </div>
    );
}
