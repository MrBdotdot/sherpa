"use client";

import React, { useState, useEffect } from "react";
import { ContentBlock } from "@/app/_lib/authoring-types";

const CONSENT_QUEUE_KEY = "sherpa_consent_queue";

type QueuedConsent = {
  id: string;
  payload: Record<string, string>;
  queuedAt: string;
};

async function submitToWeb3Forms(payload: Record<string, string>): Promise<boolean> {
  try {
    const res = await fetch("https://api.web3forms.com/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(payload),
    });
    return res.ok;
  } catch {
    return false;
  }
}

function queueConsent(payload: Record<string, string>): void {
  try {
    const existing: QueuedConsent[] = JSON.parse(
      localStorage.getItem(CONSENT_QUEUE_KEY) ?? "[]"
    );
    existing.push({ id: crypto.randomUUID(), payload, queuedAt: new Date().toISOString() });
    localStorage.setItem(CONSENT_QUEUE_KEY, JSON.stringify(existing));
  } catch { /* ignore */ }
}

async function flushConsentQueue(): Promise<void> {
  try {
    const raw = localStorage.getItem(CONSENT_QUEUE_KEY);
    if (!raw) return;
    const queue: QueuedConsent[] = JSON.parse(raw);
    if (queue.length === 0) return;
    const remaining: QueuedConsent[] = [];
    for (const item of queue) {
      const ok = await submitToWeb3Forms(item.payload);
      if (!ok) remaining.push(item);
    }
    if (remaining.length === 0) {
      localStorage.removeItem(CONSENT_QUEUE_KEY);
    } else {
      localStorage.setItem(CONSENT_QUEUE_KEY, JSON.stringify(remaining));
    }
  } catch { /* ignore */ }
}

function parseConsentConfig(value: string) {
  try {
    const p = JSON.parse(value);
    return {
      statement: (p.statement as string) ?? "",
      endpoint: (p.endpoint as string) ?? "",
      requireEmail: (p.requireEmail as boolean) ?? false,
    };
  } catch {
    return { statement: "", endpoint: "", requireEmail: false };
  }
}

export function ConsentFormBlock({
  block,
  accentColor,
  gameName,
  onDismissContent,
}: {
  block: ContentBlock;
  accentColor: string;
  gameName: string;
  onDismissContent?: () => void;
}) {
  const config = parseConsentConfig(block.value);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "done">("idle");

  useEffect(() => { flushConsentQueue(); }, []);

  useEffect(() => {
    if (status !== "done") return;
    const t = setTimeout(() => onDismissContent?.(), 2000);
    return () => clearTimeout(t);
  }, [status, onDismissContent]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("submitting");

    const payload: Record<string, string> = {
      access_key: config.endpoint,
      subject: `Consent Submission — ${gameName} — ${name}`,
      from_name: "Sherpa",
      playtester_name: name,
      consent_date: new Date().toLocaleDateString("en-US", {
        year: "numeric", month: "long", day: "numeric",
      }),
      consent_time: new Date().toLocaleTimeString("en-US"),
      consent_statement: config.statement,
      game: gameName,
    };
    if (config.requireEmail && email) payload.playtester_email = email;

    const ok = await submitToWeb3Forms(payload);
    if (!ok) queueConsent(payload);
    setStatus("done");
  }

  if (status === "done") {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-center">
        <div className="text-xl text-emerald-600">✓</div>
        <div className="mt-1 text-sm font-semibold text-emerald-800">Signed. Thank you.</div>
        <div className="mt-0.5 text-xs text-emerald-600">Returning to the experience.</div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {config.statement ? (
        <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-3 text-sm leading-6 text-neutral-700">
          {config.statement}
        </div>
      ) : null}

      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
          Full name <span aria-hidden="true" className="text-red-500">*</span>
        </label>
        <input
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Type your full name"
          className="w-full rounded-lg border border-neutral-200 px-3 py-2.5 text-sm outline-none transition focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/25 placeholder:text-neutral-500 disabled:bg-neutral-50 disabled:text-neutral-500 disabled:cursor-not-allowed"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
          Date
        </label>
        <div className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-sm text-neutral-500">
          {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
        </div>
      </div>

      {config.requireEmail ? (
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
            Email <span className="font-normal normal-case text-neutral-500">(optional)</span>
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            className="w-full rounded-lg border border-neutral-200 px-3 py-2.5 text-sm outline-none transition focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/25 placeholder:text-neutral-500 disabled:bg-neutral-50 disabled:text-neutral-500 disabled:cursor-not-allowed"
          />
        </div>
      ) : null}

      <button
        type="submit"
        disabled={status === "submitting" || !name.trim()}
        style={accentColor ? { backgroundColor: accentColor, borderColor: accentColor } : {}}
        className="w-full rounded-full border border-[#3B82F6] bg-[#3B82F6] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#2563EB] disabled:opacity-40"
      >
        {status === "submitting" ? "Signing…" : "I agree and sign"}
      </button>
    </form>
  );
}
