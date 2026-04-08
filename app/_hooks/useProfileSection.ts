"use client";

import { useState, useEffect, useRef } from "react";
import type { SaveState } from "@/app/_components/account/account-form-ui";
import { getUserNameParts } from "@/app/_lib/user-display";
import { uploadImage } from "@/app/_lib/supabase-storage";
import { supabase } from "@/app/_lib/supabase";
import { UserMetadata } from "@/app/_lib/user-profile";
import { useSave } from "@/app/_hooks/useSave";

type UseProfileSectionReturn = {
  firstName: string;
  setFirstName: (v: string) => void;
  lastName: string;
  setLastName: (v: string) => void;
  displayName: string;
  setDisplayName: (v: string) => void;
  avatarUrl: string | null;
  photoInputRef: React.RefObject<HTMLInputElement | null>;
  newPassword: string;
  setNewPassword: (v: string) => void;
  confirmPassword: string;
  setConfirmPassword: (v: string) => void;
  passwordError: string | null;
  profileSaveState: SaveState;
  passwordSaveState: SaveState;
  handlePhotoChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSaveProfile: () => void;
  handleSavePassword: () => void;
  initials: string;
};

type UseProfileSectionProps = {
  userEmail: string;
  metadata: UserMetadata;
  onMetadataChange?: (metadata: UserMetadata) => void;
};

export function useProfileSection({
  userEmail,
  metadata,
  onMetadataChange,
}: UseProfileSectionProps): UseProfileSectionReturn {
  const derived = getUserNameParts(userEmail);
  const [firstName, setFirstName] = useState(metadata.first_name ?? derived.firstName);
  const [lastName, setLastName] = useState(metadata.last_name ?? derived.lastName);
  const [displayName, setDisplayName] = useState(metadata.display_name ?? derived.displayName);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(metadata.avatar_url ?? null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const photoInputRef = useRef<HTMLInputElement | null>(null);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const [profileSaveState, profileSave] = useSave();
  const [passwordSaveState, passwordSave] = useSave();

  // Sync when metadata arrives after initial render
  useEffect(() => {
    if (metadata.first_name !== undefined) setFirstName(metadata.first_name);
    if (metadata.last_name !== undefined) setLastName(metadata.last_name);
    if (metadata.display_name !== undefined) setDisplayName(metadata.display_name);
    if (metadata.avatar_url !== undefined) setAvatarUrl(metadata.avatar_url ?? null);
  }, [metadata.avatar_url, metadata.display_name, metadata.first_name, metadata.last_name]);

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarUrl(URL.createObjectURL(file));
  }

  function handleSaveProfile() {
    profileSave(async () => {
      const trimmedFirstName = firstName.trim();
      const trimmedLastName = lastName.trim();
      const trimmedDisplayName = displayName.trim();
      let nextAvatarUrl = metadata.avatar_url ?? null;

      if (avatarFile) {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;
        if (!user) throw new Error("No signed-in user");
        nextAvatarUrl = await uploadImage(avatarFile, user.id, "profile");
      }

      const nextMetadata: UserMetadata = {
        ...metadata,
        first_name: trimmedFirstName || undefined,
        last_name: trimmedLastName || undefined,
        display_name: trimmedDisplayName || undefined,
        avatar_url: nextAvatarUrl ?? undefined,
      };

      const { error } = await supabase.auth.updateUser({
        data: nextMetadata,
      });
      if (error) throw error;
      setAvatarFile(null);
      setAvatarUrl(nextAvatarUrl);
      onMetadataChange?.(nextMetadata);
    });
  }

  function handleSavePassword() {
    setPasswordError(null);
    if (newPassword.length < 8) { setPasswordError("New password must be at least 8 characters."); return; }
    if (newPassword !== confirmPassword) { setPasswordError("Passwords don't match."); return; }
    passwordSave(async () => {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setNewPassword("");
      setConfirmPassword("");
    });
  }

  const initials = (firstName.charAt(0) || userEmail.charAt(0) || "?").toUpperCase();

  return {
    firstName,
    setFirstName,
    lastName,
    setLastName,
    displayName,
    setDisplayName,
    avatarUrl,
    photoInputRef,
    newPassword,
    setNewPassword,
    confirmPassword,
    setConfirmPassword,
    passwordError,
    profileSaveState,
    passwordSaveState,
    handlePhotoChange,
    handleSaveProfile,
    handleSavePassword,
    initials,
  };
}
