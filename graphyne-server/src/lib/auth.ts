import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./prisma";

export const auth = betterAuth({
    database: prismaAdapter(prisma, {
        provider: "sqlite", 
    }),
    emailAndPassword: {
        enabled: true,
        // Since this is a local network tool, we don't strictly need email verification
        requireEmailVerification: false 
    },
    user: {
        additionalFields: {
            role: {
                type: "string",
                required: false,
                defaultValue: "editor"
            }
        }
    }
});