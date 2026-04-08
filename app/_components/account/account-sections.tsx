"use client";

import React, { useState, useEffect } from "react";
import {
  FieldRow,
  TextInput,
  Toggle,
  SectionHeader,
  Divider,
  SaveButton,
} from "@/app/_components/account/account-form-ui";
import { supabase } from "@/app/_lib/supabase";
import { UserMetadata } from "@/app/_lib/user-profile";
import { useSave } from "@/app/_hooks/useSave";
import { useProfileSection } from "@/app/_hooks/useProfileSection";

// ── Profile ────────────────────────────────────────────────────

type ProfileSectionProps = {
  userEmail: string;
  metadata: UserMetadata;
  onMetadataChange?: (metadata: UserMetadata) => void;
};

export function ProfileSection({ userEmail, metadata, onMetadataChange }: ProfileSectionProps) {
  const {
    firstName, setFirstName,
    lastName, setLastName,
    displayName, setDisplayName,
    avatarUrl,
    photoInputRef,
    newPassword, setNewPassword,
    confirmPassword, setConfirmPassword,
    passwordError,
    profileSaveState,
    passwordSaveState,
    handlePhotoChange,
    handleSaveProfile,
    handleSavePassword,
    initials,
  } = useProfileSection({ userEmail, metadata, onMetadataChange });

  return (
    <div>
      <SectionHeader title="Profile" description="Your personal information and display name." />

      <div className="mb-6 flex items-center gap-4">
        <div className="relative group">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt="Profile photo"
              className="h-16 w-16 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#1e3a8a] text-xl font-semibold text-white">
              {initials}
            </div>
          )}
          <button
            type="button"
            onClick={() => photoInputRef.current?.click()}
            className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity"
            aria-label="Upload profile photo"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <path d="M3 13.5V15h1.5l8.83-8.83-1.5-1.5L3 13.5zm2.12-.71L13.5 4.41l.59.59-8.38 8.38-.59-.29v-.29zM14.71 3.29a1 1 0 00-1.42 0l-.88.88 1.5 1.5.88-.88a1 1 0 000-1.5z" fill="white" />
            </svg>
          </button>
          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            onChange={handlePhotoChange}
            className="hidden"
          />
        </div>
        <div>
          <div className="text-sm font-medium text-neutral-900">{displayName || `${firstName} ${lastName}`.trim() || "Your name"}</div>
          <div className="text-xs text-neutral-400">{userEmail}</div>
          <button
            type="button"
            onClick={() => photoInputRef.current?.click()}
            className="mt-1.5 text-xs text-neutral-500 hover:text-neutral-900 transition underline"
          >
            Change photo
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FieldRow label="First name">
            <TextInput placeholder="First name" value={firstName} onChange={setFirstName} />
          </FieldRow>
          <FieldRow label="Last name">
            <TextInput placeholder="Last name" value={lastName} onChange={setLastName} />
          </FieldRow>
        </div>
        <FieldRow label="Display name">
          <TextInput placeholder="How you appear to collaborators" value={displayName} onChange={setDisplayName} />
        </FieldRow>
        <FieldRow label="Email address">
          <div className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-sm text-neutral-500">
            {userEmail}
          </div>
          <p className="text-[11px] text-neutral-400">Contact support to change your email address.</p>
        </FieldRow>
      </div>

      <div className="mt-6">
        <SaveButton onSave={handleSaveProfile} saveState={profileSaveState} />
      </div>

      <Divider />
      <div className="text-xs font-medium text-neutral-400 uppercase tracking-[0.12em] mb-3">Change password</div>
      <div className="space-y-4">
        <FieldRow label="New password">
          <TextInput type="password" placeholder="Min 8 characters" value={newPassword} onChange={setNewPassword} />
        </FieldRow>
        <FieldRow label="Confirm new password">
          <TextInput type="password" placeholder="Re-enter new password" value={confirmPassword} onChange={setConfirmPassword} />
        </FieldRow>
        {passwordError && <p className="text-xs text-red-500">{passwordError}</p>}
      </div>
      <div className="mt-6">
        <SaveButton onSave={handleSavePassword} saveState={passwordSaveState} label="Update password" />
      </div>
    </div>
  );
}

