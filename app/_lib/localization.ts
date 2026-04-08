import {
  CanvasFeature,
  ContentBlock,
  PageItem,
  TranslationMap,
} from "@/app/_lib/authoring-types";

export type LocaleLanguage = {
  code: string;
  label: string;
};

export type TranslationRow = {
  key: string;
  context: string;
  sourceText: string;
};

type TransformText = (key: string, sourceText: string, context: string) => string;

export const KNOWN_LANGUAGES: LocaleLanguage[] = [
  { code: "AR", label: "Arabic" },
  { code: "BG", label: "Bulgarian" },
  { code: "BN", label: "Bengali" },
  { code: "CA", label: "Catalan" },
  { code: "CS", label: "Czech" },
  { code: "DA", label: "Danish" },
  { code: "DE", label: "German" },
  { code: "EL", label: "Greek" },
  { code: "EN", label: "English" },
  { code: "ES", label: "Spanish" },
  { code: "ET", label: "Estonian" },
  { code: "FA", label: "Persian" },
  { code: "FI", label: "Finnish" },
  { code: "FIL", label: "Filipino" },
  { code: "FR", label: "French" },
  { code: "GU", label: "Gujarati" },
  { code: "HE", label: "Hebrew" },
  { code: "HI", label: "Hindi" },
  { code: "HR", label: "Croatian" },
  { code: "HU", label: "Hungarian" },
  { code: "ID", label: "Indonesian" },
  { code: "IT", label: "Italian" },
  { code: "JA", label: "Japanese" },
  { code: "KN", label: "Kannada" },
  { code: "KO", label: "Korean" },
  { code: "LT", label: "Lithuanian" },
  { code: "LV", label: "Latvian" },
  { code: "ML", label: "Malayalam" },
  { code: "MR", label: "Marathi" },
  { code: "MS", label: "Malay" },
  { code: "NB", label: "Norwegian Bokmal" },
  { code: "NL", label: "Dutch" },
  { code: "PL", label: "Polish" },
  { code: "PT", label: "Portuguese" },
  { code: "RO", label: "Romanian" },
  { code: "RU", label: "Russian" },
  { code: "SK", label: "Slovak" },
  { code: "SL", label: "Slovenian" },
  { code: "SR", label: "Serbian" },
  { code: "SV", label: "Swedish" },
  { code: "SW", label: "Swahili" },
  { code: "TA", label: "Tamil" },
  { code: "TE", label: "Telugu" },
  { code: "TH", label: "Thai" },
  { code: "TR", label: "Turkish" },
  { code: "UK", label: "Ukrainian" },
  { code: "UR", label: "Urdu" },
  { code: "VI", label: "Vietnamese" },
  { code: "ZH-CN", label: "Chinese (Simplified)" },
  { code: "ZH-TW", label: "Chinese (Traditional)" },
];

function normalizeLanguageCode(code: string): string {
  return code.trim().toUpperCase();
}

function getKnownLanguage(code: string): LocaleLanguage | null {
  const normalizedCode = normalizeLanguageCode(code);
  return KNOWN_LANGUAGES.find((language) => language.code === normalizedCode) ?? null;
}

export function getKnownLocaleLanguage(code: string): LocaleLanguage | null {
  return getKnownLanguage(code);
}

function ensureLocaleLanguage(language: Partial<LocaleLanguage> | null | undefined): LocaleLanguage | null {
  const normalizedCode = normalizeLanguageCode(language?.code ?? "");
  if (!normalizedCode) return null;
  const knownLanguage = getKnownLanguage(normalizedCode);
  const label = (language?.label ?? "").trim() || knownLanguage?.label || normalizedCode;
  return { code: normalizedCode, label };
}

function moveItem<T>(items: T[], fromIndex: number, toIndex: number): T[] {
  if (fromIndex === toIndex) return items;
  const next = [...items];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}

