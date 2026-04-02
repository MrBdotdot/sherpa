"use client";

import { useState } from "react";
import { FieldRow, TextInput, Toggle, SectionHeader, Divider } from "@/app/_components/account/account-form-ui";

// ── Profile ────────────────────────────────────────────────────

export function ProfileSection() {
  return (
    <div>
      <SectionHeader title="Profile" description="Your personal information and display name." />

      <div className="mb-6 flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-neutral-900 text-xl font-semibold text-white">
          A
        </div>
        <button
          type="button"
          className="rounded-xl border border-neutral-200 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
        >
          Change photo
        </button>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FieldRow label="First name">
            <TextInput placeholder="First name" defaultValue="Admin" />
          </FieldRow>
          <FieldRow label="Last name">
            <TextInput placeholder="Last name" defaultValue="User" />
          </FieldRow>
        </div>
        <FieldRow label="Email address">
          <TextInput type="email" placeholder="you@example.com" defaultValue="admin@studio.com" />
        </FieldRow>
        <FieldRow label="Display name">
          <TextInput placeholder="How you appear to collaborators" defaultValue="Admin User" />
        </FieldRow>
      </div>

      <Divider />
      <div className="text-xs font-medium text-neutral-400 uppercase tracking-[0.12em] mb-3">Change password</div>
      <div className="space-y-4">
        <FieldRow label="Current password">
          <TextInput type="password" placeholder="••••••••" />
        </FieldRow>
        <FieldRow label="New password">
          <TextInput type="password" placeholder="Min 12 characters" />
        </FieldRow>
        <FieldRow label="Confirm new password">
          <TextInput type="password" placeholder="Re-enter new password" />
        </FieldRow>
      </div>

      <div className="mt-6">
        <button
          type="button"
          className="rounded-xl bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-700"
        >
          Save changes
        </button>
      </div>
    </div>
  );
}

// ── Business ───────────────────────────────────────────────────

export function BusinessSection() {
  return (
    <div>
      <SectionHeader title="Business info" description="Organization details shown on your published experiences." />
      <div className="space-y-4">
        <FieldRow label="Company / studio name">
          <TextInput placeholder="Your studio name" />
        </FieldRow>
        <FieldRow label="Website">
          <TextInput type="url" placeholder="https://yourstudio.com" />
        </FieldRow>
        <FieldRow label="Business email">
          <TextInput type="email" placeholder="hello@yourstudio.com" />
        </FieldRow>
        <FieldRow label="Country / region">
          <select className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm text-neutral-900 outline-none focus:border-neutral-400">
            <option value="">Select a country</option>
            <option>United States</option>
            <option>Canada</option>
            <option>United Kingdom</option>
            <option>Germany</option>
            <option>Japan</option>
          </select>
        </FieldRow>
      </div>
      <div className="mt-6">
        <button type="button" className="rounded-xl bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-700">
          Save changes
        </button>
      </div>
    </div>
  );
}

// ── Security ───────────────────────────────────────────────────

export function SecuritySection() {
  return (
    <div>
      <SectionHeader title="Security & privacy" description="Manage password, two-factor authentication, and data preferences." />

      <div className="space-y-4">
        <Toggle
          label="Two-factor authentication"
          description="Require a one-time code in addition to your password when signing in."
          defaultChecked={false}
        />
        <Divider />
        <Toggle
          label="Login notifications"
          description="Send an email whenever a new device or location signs into your account."
          defaultChecked={true}
        />
        <Toggle
          label="Session timeout"
          description="Automatically sign out after 30 minutes of inactivity."
          defaultChecked={false}
        />
      </div>

      <Divider />
      <div className="text-xs font-medium text-neutral-400 uppercase tracking-[0.12em] mb-3">Data & privacy</div>
      <div className="space-y-3">
        <button type="button" className="w-full rounded-xl border border-neutral-200 px-4 py-3 text-left text-sm font-medium text-neutral-700 hover:bg-neutral-50">
          Download my data
        </button>
        <button type="button" className="w-full rounded-xl border border-red-100 px-4 py-3 text-left text-sm font-medium text-red-600 hover:bg-red-50">
          Delete account
        </button>
      </div>
    </div>
  );
}