// ── Business ───────────────────────────────────────────────────

type BusinessSectionProps = {
  metadata: UserMetadata;
  onStudioNameChange?: (name: string) => void;
};

const COUNTRIES = [
  "United States", "Canada", "United Kingdom", "Australia", "Germany",
  "France", "Japan", "South Korea", "Netherlands", "Sweden", "Other",
];

export function BusinessSection({ metadata, onStudioNameChange }: BusinessSectionProps) {
  const [studioName, setStudioName] = useState(metadata.studio_name ?? "");
  const [website, setWebsite] = useState(metadata.website ?? "");
  const [businessEmail, setBusinessEmail] = useState(metadata.business_email ?? "");
  const [country, setCountry] = useState(metadata.country ?? "");
  const [saveState, save] = useSave();

  useEffect(() => {
    if (metadata.studio_name !== undefined) setStudioName(metadata.studio_name);
    if (metadata.website !== undefined) setWebsite(metadata.website);
    if (metadata.business_email !== undefined) setBusinessEmail(metadata.business_email);
    if (metadata.country !== undefined) setCountry(metadata.country);
  }, [metadata.studio_name, metadata.website, metadata.business_email, metadata.country]);

  function handleSave() {
    save(async () => {
      const { error } = await supabase.auth.updateUser({
        data: { studio_name: studioName, website, business_email: businessEmail, country },
      });
      if (error) throw error;
      if (studioName) onStudioNameChange?.(studioName);
    });
  }

  return (
    <div>
      <SectionHeader title="Business info" description="Organization details shown on your published experiences." />
      <div className="space-y-4">
        <FieldRow label="Company / studio name">
          <TextInput placeholder="Your studio name" value={studioName} onChange={setStudioName} />
        </FieldRow>
        <FieldRow label="Website">
          <TextInput type="url" placeholder="https://yourstudio.com" value={website} onChange={setWebsite} />
        </FieldRow>
        <FieldRow label="Business email">
          <TextInput type="email" placeholder="hello@yourstudio.com" value={businessEmail} onChange={setBusinessEmail} />
        </FieldRow>
        <FieldRow label="Country / region">
          <select
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-sm text-neutral-900 outline-none placeholder:text-neutral-400 focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/10"
          >
            <option value="">Select a country</option>
            {COUNTRIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </FieldRow>
      </div>
      <div className="mt-6">
        <SaveButton onSave={handleSave} saveState={saveState} />
      </div>
    </div>
  );
}

// ── Security ───────────────────────────────────────────────────

type SecuritySectionProps = {
  metadata: UserMetadata;
};

export function SecuritySection({ metadata }: SecuritySectionProps) {
  const [loginNotifications, setLoginNotifications] = useState(metadata.security?.loginNotifications ?? true);
  const [sessionTimeout, setSessionTimeout] = useState(metadata.security?.sessionTimeout ?? false);
  const [saveState, save] = useSave();

  useEffect(() => {
    if (metadata.security?.loginNotifications !== undefined) setLoginNotifications(metadata.security.loginNotifications);
    if (metadata.security?.sessionTimeout !== undefined) setSessionTimeout(metadata.security.sessionTimeout);
  }, [metadata.security?.loginNotifications, metadata.security?.sessionTimeout]);

  function handleSave() {
    save(async () => {
      const { error } = await supabase.auth.updateUser({
        data: { security: { loginNotifications, sessionTimeout } },
      });
      if (error) throw error;
    });
  }

  return (
    <div>
      <SectionHeader title="Security & privacy" description="Manage two-factor authentication and session preferences." />
      <div className="space-y-4">
        <div className="flex items-center justify-between rounded-xl border border-neutral-200 px-4 py-3">
          <div>
            <div className="text-sm font-medium text-neutral-900">Two-factor authentication</div>
            <div className="mt-0.5 text-xs text-neutral-500">Require a one-time code in addition to your password.</div>
          </div>
          <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-[10px] font-semibold text-neutral-500">Coming soon</span>
        </div>
        <Divider />
        <Toggle
          label="Login notifications"
          description="Email whenever a new device or location signs into your account."
          checked={loginNotifications}
          onChange={setLoginNotifications}
        />
        <Toggle
          label="Session timeout"
          description="Automatically sign out after 30 minutes of inactivity."
          checked={sessionTimeout}
          onChange={setSessionTimeout}
        />
      </div>
      <div className="mt-6">
        <SaveButton onSave={handleSave} saveState={saveState} />
      </div>
      <Divider />
      <div className="text-xs font-medium text-neutral-400 uppercase tracking-[0.12em] mb-3">Data & privacy</div>
      <div className="space-y-3">
        <div className="w-full rounded-xl border border-neutral-200 px-4 py-3 text-sm text-neutral-400">
          Download my data <span className="text-xs">(coming soon)</span>
        </div>
        <div className="w-full rounded-xl border border-red-100 px-4 py-3 text-sm text-red-400">
          To delete your account, email <span className="font-medium">support@sherpa.app</span>
        </div>
      </div>
    </div>
  );
}

// ── Notifications ──────────────────────────────────────────────

type NotifState = {
  rulesChanges: boolean;
  publishingChanges: boolean;
  comments: boolean;
  teamInvitations: boolean;
  roleChanges: boolean;
  billing: boolean;
  planChanges: boolean;
};

type NotificationsSectionProps = {
  metadata: UserMetadata;
};

export function NotificationsSection({ metadata }: NotificationsSectionProps) {
  const [notifs, setNotifs] = useState<NotifState>({
    rulesChanges: metadata.notifications?.rulesChanges ?? true,
    publishingChanges: metadata.notifications?.publishingChanges ?? true,
    comments: metadata.notifications?.comments ?? false,
    teamInvitations: metadata.notifications?.teamInvitations ?? true,
    roleChanges: metadata.notifications?.roleChanges ?? true,
    billing: metadata.notifications?.billing ?? true,
    planChanges: metadata.notifications?.planChanges ?? true,
  });
  const [saveState, save] = useSave();

  useEffect(() => {
    const n = metadata.notifications;
    if (!n) return;
    setNotifs({
      rulesChanges: n.rulesChanges ?? true,
      publishingChanges: n.publishingChanges ?? true,
      comments: n.comments ?? false,
      teamInvitations: n.teamInvitations ?? true,
      roleChanges: n.roleChanges ?? true,
      billing: n.billing ?? true,
      planChanges: n.planChanges ?? true,
    });
  }, [metadata.notifications]);

  function set(key: keyof NotifState) {
    return (v: boolean) => setNotifs((prev) => ({ ...prev, [key]: v }));
  }

  function handleSave() {
    save(async () => {
      const { error } = await supabase.auth.updateUser({ data: { notifications: notifs } });
      if (error) throw error;
    });
  }

  return (
    <div>
      <SectionHeader title="Notifications" description="Choose which emails you receive." />

      <div className="text-xs font-medium text-neutral-400 uppercase tracking-[0.12em] mb-3">Rules & content</div>
      <div className="space-y-4">
        <Toggle label="Rules changes" description="Email when a collaborator edits or adds content to any experience." checked={notifs.rulesChanges} onChange={set("rulesChanges")} />
        <Toggle label="Publishing changes" description="Email when an experience is published, unpublished, or archived." checked={notifs.publishingChanges} onChange={set("publishingChanges")} />
        <Toggle label="Comments & feedback" description="Email when someone leaves a comment on your content." checked={notifs.comments} onChange={set("comments")} />
      </div>

      <Divider />
      <div className="text-xs font-medium text-neutral-400 uppercase tracking-[0.12em] mb-3">Team</div>
      <div className="space-y-4">
        <Toggle label="Team invitations" description="Email when someone is invited to or removed from a workspace." checked={notifs.teamInvitations} onChange={set("teamInvitations")} />
        <Toggle label="Role changes" description="Email when a team member's access level changes." checked={notifs.roleChanges} onChange={set("roleChanges")} />
      </div>

      <Divider />
      <div className="text-xs font-medium text-neutral-400 uppercase tracking-[0.12em] mb-3">Billing</div>
      <div className="space-y-4">
        <Toggle label="Billing & subscription" description="Receipts, renewal reminders, and payment failure alerts." checked={notifs.billing} onChange={set("billing")} />
        <Toggle label="Plan changes" description="Email when your subscription is upgraded, downgraded, or cancelled." checked={notifs.planChanges} onChange={set("planChanges")} />
      </div>

      <div className="mt-6">
        <SaveButton onSave={handleSave} saveState={saveState} />
      </div>
    </div>
  );
}

// ── Sessions ───────────────────────────────────────────────────

type SessionsSectionProps = {
  userDisplayName: string;
  userAvatarUrl?: string | null;
  userInitial: string;
};

export function SessionsSection({ userDisplayName, userAvatarUrl, userInitial }: SessionsSectionProps) {
  return (
    <div>
      <SectionHeader title="Session history" description="Your active sessions and recent account activity." />

      <div className="text-xs font-medium text-neutral-400 uppercase tracking-[0.12em] mb-3">Active sessions</div>
      <div className="mb-6 rounded-xl border border-neutral-200 px-4 py-3">
        <div className="flex items-center gap-3">
          {userAvatarUrl ? (
            <img
              src={userAvatarUrl}
              alt={userDisplayName || "Profile photo"}
              className="h-8 w-8 shrink-0 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#1e3a8a] text-xs font-semibold text-white">
              {userInitial}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-neutral-900">Current browser session</span>
              <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-emerald-700">
                Active now
              </span>
            </div>
            <div className="mt-0.5 text-xs text-neutral-400">{userDisplayName}</div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-neutral-100 bg-neutral-50 px-4 py-3 text-xs text-neutral-400 leading-5">
        Full session history and remote session revocation are coming in a future update.
      </div>
    </div>
  );
}

// ── Team ───────────────────────────────────────────────────────

type TeamSectionProps = {
  userDisplayName: string;
  userEmail: string;
  userAvatarUrl?: string | null;
  userInitial: string;
};

export function TeamSection({ userDisplayName, userEmail, userAvatarUrl, userInitial }: TeamSectionProps) {
  return (
    <div>
      <SectionHeader title="Team & access" description="Invite collaborators and manage their permissions." />

      <div className="mb-4 rounded-2xl border border-neutral-200 overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3">
          {userAvatarUrl ? (
            <img
              src={userAvatarUrl}
              alt={userDisplayName || "Profile photo"}
              className="h-8 w-8 shrink-0 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#1e3a8a] text-xs font-semibold text-white">
              {userInitial}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium text-neutral-900">{userDisplayName}</div>
            <div className="text-xs text-neutral-400">{userEmail}</div>
          </div>
          <span className="rounded-full bg-[#3B82F6] px-2.5 py-1 text-[10px] font-semibold text-white">Admin</span>
        </div>
      </div>

      <div className="rounded-xl border border-neutral-100 bg-neutral-50 px-4 py-3 text-xs text-neutral-400 leading-5">
        Multi-user collaboration and team invitations are coming in a future update.
      </div>
    </div>
  );
}

// ── Language ───────────────────────────────────────────────────

const LANGUAGE_OPTIONS = [
  { value: "en", label: "English (US)" },
  { value: "en-gb", label: "English (UK)" },
  { value: "fr", label: "Français" },
  { value: "de", label: "Deutsch" },
  { value: "es", label: "Español" },
  { value: "ja", label: "日本語" },
  { value: "zh", label: "中文（简体）" },
  { value: "ko", label: "한국어" },
];

const LANGUAGE_STORAGE_KEY = "sherpa-interface-language";

type LanguageSectionProps = {
  metadata: UserMetadata;
};

export function LanguageSection({ metadata }: LanguageSectionProps) {
  const [language, setLanguage] = useState(() => {
    if (metadata.language) return metadata.language;
    if (typeof window !== "undefined") return localStorage.getItem(LANGUAGE_STORAGE_KEY) ?? "en";
    return "en";
  });
  const [saveState, save] = useSave();

  useEffect(() => {
    if (metadata.language) setLanguage(metadata.language);
  }, [metadata.language]);

  function handleSave() {
    save(async () => {
      if (typeof window !== "undefined") localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
      const { error } = await supabase.auth.updateUser({ data: { language } });
      if (error) throw error;
    });
  }

  return (
    <div>
      <SectionHeader title="Language" description="Set the language used throughout the Sherpa authoring interface." />
      <FieldRow label="Interface language">
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-sm text-neutral-900 outline-none placeholder:text-neutral-400 focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/10"
        >
          {LANGUAGE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </FieldRow>
      <p className="mt-3 text-xs text-neutral-400">
        This only changes the language of the authoring tool. It does not affect your published experience.
      </p>
      <div className="mt-6">
        <SaveButton onSave={handleSave} saveState={saveState} label="Save" />
      </div>
    </div>
  );
}

// ── Billing ────────────────────────────────────────────────────

export function BillingSection() {
  return (
    <div>
      <SectionHeader title="Billing" description="Manage your subscription and payment details." />
      <div className="rounded-xl border border-neutral-100 bg-neutral-50 px-5 py-10 text-center">
        <div className="text-sm font-medium text-neutral-600">Billing management is coming soon.</div>
        <p className="mt-1.5 text-xs text-neutral-400">
          Subscription plans, invoices, and payment methods will appear here.
        </p>
      </div>
    </div>
  );
}

// ── Terms ──────────────────────────────────────────────────────

export function TermsSection() {
  return (
    <div>
      <SectionHeader title="Terms of service" description="Last updated March 1, 2026." />
      <div className="prose-sm space-y-4 text-sm text-neutral-700 leading-6">
        <p>By using Sherpa, you agree to the following terms. These terms govern your access to and use of Sherpa&apos;s authoring tools, APIs, and related services.</p>
        <div className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-400 pt-2">1. Acceptance</div>
        <p>By creating an account or using the Service, you accept these Terms. If you do not agree, do not use the Service.</p>
        <div className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-400 pt-2">2. Content ownership</div>
        <p>You retain all intellectual property rights in the content you upload to Sherpa, including game rules, images, and brand assets. By uploading content, you grant Sherpa a limited, non-exclusive license to store, display, and serve that content solely for the purpose of providing the Service to you.</p>
        <p>Sherpa will not sell, license, or otherwise transfer your content to third parties, and will not use your content to train AI models without your explicit written consent.</p>
        <div className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-400 pt-2">3. Acceptable use</div>
        <p>You agree not to use the Service to upload content that infringes on third-party intellectual property, violates applicable law, or is otherwise harmful or deceptive.</p>
        <div className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-400 pt-2">4. Termination</div>
        <p>Either party may terminate the service relationship at any time. Upon termination, you may export your content. Sherpa will retain data for 30 days following termination before deletion.</p>
        <div className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-400 pt-2">5. Disclaimer</div>
        <p className="italic text-neutral-500">This is a draft terms summary for internal review. Consult qualified legal counsel before using in a paid production context.</p>
      </div>
    </div>
  );
}

// ── Privacy ────────────────────────────────────────────────────

export function PrivacySection() {
  return (
    <div>
      <SectionHeader title="Privacy policy" description="Last updated March 1, 2026." />
      <div className="prose-sm space-y-4 text-sm text-neutral-700 leading-6">
        <p>Sherpa takes your privacy seriously. This policy describes what data we collect, how we use it, and your rights regarding that data.</p>
        <div className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-400 pt-2">Data we collect</div>
        <p>We collect account information (name, email, password), usage data (sessions, actions taken in the authoring tool), and content you upload (images, text, configuration data).</p>
        <div className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-400 pt-2">How we use it</div>
        <p>Data is used to operate the Service, send transactional emails you&apos;ve opted into, and improve the product. We do not sell your personal data or use your uploaded content for advertising.</p>
        <div className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-400 pt-2">Your rights</div>
        <p>Depending on your jurisdiction, you may have rights to access, correct, or delete your data. To exercise these rights, contact support. GDPR users may also request data portability.</p>
        <div className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-400 pt-2">Data retention</div>
        <p>We retain account data while your account is active and for 30 days after deletion, unless a longer period is required by law.</p>
        <div className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-400 pt-2">Contact</div>
        <p>Questions? Email <span className="font-medium text-neutral-900">privacy@sherpa.app</span>.</p>
        <p className="italic text-neutral-500">This is a draft privacy policy for internal review. Consult qualified legal counsel before using in a paid production context.</p>
      </div>
    </div>
  );
}
