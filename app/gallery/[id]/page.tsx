import { notFound } from "next/navigation";
import { fetchPublishedGame } from "@/app/_lib/gallery-queries";
import { ReadingPage } from "@/app/_components/gallery/reading-page";
import { buildGameJsonLd } from "@/app/_components/gallery/json-ld";

export const dynamic = "force-dynamic";

/**
 * JSON-LD is embedded into a <script type="application/ld+json"> block. If any
 * field in the structured-data object contains the literal text `</script>`,
 * it would terminate the script element and become an injection vector when
 * naively interpolated via dangerouslySetInnerHTML. Escape `<` to `<` —
 * this is the standard mitigation and remains valid JSON.
 */
function safeJsonLdScript(obj: unknown): string {
  return JSON.stringify(obj).replace(/</g, "\\u003c");
}

export default async function GalleryEntryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await fetchPublishedGame(id);
  if (!result) notFound();

  const { game, cards } = result;
  const ld = buildGameJsonLd(game, cards);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLdScript(ld) }}
      />
      <ReadingPage game={game} cards={cards} />
    </>
  );
}
