'use client';

import * as React from 'react';
import { signInWithCustomToken, signOut } from 'firebase/auth';
import { AuthContext, User } from './AuthContext';
import { getFirebaseAuth } from './firebase';

export interface AuthProviderProps {
  user: User | null;
  children: React.ReactNode;
}

export const AuthProvider: React.FunctionComponent<AuthProviderProps> = ({
  user,
  children
}) => {
  /**
   * Sign the browser SDK in to match the server session.
   *
   * Login happens in a server action, which mints a session cookie — so the
   * server knows who you are, but the client SDK never did. Anything that talks
   * to Firebase directly from the browser (Storage uploads for listing photos,
   * chat attachments and avatars) was therefore running unauthenticated and
   * being rejected by Storage rules, even though the UI showed you as logged in.
   *
   * `enableCustomToken` is already on in authConfig and `toUser` already returns
   * the token; this is the missing half. Persistence stays in-memory, so no
   * credentials are written to the browser.
   */
  React.useEffect(() => {
    const auth = getFirebaseAuth();

    if (!user) {
      // Signed out on the server — drop any client session too.
      if (auth.currentUser) signOut(auth).catch(() => {/* nothing useful to do */});
      return;
    }

    if (!user.customToken) {
      // Signed in server-side but no token to hand the client SDK: uploads will
      // be rejected. Almost always means enableCustomToken is off in authConfig.
      console.warn(
        'No customToken on the session — the Firebase client SDK cannot sign in, ' +
        'so Storage uploads will fail. Check `enableCustomToken` in authConfig.'
      );
      return;
    }

    // Already the right user; re-signing in would only churn tokens.
    if (auth.currentUser?.uid === user.uid) return;

    let cancelled = false;
    const token = user.customToken;

    // A transient failure here (a network blip, the token not yet valid by
    // clock skew) used to leave the client SDK signed out for the rest of the
    // tab's life — nothing else ever retried it, so every Storage write kept
    // failing with "couldn't verify your session" until a hard refresh.
    // `awaitClientAuth`'s callers already wait up to 10s for sign-in to land,
    // so there's room for a couple of retries first.
    const trySignIn = (attempt: number) => {
      signInWithCustomToken(auth, token).catch((error) => {
        if (cancelled) return;
        if (attempt < 2) {
          setTimeout(() => trySignIn(attempt + 1), 1000 * (attempt + 1));
        } else {
          // Reads still work through the server session regardless. Uploads
          // will surface their own clear message rather than failing silently.
          console.error('Firebase client sign-in failed after retries; uploads may be rejected', error);
        }
      });
    };
    trySignIn(0);

    return () => { cancelled = true };
  }, [user, user?.uid, user?.customToken]);

  return (
    <AuthContext.Provider
      value={{
        user
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