function featureLabelPrefix(feature: CanvasFeature): string {
  switch (feature.type) {
    case "heading":
      return "Heading";
    case "button":
      return "Button";
    case "page-button":
      return "Board button";
    case "dropdown":
      return "Dropdown";
    case "search":
      return "Search";
    case "image":
      return "Image";
    case "qr":
      return "QR code";
    case "disclaimer":
      return "Disclaimer";
    case "locale":
      return "Language switcher";
    default:
      return "Board element";
  }
}

function blockLabelPrefix(block: ContentBlock): string {
  switch (block.type) {
    case "text":
      return "Text block";
    case "steps":
      return "Steps block";
    case "callout":
      return "Callout block";
    case "section":
      return "Section block";
    case "image":
      return "Image block";
    case "video":
      return "Video block";
    case "consent":
      return "Consent block";
    case "tabs":
      return "Tabs block";
    case "step-rail":
      return "Step rail block";
    case "carousel":
      return "Carousel block";
    default:
      return "Block";
  }
}

function translateText(sourceText: string, key: string, context: string, transform: TransformText): string {
  if (!sourceText.trim()) return sourceText;
  return transform(key, sourceText, context);
}

function transformFeatureOptionsText(
  feature: CanvasFeature,
  pageContext: string,
  transform: TransformText
): string {
  const lines = feature.optionsText.split("\n");

  return lines
    .map((rawLine, lineIndex) => {
      const trimmedLine = rawLine.trim();
      if (!trimmedLine || trimmedLine === "---") return rawLine;

      if (feature.type === "image" && trimmedLine.startsWith("~")) {
        const sourceText = trimmedLine.slice(1).trim();
        const translatedText = translateText(
          sourceText,
          `feature:${feature.id}:option:${lineIndex}:note`,
          `${pageContext} / ${featureLabelPrefix(feature)} attribution`,
          transform
        );
        return translatedText ? `~${translatedText}` : "";
      }

      const pipeIndex = rawLine.indexOf("|");
      const sourceLabel = pipeIndex === -1 ? trimmedLine : rawLine.slice(0, pipeIndex).trim();
      const suffix = pipeIndex === -1 ? "" : rawLine.slice(pipeIndex + 1).trim();
      const translatedLabel = translateText(
        sourceLabel,
        `feature:${feature.id}:option:${lineIndex}:label`,
        `${pageContext} / ${featureLabelPrefix(feature)} item ${lineIndex + 1}`,
        transform
      );
      return suffix ? `${translatedLabel}|${suffix}` : translatedLabel;
    })
    .join("\n");
}

