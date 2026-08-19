/**
 * Platform feature switches, stored in Firestore (`settings/features`) so they
 * can be changed from the admin dashboard without a deploy.
 *
 * Shapes and defaults live here rather than in the server action so that both
 * the reader and the writer agree on them, and so a missing document behaves
 * exactly like an explicit default rather than throwing.
 */

export interface FeatureSettings {
    /** Show delivery cost estimates on listings. */
    deliveryEnabled: boolean;
    /**
     * Name of the delivery partner, shown to members alongside the estimate.
     * Configurable because the partner is a commercial arrangement, not a
     * property of the code.
     */
    deliveryPartner: string;
    /**
     * Whether the rates in lib/delivery.ts have been replaced with the
     * partner's real tariff. While false, estimates carry a visible "sample
     * rates" notice, so turning the feature on before the numbers are real
     * cannot quietly mislead anyone.
     */
    deliveryRatesConfirmed: boolean;
    updatedAt?: string;
    updatedBy?: string;
}

/**
 * Delivery is off until an admin turns it on. A new deployment ships with
 * placeholder tariffs, and showing invented prices is worse than showing none —
 * so the safe state is the default state.
 */
export const DEFAULT_FEATURES: FeatureSettings = {
    deliveryEnabled: false,
    deliveryPartner: "Flip Delivery",
    deliveryRatesConfirmed: false,
};

export const SETTINGS_COLLECTION = "settings";
export const FEATURES_DOC = "features";

/** Fills in defaults for anything absent, so callers never handle undefined. */
export function withDefaults(data: Partial<FeatureSettings> | undefined): FeatureSettings {
    return {
        deliveryEnabled: data?.deliveryEnabled ?? DEFAULT_FEATURES.deliveryEnabled,
        deliveryPartner: data?.deliveryPartner?.trim() || DEFAULT_FEATURES.deliveryPartner,
        deliveryRatesConfirmed:
            data?.deliveryRatesConfirmed ?? DEFAULT_FEATURES.deliveryRatesConfirmed,
        updatedAt: data?.updatedAt,
        updatedBy: data?.updatedBy,
    };
}