// ── Notifications ──────────────────────────────────────────────

export function NotificationsSection() {
  return (
    <div>
      <SectionHeader title="Notifications" description="Choose which emails you receive. You can turn off any category." />

      <div className="text-xs font-medium text-neutral-400 uppercase tracking-[0.12em] mb-3">Rules & content</div>
      <div className="space-y-4">
        <Toggle label="Rules changes" description="Email when a collaborator edits or adds content to any experience." defaultChecked={true} />
        <Toggle label="Publishing changes" description="Email when an experience is published, unpublished, or archived." defaultChecked={true} />
        <Toggle label="Comments & feedback" description="Email when someone leaves a comment on your content." defaultChecked={false} />
      </div>

      <Divider />
      <div className="text-xs font-medium text-neutral-400 uppercase tracking-[0.12em] mb-3">Team</div>
      <div className="space-y-4">
        <Toggle label="Team invitations" description="Email when someone is invited to or removed from a workspace." defaultChecked={true} />
        <Toggle label="Role changes" description="Email when a team member's access level changes." defaultChecked={true} />
      </div>

      <Divider />
      <div className="text-xs font-medium text-neutral-400 uppercase tracking-[0.12em] mb-3">Billing</div>
      <div className="space-y-4">
        <Toggle label="Billing & subscription" description="Receipts, renewal reminders, and payment failure alerts." defaultChecked={true} />
        <Toggle label="Plan changes" description="Email when your subscription is upgraded, downgraded, or cancelled." defaultChecked={true} />
      </div>

      <div className="mt-6">
        <button type="button" className="rounded-xl bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-700">
          Save preferences
        </button>
      </div>
    </div>
  );
}

// ── Sessions ───────────────────────────────────────────────────

type Session = { id: string; device: string; location: string; date: string; current: boolean };
type HistoryEntry = { id: string; action: string; user: string; date: string };

const MOCK_SESSIONS: Session[] = [
  { id: "s1", device: "Chrome on macOS", location: "New York, US", date: "Now", current: true },
  { id: "s2", device: "Safari on iPhone", location: "New York, US", date: "2 hours ago", current: false },
  { id: "s3", device: "Chrome on Windows", location: "Los Angeles, US", date: "Yesterday", current: false },
  { id: "s4", device: "Firefox on macOS", location: "Chicago, US", date: "3 days ago", current: false },
];

const MOCK_HISTORY: HistoryEntry[] = [
  { id: "h1", action: "Published \"Bloodborne: The Card Game\" rules", user: "Admin User", date: "Today, 2:14 PM" },
  { id: "h2", action: "Edited hotspot: \"Phase 2 — Combat\"", user: "Admin User", date: "Today, 1:52 PM" },
  { id: "h3", action: "Added canvas feature: QR code", user: "Jane Editor", date: "Yesterday, 4:33 PM" },
  { id: "h4", action: "Created container: \"Full Rules\"", user: "Admin User", date: "Mar 24, 11:05 AM" },
  { id: "h5", action: "Invited jane@studio.com as Editor", user: "Admin User", date: "Mar 23, 9:18 AM" },
];

