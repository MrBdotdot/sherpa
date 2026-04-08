import { getUserNameParts } from "@/app/_lib/user-display";

export type UserMetadata = {
  first_name?: string;
  last_name?: string;
  display_name?: string;
  avatar_url?: string;
  studio_name?: string;
  website?: string;
  business_email?: string;
  country?: string;
  language?: string;
  notifications?: {
    rulesChanges?: boolean;
    publishingChanges?: boolean;
    comments?: boolean;
    teamInvitations?: boolean;
    roleChanges?: boolean;
    billing?: boolean;
    planChanges?: boolean;
  };
  security?: {
    loginNotifications?: boolean;
    sessionTimeout?: boolean;
  };
};

export function getUserProfile(userEmail: string, metadata: UserMetadata = {}) {
  const derived = getUserNameParts(userEmail);
  const firstName = metadata.first_name?.trim() || derived.firstName;
  const lastName = metadata.last_name?.trim() || derived.lastName;
  const displayName =
    metadata.display_name?.trim() ||
    [firstName, lastName].filter(Boolean).join(" ").trim() ||
    derived.displayName;
  const initialSource = displayName || firstName || userEmail || "?";

  return {
    firstName,
    lastName,
    displayName,
    initial: initialSource.charAt(0).toUpperCase(),
    avatarUrl: metadata.avatar_url?.trim() || null,
  };
}
