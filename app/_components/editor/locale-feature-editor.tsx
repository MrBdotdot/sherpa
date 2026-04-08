"use client";

import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { CanvasFeature, PageItem, TranslationMap } from "@/app/_lib/authoring-types";
import {
  KNOWN_LANGUAGES,
  LocaleLanguage,
  TranslationRow,
  collectTranslationRows,
  getTranslationText,
  parseLocaleLanguages,
} from "@/app/_lib/localization";
import { useFocusTrap } from "@/app/_hooks/useFocusTrap";

type LocaleFeatureEditorProps = {
  feature: CanvasFeature;
  pages: PageItem[];
  translations: TranslationMap | undefined;
  onLanguagesChange: (featureId: string, languages: LocaleLanguage[]) => void;
  onPromoteLanguageToDefault: (
    featureId: string,
    languageCode: string,
    nextLanguages?: LocaleLanguage[]
  ) => void;
  onSourceTextChange: (key: string, value: string) => void;
  onTranslationChange: (key: string, languageCode: string, value: string) => void;
};

function SpreadsheetModal({
  rows,
  languages,
  translations,
  onClose,
  onLanguagesChange,
  onPromoteLanguageToDefault,
  onRemoveLanguage,
  onSourceTextChange,
  onTranslationChange,
}: {
  rows: TranslationRow[];
  languages: LocaleLanguage[];
  translations: TranslationMap | undefined;
  onClose: () => void;
  onLanguagesChange: (languages: LocaleLanguage[]) => void;
  onPromoteLanguageToDefault: (languageCode: string) => void;
  onRemoveLanguage: (languageCode: string) => void;
  onSourceTextChange: (key: string, value: string) => void;
  onTranslationChange: (key: string, languageCode: string, value: string) => void;
}) {
  const [filter, setFilter] = useState("");
  const [languageQuery, setLanguageQuery] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const dialogRef = useFocusTrap<HTMLDivElement>(true);

  const selectedCodes = useMemo(
    () => new Set(languages.map((language) => language.code)),
    [languages]
  );

  const availableLanguages = useMemo(() => {
    const normalizedQuery = languageQuery.trim().toLowerCase();
    return KNOWN_LANGUAGES.filter((language) => {
      if (selectedCodes.has(language.code)) return false;
      if (!normalizedQuery) return true;
      return (
        language.label.toLowerCase().includes(normalizedQuery) ||
        language.code.toLowerCase().includes(normalizedQuery)
      );
    }).slice(0, 8);
  }, [languageQuery, selectedCodes]);

  const filteredRows = useMemo(() => {
    const normalizedFilter = filter.trim().toLowerCase();
    if (!normalizedFilter) return rows;
    return rows.filter((row) =>
      row.context.toLowerCase().includes(normalizedFilter) ||
      row.sourceText.toLowerCase().includes(normalizedFilter)
    );
  }, [filter, rows]);

  function addLanguage(language: LocaleLanguage) {
    onLanguagesChange([...languages, language]);
    rows.forEach((row) => {
      if (row.sourceText.trim()) {
        onTranslationChange(row.key, language.code, row.sourceText);
      }
    });
    setLanguageQuery("");
    setPickerOpen(false);
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[320] flex items-center justify-center bg-black/45 p-4"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="translation-spreadsheet-title"
        className="flex flex-col rounded-[28px] bg-white shadow-2xl"
        style={{
          width: "min(95vw, 1400px)",
          height: "min(90vh, 900px)",
          resize: "both",
          overflow: "hidden",
          minWidth: 640,
          minHeight: 400,
        }}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between gap-4 border-b border-neutral-200 px-6 py-4">
          <div>
            <div id="translation-spreadsheet-title" className="text-base font-semibold text-neutral-900">
              Translation spreadsheet
            </div>
            <div className="mt-1 text-xs text-neutral-600">
              The default language column contains the current live text. Empty cells fall back to the default.
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Add language picker */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setPickerOpen((open) => !open)}
                className="rounded-lg border border-neutral-200 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
              >
                Add language
              </button>
              {pickerOpen ? (
                <div className="absolute right-0 top-[calc(100%+0.5rem)] z-30 w-72 rounded-2xl border border-neutral-200 bg-white p-3 shadow-xl">
                  <input
                    type="text"
                    value={languageQuery}
                    onChange={(event) => setLanguageQuery(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        if (availableLanguages[0]) addLanguage(availableLanguages[0]);
                      }
                      if (event.key === "Escape") {
                        setPickerOpen(false);
                      }
                    }}
                    placeholder="Search languages"
                    className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/10 placeholder:text-neutral-400"
                    autoFocus
                  />
                  <div className="mt-2 max-h-56 overflow-y-auto rounded-xl border border-neutral-100 bg-neutral-50 p-1">
                    {availableLanguages.length > 0 ? (
                      availableLanguages.map((language) => (
                        <button
                          key={language.code}
                          type="button"
                          onClick={() => addLanguage(language)}
                          className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm text-neutral-700 transition hover:bg-white"
                        >
                          <span>{language.label}</span>
                          <span className="text-xs text-neutral-600">{language.code}</span>
                        </button>
                      ))
                    ) : (
                      <div className="px-3 py-2 text-xs text-neutral-600">No more matching languages.</div>
                    )}
                  </div>
                </div>
              ) : null}
            </div>

            {/* Filter */}
            <input
              type="text"
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              placeholder="Filter rows"
              aria-label="Filter translation rows"
              className="w-56 rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/10 placeholder:text-neutral-400"
            />

            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-neutral-200 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
            >
              Close
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="min-h-0 flex-1 overflow-auto">
          <table className="min-w-full border-separate border-spacing-0">
            <thead className="sticky top-0 z-10 bg-white">
              <tr>
                <th className="sticky left-0 z-20 min-w-[260px] border-b border-r border-neutral-200 bg-white px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-600">
                  Field
                </th>
                {languages.map((language, index) => (
                  <th
                    key={language.code}
                    className="min-w-[260px] border-b border-neutral-200 bg-white px-4 py-3 align-top text-left"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-neutral-900">{language.label}</div>
                        <div className="mt-1 flex items-center gap-2 text-[11px] text-neutral-600">
                          <span>{language.code}</span>
                          {index === 0 ? (
                            <span className="rounded-full bg-[#3B82F6] px-2 py-0.5 font-semibold text-white">
                              Default
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        {index > 0 ? (
                          <>
                            <button
                              type="button"
                              onClick={() => onPromoteLanguageToDefault(language.code)}
                              className="rounded-lg border border-neutral-200 px-2.5 py-1 text-[11px] font-medium text-neutral-600 hover:bg-neutral-50"
                            >
                              Set as default
                            </button>
                            <button
                              type="button"
                              onClick={() => onRemoveLanguage(language.code)}
                              className="rounded-lg border border-neutral-200 px-2.5 py-1 text-[11px] font-medium text-neutral-600 hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                            >
                              Remove
                            </button>
                          </>
                        ) : (
                          <div className="text-[11px] text-neutral-600">Current text</div>
                        )}
                      </div>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row) => (
                <tr key={row.key}>
                  <td className="sticky left-0 z-10 border-b border-r border-neutral-200 bg-white px-4 py-3 align-top">
                    <div className="text-sm font-medium text-neutral-800">{row.context}</div>
                  </td>
                  {languages.map((language, index) => (
                    <td key={`${row.key}-${language.code}`} className="border-b border-neutral-200 px-4 py-3 align-top">
                      <textarea
                        value={
                          index === 0
                            ? row.sourceText
                            : getTranslationText(translations, row.key, language.code, "")
                        }
                        onChange={(event) => {
                          if (index === 0) {
                            onSourceTextChange(row.key, event.target.value);
                            return;
                          }
                          onTranslationChange(row.key, language.code, event.target.value);
                        }}
                        placeholder={index === 0 ? "Default text" : row.sourceText}
                        rows={3}
                        className={`w-full resize-y rounded-xl border px-3 py-2 text-sm leading-6 text-neutral-900 outline-none focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/10 placeholder:text-neutral-400 ${
                          index === 0 ? "border-neutral-300 bg-neutral-50" : "border-neutral-200"
                        }`}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>

          {filteredRows.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-neutral-600">
              No rows matched that filter.
            </div>
          ) : null}
        </div>
      </div>

    </div>,
    document.body
  );
}

export function LocaleFeatureEditor({
  feature,
  pages,
  translations,
  onLanguagesChange,
  onPromoteLanguageToDefault,
  onSourceTextChange,
  onTranslationChange,
}: LocaleFeatureEditorProps) {
  const languages = useMemo(() => parseLocaleLanguages(feature), [feature]);
  const translationRows = useMemo(() => collectTranslationRows(pages), [pages]);
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <div className="space-y-3">
      <p className="text-xs text-neutral-600">
        {translationRows.length} translatable field{translationRows.length === 1 ? "" : "s"} · {languages.length} language{languages.length === 1 ? "" : "s"}
      </p>
      <button
        type="button"
        onClick={() => setSheetOpen(true)}
        className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50"
      >
        Open spreadsheet
      </button>

      {sheetOpen ? (
        <SpreadsheetModal
          rows={translationRows}
          languages={languages}
          translations={translations}
          onClose={() => setSheetOpen(false)}
          onLanguagesChange={(nextLanguages) => onLanguagesChange(feature.id, nextLanguages)}
          onPromoteLanguageToDefault={(languageCode) => {
            const promotedLanguage = languages.find((language) => language.code === languageCode);
            if (!promotedLanguage) return;
            const nextLanguages = [
              promotedLanguage,
              ...languages.filter((language) => language.code !== languageCode),
            ];
            onPromoteLanguageToDefault(feature.id, languageCode, nextLanguages);
          }}
          onRemoveLanguage={(languageCode) => {
            onLanguagesChange(
              feature.id,
              languages.filter((language) => language.code !== languageCode)
            );
          }}
          onSourceTextChange={onSourceTextChange}
          onTranslationChange={onTranslationChange}
        />
      ) : null}
    </div>
  );
}
