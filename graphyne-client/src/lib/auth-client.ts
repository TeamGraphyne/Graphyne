import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
    baseURL: `http://${window.location.hostname}:3001`,
});

export const { useSession, signIn, signUp, signOut } = authClient;