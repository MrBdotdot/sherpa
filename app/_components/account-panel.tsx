"use client";

import { useState, useEffect } from "react";
import React from "react";
import {
  ProfileSection,
  BusinessSection,
  SecuritySection,
  NotificationsSection,
  SessionsSection,
  TeamSection,
  LanguageSection,
  BillingSection,
  TermsSection,
  PrivacySection,
  type UserMetadata,
} from "@/app/_components/account/account-sections";
import { getUserNameParts } from "@/app/_lib/user-display";
import { supabase } from "@/app/_lib/supabase";

type AccountSection =
  | "profile"
  | "business"
  | "security"
  | "notifications"
  | "sessions"
  | "team"
  | "language"
  | "billing"
  | "terms"
  | "privacy"
  | "appearance";

type AccountPanelProps = {
  isOpen: boolean;
  onClose: () => void;
  userEmail: string;
  onSignOut: () => void;
  onStudioNameChange?: (name: string) => void;
  studioDarkMode?: boolean;
  onStudioDarkModeChange?: (v: boolean) => void;
};

const NAV_GROUPS: {
  label: string;
  items: { id: AccountSection; label: string; icon: React.ReactNode }[];
}[] = [
  {
    label: "Personal",
    items: [
      {
        id: "profile",
        label: "Profile",
        icon: (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle cx="7" cy="4.5" r="2.5" stroke="currentColor" strokeWidth="1.4" />
            <path d="M1.5 12.5c0-2.485 2.462-4.5 5.5-4.5s5.5 2.015 5.5 4.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
        ),
      },
      {
        id: "business",
        label: "Business info",
        icon: (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <rect x="1.5" y="4.5" width="11" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
            <path d="M4.5 4.5V3a2.5 2.5 0 015 0v1.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
        ),
      },
      {
        id: "notifications",
        label: "Notifications",
        icon: (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 1.5A3.5 3.5 0 003.5 5v2.5L2 9h10l-1.5-1.5V5A3.5 3.5 0 007 1.5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
            <path d="M5.5 9v.5a1.5 1.5 0 003 0V9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
        ),
      },
      {
        id: "language",
        label: "Language",
        icon: (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.4" />
            <path d="M7 1.5C7 1.5 5 4 5 7s2 5.5 2 5.5M7 1.5C7 1.5 9 4 9 7s-2 5.5-2 5.5M1.5 7h11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
        ),
      },
    ],
  },
  {
    label: "Security",
    items: [
      {
        id: "security",
        label: "Security & privacy",
        icon: (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 1L2 3v4c0 3 2.2 5.4 5 6 2.8-.6 5-3 5-6V3L7 1z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
          </svg>
        ),
      },
      {
        id: "sessions",
        label: "Session history",
        icon: (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.4" />
            <path d="M7 4v3l2 1.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ),
      },
    ],
  },
  {
    label: "Team",
    items: [
      {
        id: "team",
        label: "Team & access",
        icon: (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle cx="5" cy="4" r="2" stroke="currentColor" strokeWidth="1.4" />
            <circle cx="10" cy="4" r="2" stroke="currentColor" strokeWidth="1.4" />
            <path d="M1 11c0-2 1.79-3.5 4-3.5s4 1.5 4 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            <path d="M10 7.5c1.5 0 3 1 3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
        ),
      },
    ],
  },
  {
    label: "Account",
    items: [
      {
        id: "billing",
        label: "Billing",
        icon: (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <rect x="1.5" y="3" width="11" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
            <path d="M1.5 6h11" stroke="currentColor" strokeWidth="1.4" />
          </svg>
        ),
      },
    ],
  },
  {
    label: "Studio",
    items: [
      {
        id: "appearance" as AccountSection,
        label: "Appearance",
        icon: (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.4" />
            <path d="M7 1.5v11M1.5 7h11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeDasharray="2 2" />
          </svg>
        ),
      },
    ],
  },
  {
    label: "Legal",
    items: [
      {
        id: "terms",
        label: "Terms of service",
        icon: (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <rect x="2" y="1" width="10" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
            <path d="M4.5 5h5M4.5 7.5h5M4.5 10h3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
        ),
      },
      {
        id: "privacy",
        label: "Privacy policy",
        icon: (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 1L2 3v4c0 3 2.2 5.4 5 6 2.8-.6 5-3 5-6V3L7 1z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
            <path d="M4.5 7l2 2 3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ),
      },
    ],
  },
];

export function AccountPanel({ isOpen, onClose, userEmail, onSignOut, onStudioNameChange, studioDarkMode = false, onStudioDarkModeChange }: AccountPanelProps) {
  const { displayName, initial } = getUserNameParts(userEmail);
  const [activeSection, setActiveSection] = useState<AccountSection>("profile");
  const [metadata, setMetadata] = useState<UserMetadata>({});
  const [metadataLoading, setMetadataLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setMetadataLoading(true);
    supabase.auth.getUser().then(({ data: { user } }) => {
      setMetadata((user?.user_metadata as UserMetadata) ?? {});
      setMetadataLoading(false);
    }).catch(() => setMetadataLoading(false));
  }, [isOpen]);

  if (!isOpen) return null;

  let sectionContent: React.ReactNode;
  if (metadataLoading) {
    sectionContent = (
      <div className="flex h-full items-center justify-center">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-neutral-200 border-t-neutral-600" />
      </div>
    );
  } else {
    switch (activeSection) {
      case "profile":
        sectionContent = <ProfileSection userEmail={userEmail} metadata={metadata} />;
        break;
      case "business":
        sectionContent = <BusinessSection metadata={metadata} onStudioNameChange={onStudioNameChange} />;
        break;
      case "security":
        sectionContent = <SecuritySection metadata={metadata} />;
        break;
      case "notifications":
        sectionContent = <NotificationsSection metadata={metadata} />;
        break;
      case "sessions":
        sectionContent = <SessionsSection userDisplayName={displayName} />;
        break;
      case "team":
        sectionContent = <TeamSection userDisplayName={displayName} userEmail={userEmail} />;
        break;
      case "language":
        sectionContent = <LanguageSection metadata={metadata} />;
        break;
      case "billing":
        sectionContent = <BillingSection />;
        break;
      case "terms":
        sectionContent = <TermsSection />;
        break;
      case "privacy":
        sectionContent = <PrivacySection />;
        break;
      case "appearance":
        sectionContent = (
          <div>
            <div className="mb-6">
              <h2 className="text-base font-semibold text-neutral-900">Appearance</h2>
              <p className="mt-1 text-sm text-neutral-500">Customize how the studio looks for you. These settings are saved to this browser only.</p>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-xl border border-neutral-200 px-4 py-3.5">
                <div>
                  <div className="text-sm font-medium text-neutral-900">Dark studio</div>
                  <div className="mt-0.5 text-xs text-neutral-500">Applies a dark theme to the left nav, toolbar, and editing panel.</div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={studioDarkMode}
                  onClick={() => onStudioDarkModeChange?.(!studioDarkMode)}
                  className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${studioDarkMode ? "bg-neutral-900" : "bg-neutral-200"}`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${studioDarkMode ? "translate-x-4" : ""}`}
                  />
                </button>
              </div>
            </div>
          </div>
        );
        break;
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <button
        type="button"
        aria-label="Close account settings"
        onClick={onClose}
        className="absolute inset-0"
      />
      <div
        className="relative flex w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl"
        style={{ height: "min(82vh, 680px)" }}
        role="dialog"
        aria-modal="true"
        aria-label="Account settings"
      >
        {/* Left nav */}
        <div className="flex w-52 shrink-0 flex-col border-r border-neutral-100 bg-neutral-50">
          <div className="border-b border-neutral-100 px-4 py-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-900 text-sm font-semibold text-white">
                {initial}
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-neutral-900">{displayName}</div>
                <div className="truncate text-[11px] text-neutral-400">{userEmail}</div>
              </div>
            </div>
          </div>

          <nav className="flex-1 overflow-y-auto px-2 py-3">
            {NAV_GROUPS.map((group) => (
              <div key={group.label} className="mb-4">
                <div className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-400">
                  {group.label}
                </div>
                {group.items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveSection(item.id)}
                    className={`mb-0.5 flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-sm transition ${
                      activeSection === item.id
                        ? "bg-white font-medium text-neutral-900 shadow-sm"
                        : "text-neutral-500 hover:bg-white/70 hover:text-neutral-700"
                    }`}
                  >
                    <span className={activeSection === item.id ? "text-neutral-900" : "text-neutral-400"}>
                      {item.icon}
                    </span>
                    {item.label}
                  </button>
                ))}
              </div>
            ))}
          </nav>

          <div className="border-t border-neutral-100 px-3 py-3">
            <button
              type="button"
              onClick={onSignOut}
              className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-sm text-red-500 hover:bg-red-50"
            >
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                <path d="M5 1H2a1 1 0 00-1 1v9a1 1 0 001 1h3M9 9.5L12 6.5M12 6.5L9 3.5M12 6.5H5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Sign out
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex shrink-0 items-center justify-between border-b border-neutral-100 px-6 py-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-400">
              Account settings
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
              aria-label="Close"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-6">
            {sectionContent}
          </div>
        </div>
      </div>
    </div>
  );
}
