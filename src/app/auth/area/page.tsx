import { Metadata } from "next";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getTokens } from "next-firebase-auth-edge";
import { authConfig } from "@/firebase/config/server-config";
import { db } from "@/firebase/init";
import { ConfirmArea } from "@/components/ConfirmArea";

export const metadata: Metadata = { title: "Your area — Givny" };

/**
 * The one thing Google sign-in cannot tell us.
 *
 * A Google account carries a name and an email but never a location, so a
 * member who signed up that way arrives here for a single confirmation and
 * nothing else. They already have an account and a session by this point — if
 * they close the tab they are signed up, not stranded half-created.
 */
export default async function AreaPage({
    searchParams,
}: {
    searchParams: { [key: string]: string | string[] | undefined };
}) {
    const tokens = await getTokens(await cookies(), authConfig);
    if (!tokens) redirect("/auth/login");

    const redirectTo = typeof searchParams.redirect === "string" ? searchParams.redirect : undefined;
    const destination =
        redirectTo && redirectTo.startsWith("/") && !redirectTo.startsWith("//") ? redirectTo : "/app";

    // Anyone who already has an area has no business on this page.
    const snap = await db.collection("users").doc(tokens.decodedToken.uid).get();
    if (snap.data()?.preferedLocation) redirect(destination);

    const name = String(snap.data()?.name ?? "").trim().split(/\s+/)[0];

    return <ConfirmArea firstName={name} destination={destination} />;
}
