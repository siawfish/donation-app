export const serverConfig = {
  cookieName: process.env.AUTH_COOKIE_NAME!,
  firebaseApiKey: process.env.FIREBASE_API_KEY!,
  cookieSignatureKeys: [process.env.AUTH_COOKIE_SIGNATURE_KEY_CURRENT!, process.env.AUTH_COOKIE_SIGNATURE_KEY_PREVIOUS!],
  cookieSerializeOptions: {
    path: "/",
    httpOnly: true,
    secure: process.env.USE_SECURE_COOKIES === "true",
    sameSite: "lax" as const,
    maxAge: 12 * 60 * 60 * 24,
  },
  serviceAccount: {
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
    clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL!,
    privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(
      /\\n/g,
      '\n'
    )!,
  }
};

export const authConfig = {
  apiKey: serverConfig.firebaseApiKey,
  cookieName: serverConfig.cookieName,
  cookieSignatureKeys: serverConfig.cookieSignatureKeys,
  cookieSerializeOptions: {
    path: '/',
    httpOnly: true,
    secure: serverConfig.cookieSerializeOptions.secure, // Set this to true on HTTPS environments
    sameSite: 'lax' as const,
    maxAge: 12 * 60 * 60 * 24 // twelve days
  },
  serviceAccount: serverConfig.serviceAccount,
  debug: true,
  // Set to false in Firebase Hosting environment due to https://stackoverflow.com/questions/44929653/firebase-cloud-function-wont-store-cookie-named-other-than-session
  enableMultipleCookies: true,
  // Set to false if you're not planning to use `signInWithCustomToken` Firebase Client SDK method
  enableCustomToken: true,
  experimental_enableTokenRefreshOnExpiredKidHeader: true,
};
