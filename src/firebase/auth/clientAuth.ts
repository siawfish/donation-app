import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { getFirebaseAuth } from './firebase';

/**
 * Resolves once the browser Firebase SDK has a signed-in user.
 *
 * AuthProvider signs in with a custom token on mount, which is asynchronous —
 * so an upload started immediately after page load can outrun it and get
 * rejected by Storage rules. Anything writing to Storage should await this
 * first and give a clear message if it times out, rather than surfacing a raw
 * `storage/unauthorized`.
 */
export function awaitClientAuth(timeoutMs = 10_000): Promise<FirebaseUser | null> {
    const auth = getFirebaseAuth();
    if (auth.currentUser) return Promise.resolve(auth.currentUser);

    return new Promise((resolve) => {
        const timer = setTimeout(() => {
            unsubscribe();
            resolve(null);
        }, timeoutMs);

        const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
            if (!firebaseUser) return; // ignore the initial null emission
            clearTimeout(timer);
            unsubscribe();
            resolve(firebaseUser);
        });
    });
}
