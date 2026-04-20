"use client";

import React, { useEffect, useRef, useState } from "react";
import { useFocusTrap } from "@/app/_hooks/useFocusTrap";
import { apiFetch } from "@/app/_lib/api-fetch";
import { supabase } from "@/app/_lib/supabase";
import { ImportReviewScreen } from "@/app/_components/import-review-screen";
import type { DraftSection } from "@/app/_lib/import-types";

type Tab = "text" | "pdf" | "figma";
type Step = "input" | "parsing" | "choose-format" | "review" | "committing";

interface RulebookImporterModalProps {
  isOpen: boolean;
  gameId: string;
  onClose: () => void;
  onImportComplete: () => void;
  onBack?: () => void;
}

const STEP_TITLE: Record<Step, string> = {
  input: "Import your rulebook",
  parsing: "Reading your content…",
  "choose-format": "How would you like to import?",
  review: "Review sections",
  committing: "Adding to your game…",
};

export function RulebookImporterModal({
  isOpen,
  gameId,
  onClose,
  onImportComplete,
  onBack,
}: RulebookImporterModalProps) {
  const dialogRef = useFocusTrap<HTMLDivElement>(isOpen);
  const [tab, setTab] = useState<Tab>("text");
  const [text, setText] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [figmaUrl, setFigmaUrl] = useState("");
  const [figmaToken, setFigmaToken] = useState("");
  const [showFigmaToken, setShowFigmaToken] = useState(false);
  const [step, setStep] = useState<Step>("input");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [draftSections, setDraftSections] = useState<DraftSection[]>([]);
  const [commitError, setCommitError] = useState<string | null>(null);
  const [commitMode, setCommitMode] = useState<"cards" | "single" | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const slowTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => { if (slowTimerRef.current) clearInterval(slowTimerRef.current); }, []);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setStep("input");
      setText("");
      setPdfFile(null);
      setFigmaUrl("");
      setFigmaToken("");
      setShowFigmaToken(false);
      setDraftSections([]);
      setErrorMsg(null);
      setCommitError(null);
      setCommitMode(null);
      setUploadProgress(null);
      if (slowTimerRef.current) clearInterval(slowTimerRef.current);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const canSubmit =
    tab === "text" ? text.trim().length > 0 :
    tab === "pdf" ? pdfFile !== null :
    figmaUrl.trim().length > 0;
  const isBusy = step === "parsing" || step === "committing";

  // Which top-level view to render
  const showReview = step === "review" || (step === "committing" && commitMode === "cards");
  const showChooseFormat = step === "choose-format" || (step === "committing" && commitMode === "single");

  function startSlowProgress() {
    if (slowTimerRef.current) clearInterval(slowTimerRef.current);
    slowTimerRef.current = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev === null || prev >= 92) return prev;
        return prev + 0.5;
      });
    }, 300);
  }

  // XHR upload for PDF — real byte-level progress, returns extracted text
  async function uploadPdfAndGetText(): Promise<string> {
    const { data: { session } } = await supabase.auth.getSession();

    return new Promise<string>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", "/api/import/rulebook/pdf");
      if (session?.access_token) {
        xhr.setRequestHeader("Authorization", `Bearer ${session.access_token}`);
      }

      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) {
          setUploadProgress(Math.round((e.loaded / e.total) * 60));
        }
      });

      xhr.upload.addEventListener("load", () => {
        setUploadProgress(60);
        startSlowProgress();
      });

      xhr.addEventListener("load", () => {
        if (slowTimerRef.current) clearInterval(slowTimerRef.current);
        if (xhr.status >= 200 && xhr.status < 300) {
          let extracted = "";
          try {
            const body = JSON.parse(xhr.responseText);
            if (typeof body?.text === "string") extracted = body.text;
          } catch { /* ignore */ }
          resolve(extracted);
        } else {
          let msg: string | null = null;
          try {
            const body = JSON.parse(xhr.responseText);
            if (typeof body?.error === "string") msg = body.error;
          } catch { /* ignore */ }
          reject(Object.assign(new Error("upload failed"), { serverMsg: msg }));
        }
      });

      xhr.addEventListener("error", () => {
        if (slowTimerRef.current) clearInterval(slowTimerRef.current);
        reject(new Error("Network error"));
      });

      const form = new FormData();
      form.append("file", pdfFile!);
      form.append("gameId", gameId);
      xhr.send(form);
    });
  }

  async function handleSubmit() {
    if (!canSubmit || isBusy) return;
    setStep("parsing");
    setErrorMsg(null);

    try {
      if (tab === "figma") {
        const res = await apiFetch("/api/import/figma/parse", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ figmaUrl: figmaUrl.trim(), figmaToken: figmaToken.trim() || undefined, gameId }),
        });
        if (!res.ok) {
          let msg: string | null = null;
          try { const b = await res.json(); if (typeof b?.error === "string") msg = b.error; } catch { /* ignore */ }
          setErrorMsg(msg);
          setStep("input");
          return;
        }
        const data = await res.json();
        setDraftSections(data.sections ?? []);
        setStep("choose-format");
        return;
      }

      let textToParse: string;

      if (tab === "pdf") {
        setUploadProgress(0);
        textToParse = await uploadPdfAndGetText();
        setUploadProgress(null);
      } else {
        textToParse = text;
      }

      const res = await apiFetch("/api/import/rulebook/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: textToParse, gameId }),
      });

      if (!res.ok) {
        let msg: string | null = null;
        try { const b = await res.json(); if (typeof b?.error === "string") msg = b.error; } catch { /* ignore */ }
        setErrorMsg(msg);
        setStep("input");
        return;
      }

      const data = await res.json();
      setDraftSections(data.sections ?? []);
      setStep("choose-format");
    } catch (err) {
      setUploadProgress(null);
      setErrorMsg((err as { serverMsg?: string }).serverMsg ?? null);
      setStep("input");
    }
  }

  async function handleCommit(sections: DraftSection[], mode: "cards" | "single") {
    setCommitMode(mode);
    setStep("committing");
    setCommitError(null);

    try {
      const res = await apiFetch("/api/import/rulebook/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sections, gameId, mode }),
      });

      if (!res.ok) {
        let msg: string | null = null;
        try { const b = await res.json(); if (typeof b?.error === "string") msg = b.error; } catch { /* ignore */ }
        setCommitError(msg ?? "Something went wrong — please try again.");
        setStep(mode === "cards" ? "review" : "choose-format");
        return;
      }

      onImportComplete();
      onClose();
    } catch {
      setCommitError("Something went wrong — please try again.");
      setStep(commitMode === "cards" ? "review" : "choose-format");
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file?.type === "application/pdf") setPdfFile(file);
  }

  // Back button destination for internal navigation
  function handleBack() {
    if (step === "review") { setStep("choose-format"); return; }
    if (step === "choose-format") { setStep("input"); return; }
    if (onBack) onBack();
  }

  const showBackButton = !!onBack || step === "choose-format" || step === "review";

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/45 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) (onBack ?? onClose)(); }}
      onKeyDown={(e) => { if (e.key === "Escape") (onBack ?? onClose)(); }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="rulebook-importer-title"
        className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-neutral-200 px-5 py-4">
          <div className="flex items-start gap-2">
            {showBackButton && !isBusy && (
              <button
                type="button"
                onClick={handleBack}
                aria-label="Back"
                className="mt-0.5 rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-600"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            )}
            <div>
              <div id="rulebook-importer-title" className="text-base font-semibold text-neutral-900">
                {STEP_TITLE[step]}
              </div>
              {step === "choose-format" && (
                <div className="mt-0.5 text-xs text-neutral-500">
                  Choose how your content gets added to your game.
                </div>
              )}
              {step === "input" && (
                <div className="mt-0.5 text-xs text-neutral-500">
                  We'll read your rulebook and organize it for you.
                </div>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="ml-4 rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-600"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Body — switches based on step */}
        {showReview ? (
          <ImportReviewScreen
            sections={draftSections}
            onConfirm={(sections) => handleCommit(sections, "cards")}
            onBack={() => setStep("choose-format")}
            isCommitting={step === "committing"}
            commitError={commitError}
          />
        ) : showChooseFormat ? (
          <div className="px-5 py-5">
            {step === "committing" ? (
              <div className="flex flex-col items-center justify-center gap-3 py-8">
                <svg className="h-5 w-5 animate-spin text-[#1e3a8a]" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 100 16v-4l-3 3 3 3v-4a8 8 0 01-8-8z" />
                </svg>
                <span className="text-xs text-neutral-500">Adding to your game…</span>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {commitError && (
                  <p className="text-xs text-red-500">{commitError}</p>
                )}
                <button
                  type="button"
                  onClick={() => setStep("review")}
                  className="group flex flex-col gap-0.5 rounded-2xl border-2 border-neutral-200 px-4 py-3.5 text-left transition hover:border-[#1e3a8a] hover:bg-blue-50/40"
                >
                  <span className="text-sm font-semibold text-neutral-900 group-hover:text-[#1e3a8a]">Split into Cards</span>
                  <span className="text-xs text-neutral-500">Each section becomes its own card. Review and merge before adding.</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleCommit(draftSections, "single")}
                  className="group flex flex-col gap-0.5 rounded-2xl border-2 border-neutral-200 px-4 py-3.5 text-left transition hover:border-[#1e3a8a] hover:bg-blue-50/40"
                >
                  <span className="text-sm font-semibold text-neutral-900 group-hover:text-[#1e3a8a]">All in One</span>
                  <span className="text-xs text-neutral-500">Everything goes into a single card, ready to edit and reorganize.</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="px-5 pt-4 pb-5">
            {/* Tab bar */}
            <div className="mb-4 flex border-b border-neutral-200">
              {(["text", "pdf", "figma"] as Tab[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => { setTab(t); setErrorMsg(null); }}
                  disabled={isBusy}
                  className={`border-b-2 px-3 py-2 text-xs font-semibold transition-colors ${
                    tab === t
                      ? "border-[#1e3a8a] text-[#1e3a8a]"
                      : "border-transparent text-neutral-500 hover:text-neutral-600"
                  }`}
                >
                  {t === "text" ? "Paste text" : t === "pdf" ? "Upload PDF" : "Figma"}
                </button>
              ))}
            </div>

            {/* Content area */}
            <div className={`flex flex-col ${tab === "figma" ? "gap-3" : "h-36"}`}>
              {isBusy ? (
                <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-xl bg-neutral-50 px-6">
                  {uploadProgress !== null ? (
                    <>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-200">
                        <div
                          className="h-full rounded-full bg-[#1e3a8a] transition-all duration-300"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                      <span className="text-xs text-neutral-500">
                        {uploadProgress < 60 ? "Uploading…" : "Reading your rulebook…"}
                      </span>
                    </>
                  ) : (
                    <>
                      <svg className="h-5 w-5 animate-spin text-[#1e3a8a]" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 100 16v-4l-3 3 3 3v-4a8 8 0 01-8-8z" />
                      </svg>
                      <span className="text-xs text-neutral-500">
                        {tab === "figma" ? "Reading frames…" : "Analyzing your rulebook…"}
                      </span>
                    </>
                  )}
                </div>
              ) : tab === "text" ? (
                <textarea
                  className="w-full flex-1 resize-none rounded-xl border border-neutral-200 px-3 py-2.5 text-xs leading-relaxed text-neutral-800 placeholder:text-neutral-500 focus:border-[#1e3a8a] focus:outline-none"
                  placeholder="Paste your rulebook text here…"
                  value={text}
                  onChange={(e) => { setText(e.target.value); setErrorMsg(null); }}
                />
              ) : tab === "figma" ? (
                <>
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                      Figma URL
                    </label>
                    <input
                      type="url"
                      className="w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-xs text-neutral-800 placeholder:text-neutral-400 focus:border-[#1e3a8a] focus:outline-none"
                      placeholder="https://www.figma.com/design/…"
                      value={figmaUrl}
                      onChange={(e) => { setFigmaUrl(e.target.value); setErrorMsg(null); }}
                    />
                  </div>
                  <div>
                    <button
                      type="button"
                      onClick={() => setShowFigmaToken((v) => !v)}
                      className="mb-1 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-neutral-400 hover:text-neutral-600"
                    >
                      <svg
                        width="10" height="10" viewBox="0 0 10 10" fill="none"
                        className={`transition-transform ${showFigmaToken ? "rotate-90" : ""}`}
                      >
                        <path d="M3 2l4 3-4 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      Access token (optional)
                    </button>
                    {showFigmaToken && (
                      <input
                        type="password"
                        className="w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-xs text-neutral-800 placeholder:text-neutral-400 focus:border-[#1e3a8a] focus:outline-none"
                        placeholder="figd_…"
                        value={figmaToken}
                        onChange={(e) => setFigmaToken(e.target.value)}
                      />
                    )}
                    {!showFigmaToken && (
                      <p className="text-[11px] text-neutral-400">
                        Only needed if the file is private. Get one from Figma Settings.
                      </p>
                    )}
                  </div>
                </>
              ) : (
                <div
                  className={`flex flex-1 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed transition-colors ${
                    pdfFile ? "border-[#1e3a8a] bg-blue-50" : "border-neutral-200 bg-neutral-50 hover:border-neutral-300"
                  }`}
                  onClick={() => fileInputRef.current?.click()}
                  onDrop={handleDrop}
                  onDragOver={(e) => e.preventDefault()}
                >
                  <span className="text-lg">📎</span>
                  <span className="text-xs font-medium text-neutral-700">
                    {pdfFile ? pdfFile.name : "Drop your PDF here"}
                  </span>
                  {!pdfFile && (
                    <span className="text-xs text-neutral-500">or click to browse · PDF only · max 50MB</span>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/pdf"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) { setPdfFile(f); setErrorMsg(null); }
                    }}
                  />
                </div>
              )}
            </div>

            {/* Hint / error */}
            <div className="mt-1.5 h-4">
              {errorMsg ? (
                <p className="text-xs text-red-500">{errorMsg ?? "Something went wrong — please try again."}</p>
              ) : tab === "text" && !isBusy ? (
                <p className="text-xs text-neutral-500">Tip: include headings for better section grouping.</p>
              ) : tab === "figma" && !isBusy ? (
                <p className="text-xs text-neutral-500">Each top-level frame becomes a card with its image as the hero.</p>
              ) : null}
            </div>

            {/* Actions */}
            <div className="mt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={onBack ?? onClose}
                disabled={isBusy}
                className="rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-600 transition hover:bg-neutral-50 disabled:opacity-40"
              >
                {onBack ? "← Back" : "Cancel"}
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!canSubmit || isBusy}
                className="rounded-full bg-[#1e3a8a] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1e3a8a]/90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isBusy
                ? tab === "figma" ? "Reading frames…" : "Analyzing…"
                : errorMsg ? "Try again →" : "Import →"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
