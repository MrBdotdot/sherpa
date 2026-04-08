"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PageItem, SystemSettings } from "@/app/_lib/authoring-types";
import {
  LocaleLanguage,
  getLocaleFeature,
  localizePages,
  parseLocaleLanguages,
  promoteLocaleLanguageToDefault,
  removeLanguageFromTranslations,
  serializeLocaleLanguages,
  updatePagesTextByKey,
  updateTranslationMap,
} from "@/app/_lib/localization";

type UseLocalizationProps = {
  pages: PageItem[];
  setPages: React.Dispatch<React.SetStateAction<PageItem[]>>;
  setSystemSettings: React.Dispatch<React.SetStateAction<SystemSettings>>;
  pushPagesHistory: () => void;
  updateCanvasFeatureAcrossPages: (
    featureId: string,
    updater: (feature: PageItem["canvasFeatures"][number]) => PageItem["canvasFeatures"][number]
  ) => void;
  pagesRef: React.MutableRefObject<PageItem[]>;
  systemSettingsRef: React.MutableRefObject<SystemSettings>;
  translations: SystemSettings["translations"];
};

export function useLocalization({
  pages,
  setPages,
  setSystemSettings,
  pushPagesHistory,
  updateCanvasFeatureAcrossPages,
  pagesRef,
  systemSettingsRef,
  translations,
}: UseLocalizationProps) {
  const localeFeature = useMemo(() => getLocaleFeature(pages), [pages]);
  const localeLanguages = useMemo(() => parseLocaleLanguages(localeFeature), [localeFeature]);
  const defaultLanguageCode = localeLanguages[0]?.code ?? "EN";

  const [activeLanguageCode, setActiveLanguageCode] = useState("EN");
  const previousDefaultLanguageRef = useRef(defaultLanguageCode);

  useEffect(() => {
    const availableCodes = new Set(localeLanguages.map((l) => l.code));
    const previousDefaultCode = previousDefaultLanguageRef.current;

    if (
      !activeLanguageCode ||
      !availableCodes.has(activeLanguageCode) ||
      activeLanguageCode === previousDefaultCode
    ) {
      setActiveLanguageCode(defaultLanguageCode);
    }

    previousDefaultLanguageRef.current = defaultLanguageCode;
  }, [activeLanguageCode, defaultLanguageCode, localeLanguages]);

  const localizedPages = useMemo(
    () => localizePages(pages, translations, activeLanguageCode, defaultLanguageCode),
    [activeLanguageCode, defaultLanguageCode, pages, translations]
  );

  const handleLocaleLanguagesChange = useCallback((featureId: string, languages: LocaleLanguage[]) => {
    pushPagesHistory();

    const serialized = serializeLocaleLanguages(languages);
    const removedCodes = localeLanguages
      .filter((l) => !languages.some((next) => next.code === l.code))
      .map((l) => l.code);

    updateCanvasFeatureAcrossPages(featureId, (feature) => ({
      ...feature,
      label: serialized.defaultCode,
      optionsText: serialized.optionsText,
    }));

    if (removedCodes.length > 0) {
      setSystemSettings((prev) => ({
        ...prev,
        defaultLanguageCode: serialized.defaultCode,
        translations: removedCodes.reduce(
          (acc, code) => removeLanguageFromTranslations(acc, code),
          prev.translations
        ),
      }));
    } else {
      setSystemSettings((prev) => ({
        ...prev,
        defaultLanguageCode: serialized.defaultCode,
      }));
    }
  }, [localeLanguages, pushPagesHistory, setSystemSettings, updateCanvasFeatureAcrossPages]);

  const handleLocalePromoteLanguageToDefault = useCallback((
    featureId: string,
    languageCode: string,
    nextLanguages?: LocaleLanguage[]
  ) => {
    pushPagesHistory();

    const promoted = promoteLocaleLanguageToDefault({
      pages: pagesRef.current,
      translations: systemSettingsRef.current.translations,
      languages: nextLanguages ?? localeLanguages,
      nextDefaultCode: languageCode,
    });
    const serialized = serializeLocaleLanguages(promoted.languages);
    const pagesWithUpdatedFeature = promoted.pages.map((page) => ({
      ...page,
      canvasFeatures: page.canvasFeatures.map((feature) =>
        feature.id === featureId
          ? { ...feature, label: serialized.defaultCode, optionsText: serialized.optionsText }
          : feature
      ),
    }));

    setPages(pagesWithUpdatedFeature);
    setSystemSettings((prev) => ({
      ...prev,
      defaultLanguageCode: serialized.defaultCode,
      translations: promoted.translations,
    }));
    setActiveLanguageCode(serialized.defaultCode);
  }, [localeLanguages, pagesRef, pushPagesHistory, setPages, setSystemSettings, systemSettingsRef]);

  const handleLocaleSourceTextChange = useCallback((key: string, value: string) => {
    setPages((prev) => updatePagesTextByKey(prev, key, value));
  }, [setPages]);

  const handleLocaleTranslationChange = useCallback((key: string, languageCode: string, value: string) => {
    setSystemSettings((prev) => ({
      ...prev,
      translations: updateTranslationMap(prev.translations, key, languageCode, value),
    }));
  }, [setSystemSettings]);

  return {
    activeLanguageCode,
    setActiveLanguageCode,
    localeFeature,
    localeLanguages,
    defaultLanguageCode,
    localizedPages,
    handleLocaleLanguagesChange,
    handleLocalePromoteLanguageToDefault,
    handleLocaleSourceTextChange,
    handleLocaleTranslationChange,
  };
}