export function SessionsSection() {
  return (
    <div>
      <SectionHeader title="Session history" description="Active sessions and a log of recent changes to this experience." />

      <div className="text-xs font-medium text-neutral-400 uppercase tracking-[0.12em] mb-3">Active sessions</div>
      <div className="space-y-2 mb-6">
        {MOCK_SESSIONS.map((session) => (
          <div key={session.id} className="flex items-center gap-3 rounded-xl border border-neutral-200 px-4 py-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-neutral-900">{session.device}</span>
                {session.current && (
                  <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-emerald-700">
                    This session
                  </span>
                )}
              </div>
              <div className="mt-0.5 text-xs text-neutral-400">{session.location} · {session.date}</div>
            </div>
            {!session.current && (
              <button type="button" className="shrink-0 text-xs text-red-500 hover:text-red-700">
                Revoke
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="text-xs font-medium text-neutral-400 uppercase tracking-[0.12em] mb-3">Change log</div>
      <div className="space-y-1">
        {MOCK_HISTORY.map((entry) => (
          <div key={entry.id} className="flex items-start gap-3 rounded-xl px-4 py-3 hover:bg-neutral-50">
            <div className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-neutral-300 mt-1.5" />
            <div className="min-w-0 flex-1">
              <div className="text-sm text-neutral-800">{entry.action}</div>
              <div className="mt-0.5 text-xs text-neutral-400">{entry.user} · {entry.date}</div>
            </div>
            <button type="button" className="shrink-0 text-xs text-neutral-400 hover:text-neutral-700">
              Restore
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Team ───────────────────────────────────────────────────────

type TeamMember = { id: string; name: string; email: string; role: "admin" | "editor" | "viewer"; status: "active" | "invited" };

const MOCK_TEAM: TeamMember[] = [
  { id: "m1", name: "Admin User", email: "admin@studio.com", role: "admin", status: "active" },
  { id: "m2", name: "Jane Editor", email: "jane@studio.com", role: "editor", status: "active" },
  { id: "m3", name: "Sam Viewer", email: "sam@client.com", role: "viewer", status: "invited" },
];

const ROLE_OPTIONS: { value: TeamMember["role"]; label: string }[] = [
  { value: "admin", label: "Admin" },
  { value: "editor", label: "Editor" },
  { value: "viewer", label: "Viewer" },
];

export function TeamSection() {
  const [members, setMembers] = useState<TeamMember[]>(MOCK_TEAM);

  function changeRole(id: string, role: TeamMember["role"]) {
    setMembers((prev) => prev.map((m) => (m.id === id ? { ...m, role } : m)));
  }

  function removeMember(id: string) {
    setMembers((prev) => prev.filter((m) => m.id !== id));
  }

  return (
    <div>
      <SectionHeader title="Team & access" description="Invite collaborators and manage their permissions for this game." />

      <div className="mb-4 flex gap-2">
        <input
          type="email"
          placeholder="Invite by email address"
          className="min-w-0 flex-1 rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm outline-none placeholder:text-neutral-400 focus:border-neutral-400"
        />
        <select className="rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm text-neutral-700 outline-none focus:border-neutral-400">
          {ROLE_OPTIONS.map((r) => (
            <option key={r.value} value={r.value}>{r.label}</option>
          ))}
        </select>
        <button type="button" className="shrink-0 rounded-xl bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-700">
          Invite
        </button>
      </div>

      <div className="rounded-2xl border border-neutral-200 divide-y divide-neutral-100 overflow-hidden">
        {members.map((member) => (
          <div key={member.id} className="flex items-center gap-3 px-4 py-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-xs font-semibold text-neutral-600">
              {member.name[0]}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-neutral-900">{member.name}</span>
                {member.status === "invited" && (
                  <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-amber-700">
                    Pending
                  </span>
                )}
              </div>
              <div className="text-xs text-neutral-400">{member.email}</div>
            </div>
            <select
              value={member.role}
              onChange={(e) => changeRole(member.id, e.target.value as TeamMember["role"])}
              className="rounded-lg border border-neutral-200 bg-neutral-50 px-2 py-1.5 text-xs font-medium text-neutral-700 outline-none focus:border-neutral-400"
            >
              {ROLE_OPTIONS.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => removeMember(member.id)}
              className="shrink-0 rounded-lg p-1.5 text-neutral-400 hover:bg-red-50 hover:text-red-500"
              aria-label={`Remove ${member.name}`}
            >
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                <path d="M1 1l11 11M12 1L1 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-xs text-neutral-500 leading-5">
        <strong className="text-neutral-700">Roles:</strong> Admins can invite, manage, and publish. Editors can create and edit content. Viewers can review content but cannot make changes.
        Multiple admins are supported so access is never tied to a single person.
      </div>
    </div>
  );
}

// ── Language ───────────────────────────────────────────────────

export function LanguageSection() {
  return (
    <div>
      <SectionHeader title="Language" description="Set the language used throughout the Sherpa interface." />
      <FieldRow label="Interface language">
        <select className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm text-neutral-900 outline-none focus:border-neutral-400">
          <option value="en">English (US)</option>
          <option value="en-gb">English (UK)</option>
          <option value="fr">Français</option>
          <option value="de">Deutsch</option>
          <option value="es">Español</option>
          <option value="ja">日本語</option>
          <option value="zh">中文（简体）</option>
          <option value="ko">한국어</option>
        </select>
      </FieldRow>
      <p className="mt-3 text-xs text-neutral-400">
        Changing the interface language affects only the authoring tool, not your published experiences.
      </p>
      <div className="mt-6">
        <button type="button" className="rounded-xl bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-700">
          Save
        </button>
      </div>
    </div>
  );
}

// ── Billing ────────────────────────────────────────────────────

export function BillingSection() {
  return (
    <div>
      <SectionHeader title="Billing" description="Manage your subscription and payment details." />

      <div className="rounded-2xl border border-neutral-200 bg-neutral-50 px-5 py-4 mb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-400 mb-1">Current plan</div>
            <div className="text-lg font-semibold text-neutral-900">Pro Studio</div>
            <div className="mt-1 text-sm text-neutral-500">Renews on April 27, 2026</div>
          </div>
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">Active</span>
        </div>
        <div className="mt-4 flex gap-2">
          <button type="button" className="rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50">
            Change plan
          </button>
          <button type="button" className="rounded-xl border border-red-100 bg-white px-4 py-2 text-sm font-medium text-red-500 hover:bg-red-50">
            Cancel subscription
          </button>
        </div>
      </div>

      <div className="text-xs font-medium text-neutral-400 uppercase tracking-[0.12em] mb-3">Payment method</div>
      <div className="rounded-2xl border border-neutral-200 px-4 py-3 flex items-center gap-3 mb-6">
        <div className="h-7 w-10 rounded bg-neutral-200 flex items-center justify-center text-[10px] font-bold text-neutral-500">VISA</div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium text-neutral-900">Visa ending in 4242</div>
          <div className="text-xs text-neutral-400">Expires 08 / 2027</div>
        </div>
        <button type="button" className="text-xs text-neutral-500 hover:text-neutral-700">Update</button>
      </div>

      <div className="text-xs font-medium text-neutral-400 uppercase tracking-[0.12em] mb-3">Recent invoices</div>
      <div className="rounded-2xl border border-neutral-200 divide-y divide-neutral-100 overflow-hidden">
        {[
          { label: "Pro Studio — March 2026", amount: "$49.00", date: "Mar 1, 2026" },
          { label: "Pro Studio — February 2026", amount: "$49.00", date: "Feb 1, 2026" },
          { label: "Pro Studio — January 2026", amount: "$49.00", date: "Jan 1, 2026" },
        ].map((inv) => (
          <div key={inv.label} className="flex items-center gap-3 px-4 py-3">
            <div className="min-w-0 flex-1">
              <div className="text-sm text-neutral-800">{inv.label}</div>
              <div className="text-xs text-neutral-400">{inv.date}</div>
            </div>
            <div className="text-sm font-medium text-neutral-900">{inv.amount}</div>
            <button type="button" className="text-xs text-neutral-400 hover:text-neutral-700">PDF</button>
          </div>
        ))}
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
        <p className="text-neutral-500 italic">This is a draft terms summary for internal review. Consult qualified legal counsel before using in a paid production context.</p>
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
        <p>Depending on your jurisdiction, you may have rights to access, correct, or delete your data. To exercise these rights, contact support. GDPR users may also request data portability. CCPA users may opt out of the sale of personal information (we do not sell it).</p>
        <div className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-400 pt-2">Data retention</div>
        <p>We retain account data while your account is active and for 30 days after deletion, unless a longer period is required by law.</p>
        <div className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-400 pt-2">Contact</div>
        <p>Questions about this policy? Email <span className="text-neutral-900 font-medium">privacy@sherpa.app</span>.</p>
        <p className="text-neutral-500 italic">This is a draft privacy policy for internal review. Consult qualified legal counsel before using in a paid production context.</p>
      </div>
    </div>
  );
}