function transformContentBlocks(
  blocks: ContentBlock[],
  pageContext: string,
  transform: TransformText
): ContentBlock[] {
  return blocks.map((block, blockIndex) => {
    const blockContext = `${pageContext} / ${blockLabelPrefix(block)} ${blockIndex + 1}`;

    if (block.type === "text" || block.type === "steps" || block.type === "callout" || block.type === "section") {
      return {
        ...block,
        value: translateText(block.value, `block:${block.id}:value`, `${blockContext} text`, transform),
      };
    }

    if (block.type === "image") {
      return {
        ...block,
        imageCaption: block.imageCaption
          ? translateText(block.imageCaption, `block:${block.id}:caption`, `${blockContext} caption`, transform)
          : block.imageCaption,
        imageHotspots: (block.imageHotspots ?? []).map((hotspot, hotspotIndex) => ({
          ...hotspot,
          label: translateText(
            hotspot.label,
            `block:${block.id}:hotspot:${hotspot.id}:label`,
            `${blockContext} hotspot ${hotspotIndex + 1} label`,
            transform
          ),
          content: translateText(
            hotspot.content,
            `block:${block.id}:hotspot:${hotspot.id}:content`,
            `${blockContext} hotspot ${hotspotIndex + 1} description`,
            transform
          ),
        })),
      };
    }

    if (block.type === "consent") {
      try {
        const parsed = JSON.parse(block.value) as Record<string, unknown>;
        return {
          ...block,
          value: JSON.stringify({
            ...parsed,
            statement: translateText(
              typeof parsed.statement === "string" ? parsed.statement : "",
              `block:${block.id}:statement`,
              `${blockContext} statement`,
              transform
            ),
          }),
        };
      } catch {
        return block;
      }
    }

    if (block.type === "tabs") {
      try {
        const parsed = JSON.parse(block.value) as { sections?: Array<Record<string, unknown>> };
        return {
          ...block,
          value: JSON.stringify({
            ...parsed,
            sections: (parsed.sections ?? []).map((section, sectionIndex) => {
              const sectionLabel = typeof section.label === "string" ? section.label : "";
              const sectionContext = `${blockContext} / Tab ${sectionIndex + 1}`;
              return {
                ...section,
                label: translateText(
                  sectionLabel,
                  `block:${block.id}:section:${String(section.id ?? sectionIndex)}:label`,
                  `${sectionContext} label`,
                  transform
                ),
                blocks: transformContentBlocks(
                  Array.isArray(section.blocks) ? (section.blocks as ContentBlock[]) : [],
                  sectionLabel ? `${sectionContext} / ${sectionLabel}` : sectionContext,
                  transform
                ),
              };
            }),
          }),
        };
      } catch {
        return block;
      }
    }

    if (block.type === "carousel") {
      try {
        const parsed = JSON.parse(block.value) as { slides?: Array<Record<string, unknown>> };
        return {
          ...block,
          value: JSON.stringify({
            ...parsed,
            slides: (parsed.slides ?? []).map((slide, slideIndex) => {
              const slideLabel = typeof slide.label === "string" ? slide.label : "";
              const slideContext = `${blockContext} / Slide ${slideIndex + 1}`;
              return {
                ...slide,
                label: translateText(
                  slideLabel,
                  `block:${block.id}:slide:${String(slide.id ?? slideIndex)}:label`,
                  `${slideContext} label`,
                  transform
                ),
                blocks: transformContentBlocks(
                  Array.isArray(slide.blocks) ? (slide.blocks as ContentBlock[]) : [],
                  slideLabel ? `${slideContext} / ${slideLabel}` : slideContext,
                  transform
                ),
              };
            }),
          }),
        };
      } catch {
        return block;
      }
    }

    if (block.type === "step-rail") {
      try {
        const parsed = JSON.parse(block.value) as { steps?: Array<Record<string, unknown>> };
        return {
          ...block,
          value: JSON.stringify({
            ...parsed,
            steps: (parsed.steps ?? []).map((step, stepIndex) => ({
              ...step,
              label: translateText(
                typeof step.label === "string" ? step.label : "",
                `block:${block.id}:step:${String(step.id ?? stepIndex)}:label`,
                `${blockContext} step ${stepIndex + 1} label`,
                transform
              ),
            })),
          }),
        };
      } catch {
        return block;
      }
    }

    return block;
  });
}

function transformPagesText(pages: PageItem[], transform: TransformText): PageItem[] {
  return pages.map((page) => {
    const pageTitle = page.title || "Untitled page";
    const pageContext = page.kind === "home" ? "Home" : pageTitle;

    return {
      ...page,
      title: translateText(page.title, `page:${page.id}:title`, `${pageContext} / Page title`, transform),
      summary: translateText(page.summary, `page:${page.id}:summary`, `${pageContext} / Page summary`, transform),
      socialLinks: page.socialLinks.map((link, linkIndex) => ({
        ...link,
        label: translateText(
          link.label,
          `page:${page.id}:social:${link.id}:label`,
          `${pageContext} / Action link ${linkIndex + 1} label`,
          transform
        ),
      })),
      canvasFeatures: page.canvasFeatures.map((feature, featureIndex) => {
        if (feature.type === "locale") return feature;

        const featureContext = `${pageContext} / Board / ${featureLabelPrefix(feature)} ${featureIndex + 1}`;
        return {
          ...feature,
          label: translateText(
            feature.label,
            `feature:${feature.id}:label`,
            `${featureContext} label`,
            transform
          ),
          description: feature.type === "heading"
            ? translateText(
                feature.description,
                `feature:${feature.id}:description`,
                `${featureContext} subtitle`,
                transform
              )
            : feature.description,
          optionsText: feature.type === "dropdown" || feature.type === "heading" || feature.type === "image"
            ? transformFeatureOptionsText(feature, featureContext, transform)
            : feature.optionsText,
        };
      }),
      blocks: transformContentBlocks(page.blocks, pageContext, transform),
    };
  });
}

