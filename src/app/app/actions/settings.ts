'use server';

import { cache } from "react";
import { db } from "@/firebase/init";
import { authConfig } from "@/firebase/config/server-config";
import { getTokens } from "next-firebase-auth-edge";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { ResponseData } from "@/app/types";
import { can } from "@/lib/roles";
import { getMyAdminRole } from "./admin";
import {
    DEFAULT_FEATURES,
    FEATURES_DOC,
    FeatureSettings,
    SETTINGS_COLLECTION,
    withDefaults,
} from "@/lib/settings";

const docRef = () => db.collection(SETTINGS_COLLECTION).doc(FEATURES_DOC);

/**
 * Feature switches for the current request.
 *
 * Readable by anyone — these decide what the public UI shows, so a signed-out
 * visitor needs them too. Memoised per request because a page may ask more than
 * once while rendering.
 *
 * A missing document is not an error: it means nothing has been configured yet,
 * which is exactly what the defaults describe.
 */
const readFeatures = cache(async (): Promise<FeatureSettings> => {
    try {
        const snap = await docRef().get();
        return withDefaults(snap.data() as Partial<FeatureSettings> | undefined);
    } catch {
        // Never let a settings read break a page — fall back to the safe state.
        return { ...DEFAULT_FEATURES };
    }
});

export async function getFeatures(): Promise<FeatureSettings> {
    return readFeatures();
}

/**
 * Update the delivery switches.
 *
 * Only the delivery fields are writable here; the action never spreads caller
 * input into the document, so an unexpected field cannot be smuggled in.
 */
export async function updateDeliverySettings(input: {
    deliveryEnabled?: boolean;
    deliveryPartner?: string;
    deliveryRatesConfirmed?: boolean;
}): Promise<ResponseData<FeatureSettings | null>> {
    try {
        const tokens = await getTokens(await cookies(), authConfig);
        if (!tokens) throw new Error("Unauthorized");
        const role = await getMyAdminRole();
        if (!can(role, "settings.manage")) {
            throw new Error("You don't have permission to change platform settings.");
        }

        const current = withDefaults((await docRef().get()).data() as Partial<FeatureSettings>);

        const partner = input.deliveryPartner?.trim();
        if (partner !== undefined && partner.length > 60) {
            throw new Error("Partner name is too long.");
        }

        const next: FeatureSettings = {
            deliveryEnabled: input.deliveryEnabled ?? current.deliveryEnabled,
            deliveryPartner: partner || current.deliveryPartner,
            deliveryRatesConfirmed: input.deliveryRatesConfirmed ?? current.deliveryRatesConfirmed,
            updatedAt: new Date().toISOString(),
            updatedBy: tokens.decodedToken.uid,
        };

        await docRef().set(next, { merge: true });

        // The estimate is rendered on listing pages, so those have to re-read.
        revalidatePath("/explore");
        revalidatePath("/app/admin/settings");

        return { success: true, message: "Settings saved", data: next };
    } catch (error: any) {
        return { success: false, message: error.message, data: null };
    }
}
