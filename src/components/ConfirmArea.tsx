"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { toast } from "sonner";
import { ArrowRightIcon } from "lucide-react";
import Link from "next/link";
import CustomButton from "./Button";
import { saveMyLocation } from "@/app/auth/actions/google";

const LocationConfirm = dynamic(() => import("./LocationConfirm"), { ssr: false });

/**
 * The last step of a Google sign-up: where are you?
 *
 * Deliberately skippable. The account already exists and the session is live,
 * so blocking the app behind this would be holding a finished signup hostage
 * for one optional field — and somebody who skips can set it from settings, or
 * will be asked again the next time they sign in.
 */
export function ConfirmArea({ firstName, destination }: { firstName?: string; destination: string }) {
    const [area, setArea] = useState<{ lat: number; lng: number; name: string } | null>(null);
    const [saving, start] = useTransition();
    const router = useRouter();

    const save = () => {
        if (!area) return;
        start(async () => {
            const res = await saveMyLocation(area.lat, area.lng, area.name);
            if (!res.success) { toast.error(res.message); return; }
            toast.success("You're all set", {
                description: "Have a look at what neighbours near you are passing on.",
            });
            router.replace(destination);
            router.refresh();
        });
    };

    return (
        <div className="min-h-screen bg-canvas flex flex-col justify-center px-6 py-10">
            <div className="w-full max-w-lg mx-auto">
                <div className="mb-8 text-center">
                    <Link href="/" className="text-2xl font-bold text-forest tracking-tight hover:opacity-80 transition-opacity">
                        Givny
                    </Link>
                </div>

                <div className="mb-6">
                    <p className="text-xs font-bold tracking-[0.2em] uppercase text-primary mb-2">
                        One last thing
                    </p>
                    <h1 className="text-2xl md:text-3xl font-bold text-ink tracking-tight">
                        {firstName ? `Welcome, ${firstName}` : "Welcome"}
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Confirm where you are and we&rsquo;ll show you what neighbours nearby are passing on.
                    </p>
                </div>

                <LocationConfirm
                    locationName={area?.name}
                    disabled={saving}
                    onChange={(lat, lng, name) => setArea({ lat, lng, name })}
                />

                <div className="flex items-center justify-between pt-6">
                    <button
                        type="button"
                        onClick={() => { router.replace(destination); router.refresh(); }}
                        disabled={saving}
                        className="text-sm text-gray-500 hover:text-gray-700 font-medium"
                    >
                        Skip for now
                    </button>
                    <CustomButton
                        type="button"
                        onClick={save}
                        disabled={!area}
                        isLoading={saving}
                        icon={<ArrowRightIcon className="w-4 h-4" />}
                        className="rounded-full px-6 py-5 text-white !bg-forest hover:!bg-forest-dark"
                    >
                        Continue
                    </CustomButton>
                </div>
            </div>
        </div>
    );
}
