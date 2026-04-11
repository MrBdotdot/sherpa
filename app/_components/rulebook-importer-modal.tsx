"use client";

import React, { useRef, useState } from "react";
import { useFocusTrap } from "@/app/_hooks/useFocusTrap";

type Tab = "text" | "pdf";
type State = "idle" | "loading" | "error";

interface RulebookImporterModalProps {
  isOpen: boolean;
  gameId: string;
  onClose: () => void;
  onImportComplete: () => void;
}

export function RulebookImporterModal({
  isOpen,
  gameId,
  onClose,
  onImportComplete,
}: RulebookImporterModalProps) {
  const dialogRef = useFocusTrap<HTMLDivElement>(isOpen);
  const [tab, setTab] = useState<Tab>("text");
  const [text, setText] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [state, setState] = useState<State>("idle");
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const canSubmit = tab === "text" ? text.trim().length > 0 : pdfFile !== null;

  async function handleSubmit() {
    if (!canSubmit || state === "loading") return;
    setState("loading");

    try {
      let res: Response;

      if (tab === "text") {
        res = await fetch("/api/import/rulebook", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, gameId }),
        });
      } else {
        const form = new FormData();
        form.append("file", pdfFile!);
        form.append("gameId", gameId);
        res = await fetch("/api/import/rulebook/pdf", {
          method: "POST",
          body: form,
        });
      }

      if (!res.ok) {
        setState("error");
        return;
      }

      onImportComplete();
      onClose();
    } catch {
      setState("error");
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file?.type === "application/pdf") setPdfFile(file);
  }

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/45 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      onKeyDown={(e) => { if (e.key === "Escape") onClose(); }}
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
          <div>
            <div id="rulebook-importer-title" className="text-base font-semibold text-neutral-900">
              Import your rulebook
            </div>
            <div className="mt-0.5 text-xs text-neutral-500">
              We'll create cards organized by section — ready for you to edit.
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="ml-4 rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-5 pt-4 pb-5">
          {/* Tab bar */}
          <div className="flex border-b border-neutral-200 mb-4">
            {(["text", "pdf"] as Tab[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => { setTab(t); setState("idle"); }}
                className={`px-3 py-2 text-xs font-semibold border-b-2 transition-colors ${
                  tab === t
                    ? "border-[#1e3a8a] text-[#1e3a8a]"
                    : "border-transparent text-neutral-400 hover:text-neutral-600"
                }`}
              >
                {t === "text" ? "Paste text" : "Upload PDF"}
              </button>
            ))}
          </div>

          {/* Fixed-height content area */}
          <div className="h-36 flex flex-col">
            {state === "loading" ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-2 rounded-xl bg-neutral-50">
                <svg className="animate-spin h-5 w-5 text-[#1e3a8a]" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 100 16v-4l-3 3 3 3v-4a8 8 0 01-8-8z" />
                </svg>
                <span className="text-xs text-neutral-500">Reading your rulebook…</span>
              </div>
            ) : tab === "text" ? (
              <textarea
                className="flex-1 w-full resize-none rounded-xl border border-neutral-200 px-3 py-2.5 text-xs leading-relaxed text-neutral-800 placeholder:text-neutral-400 focus:border-[#1e3a8a] focus:outline-none"
                placeholder="Paste your rulebook text here…"
                value={text}
                onChange={(e) => { setText(e.target.value); setState("idle"); }}
                disabled={false}
              />
            ) : (
              <div
                className={`flex-1 flex flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed cursor-pointer transition-colors ${
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
                  <span className="text-[11px] text-neutral-400">or click to browse · PDF only · max 20MB</span>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) { setPdfFile(f); setState("idle"); }
                  }}
                />
              </div>
            )}
          </div>

          {/* Hint / error */}
          <div className="mt-1.5 h-4">
            {state === "error" ? (
              <p className="text-[11px] text-red-500">Something went wrong — please try again.</p>
            ) : tab === "text" && state !== "loading" ? (
              <p className="text-[11px] text-neutral-400">Tip: include headings for better card grouping.</p>
            ) : null}
          </div>

          {/* Actions */}
          <div className="mt-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-50 transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit || state === "loading"}
              className="rounded-full bg-[#1e3a8a] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1e3a8a]/90 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {state === "loading" ? "Building…" : state === "error" ? "Try again →" : "Build cards →"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
