import { notFound } from "next/navigation";
import { fetchPublishedGame } from "@/app/_lib/gallery-queries";
import { ReadingPage } from "@/app/_components/gallery/reading-page";
import { buildGameJsonLd } from "@/app/_components/gallery/json-ld";
import { safeJsonLdScript } from "@/app/_lib/safe-jsonld";

export const dynamic = "force-dynamic";

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
