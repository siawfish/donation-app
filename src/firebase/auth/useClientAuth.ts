"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { getFirebaseAuth } from "./firebase";

/**
 * True once the *browser* Firebase SDK has a signed-in user.
 *
 * `useAuth().user` comes from the server session cookie and is available on the
 * first render. The browser SDK signs in separately, with a custom token, after
 * mount. Anything that reads Firestore directly must wait for this one: a
 * listener attached in between is evaluated as unauthenticated, and since
 * `onSnapshot` does not retry after a permission error, that listener stays
 * dead for the life of the page rather than recovering.
 *
 * Storage writes have the same problem and use `awaitClientAuth()` instead,
 * which is the promise-shaped version of this.
 */
export function useClientAuthReady(): boolean {
    const [ready, setReady] = useState(() => !!getFirebaseAuth().currentUser);

    useEffect(() => {
        if (ready) return;
        const unsubscribe = onAuthStateChanged(getFirebaseAuth(), (user) => {
            if (user) setReady(true);
        });
        return unsubscribe;
    }, [ready]);

    return ready;
}