function collectTranslationRowsInternal(pages: PageItem[]): TranslationRow[] {
  const rows: TranslationRow[] = [];
  transformPagesText(pages, (key, sourceText, context) => {
    rows.push({ key, context, sourceText });
    return sourceText;
  });
  return rows;
}

export function getLocaleFeature(pages: PageItem[]): CanvasFeature | null {
  const homePage = pages.find((page) => page.kind === "home");
  return homePage?.canvasFeatures.find((feature) => feature.type === "locale") ?? null;
}

export function parseLocaleLanguages(
  feature: Pick<CanvasFeature, "label" | "optionsText"> | null | undefined
): LocaleLanguage[] {
  const optionLines = (feature?.optionsText ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const parsedFromOptions = optionLines
    .map((line) => {
      const [label, code] = line.split("|");
      return ensureLocaleLanguage({
        code: code ?? label,
        label,
      });
    })
    .filter((language): language is LocaleLanguage => language !== null);

  const defaultCode = normalizeLanguageCode(feature?.label ?? parsedFromOptions[0]?.code ?? "EN");
  const dedupedLanguages: LocaleLanguage[] = [];
  const seenCodes = new Set<string>();

  for (const language of parsedFromOptions) {
    if (seenCodes.has(language.code)) continue;
    seenCodes.add(language.code);
    dedupedLanguages.push(language);
  }

  if (!seenCodes.has(defaultCode)) {
    const defaultLanguage = ensureLocaleLanguage({ code: defaultCode });
    if (defaultLanguage) dedupedLanguages.unshift(defaultLanguage);
  }

  const defaultIndex = dedupedLanguages.findIndex((language) => language.code === defaultCode);
  const languages = defaultIndex > 0
    ? moveItem(dedupedLanguages, defaultIndex, 0)
    : dedupedLanguages;

  return languages.length > 0 ? languages : [{ code: "EN", label: "English" }];
}

export function serializeLocaleLanguages(languages: LocaleLanguage[]): {
  defaultCode: string;
  optionsText: string;
} {
  const normalizedLanguages = languages
    .map((language) => ensureLocaleLanguage(language))
    .filter((language): language is LocaleLanguage => language !== null);

  const safeLanguages = normalizedLanguages.length > 0
    ? normalizedLanguages
    : [{ code: "EN", label: "English" }];

  return {
    defaultCode: safeLanguages[0].code,
    optionsText: safeLanguages.map((language) => `${language.label}|${language.code}`).join("\n"),
  };
}

export function moveLocaleLanguage(
  languages: LocaleLanguage[],
  fromIndex: number,
  toIndex: number
): LocaleLanguage[] {
  if (fromIndex < 0 || fromIndex >= languages.length) return languages;
  const boundedIndex = Math.max(0, Math.min(toIndex, languages.length - 1));
  return moveItem(languages, fromIndex, boundedIndex);
}

export function collectTranslationRows(pages: PageItem[]): TranslationRow[] {
  return collectTranslationRowsInternal(pages);
}

export function getTranslationText(
  translations: TranslationMap | undefined,
  key: string,
  languageCode: string,
  sourceText: string
): string {
  const normalizedCode = normalizeLanguageCode(languageCode);
  const translatedText = translations?.[key]?.[normalizedCode];
  return translatedText && translatedText.trim() ? translatedText : sourceText;
}

export function updateTranslationMap(
  translations: TranslationMap | undefined,
  key: string,
  languageCode: string,
  value: string
): TranslationMap {
  const normalizedCode = normalizeLanguageCode(languageCode);
  const nextTranslations: TranslationMap = { ...(translations ?? {}) };
  const nextEntry = { ...(nextTranslations[key] ?? {}) };
  const normalizedValue = value.trim();

  if (normalizedValue) {
    nextEntry[normalizedCode] = value;
  } else {
    delete nextEntry[normalizedCode];
  }

  if (Object.keys(nextEntry).length === 0) {
    delete nextTranslations[key];
  } else {
    nextTranslations[key] = nextEntry;
  }

  return nextTranslations;
}

export function removeLanguageFromTranslations(
  translations: TranslationMap | undefined,
  languageCode: string
): TranslationMap {
  const normalizedCode = normalizeLanguageCode(languageCode);
  const nextTranslations: TranslationMap = {};

  for (const [key, values] of Object.entries(translations ?? {})) {
    const nextValues = { ...values };
    delete nextValues[normalizedCode];
    if (Object.keys(nextValues).length > 0) {
      nextTranslations[key] = nextValues;
    }
  }

  return nextTranslations;
}

export function localizePages(
  pages: PageItem[],
  translations: TranslationMap | undefined,
  activeLanguageCode: string,
  sourceLanguageCode: string
): PageItem[] {
  const normalizedActiveCode = normalizeLanguageCode(activeLanguageCode);
  const normalizedSourceCode = normalizeLanguageCode(sourceLanguageCode);

  if (!normalizedActiveCode || normalizedActiveCode === normalizedSourceCode || !translations || Object.keys(translations).length === 0) {
    return pages;
  }

  return transformPagesText(pages, (key, sourceText) =>
    getTranslationText(translations, key, normalizedActiveCode, sourceText)
  );
}

export function updatePagesTextByKey(
  pages: PageItem[],
  key: string,
  value: string
): PageItem[] {
  return transformPagesText(pages, (currentKey, sourceText) =>
    currentKey === key ? value : sourceText
  );
}

export function promoteLocaleLanguageToDefault({
  pages,
  translations,
  languages,
  nextDefaultCode,
}: {
  pages: PageItem[];
  translations: TranslationMap | undefined;
  languages: LocaleLanguage[];
  nextDefaultCode: string;
}): {
  pages: PageItem[];
  translations: TranslationMap;
  languages: LocaleLanguage[];
} {
  const normalizedNextDefault = normalizeLanguageCode(nextDefaultCode);
  const safeLanguages = languages.length > 0 ? languages : [{ code: "EN", label: "English" }];
  const currentDefaultCode = safeLanguages[0].code;

  if (!normalizedNextDefault || normalizedNextDefault === currentDefaultCode) {
    return {
      pages,
      translations: translations ?? {},
      languages: safeLanguages,
    };
  }

  const rows = collectTranslationRowsInternal(pages);
  const nextPages = transformPagesText(pages, (key, sourceText) =>
    getTranslationText(translations, key, normalizedNextDefault, sourceText)
  );

  const nextTranslations: TranslationMap = { ...(translations ?? {}) };

  for (const row of rows) {
    const nextEntry = { ...(nextTranslations[row.key] ?? {}) };
    delete nextEntry[currentDefaultCode];
    delete nextEntry[normalizedNextDefault];
    if (row.sourceText.trim()) {
      nextEntry[currentDefaultCode] = row.sourceText;
    }
    if (Object.keys(nextEntry).length === 0) {
      delete nextTranslations[row.key];
    } else {
      nextTranslations[row.key] = nextEntry;
    }
  }

  const nextDefaultIndex = safeLanguages.findIndex((language) => language.code === normalizedNextDefault);
  const nextLanguages = nextDefaultIndex === -1
    ? [{ code: normalizedNextDefault, label: getKnownLanguage(normalizedNextDefault)?.label ?? normalizedNextDefault }, ...safeLanguages]
    : moveItem(safeLanguages, nextDefaultIndex, 0);

  return {
    pages: nextPages,
    translations: nextTranslations,
    languages: nextLanguages,
  };
}
