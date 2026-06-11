export const clerkPublishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined;
export const hasClerkConfig = Boolean(clerkPublishableKey);
