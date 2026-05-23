import { notFound } from "next/navigation";
import { fetchPublishedGame } from "@/app/_lib/gallery-queries";
import { ReadingPage } from "@/app/_components/gallery/reading-page";
import { buildGameJsonLd, buildBreadcrumbListLd } from "@/app/_components/gallery/json-ld";
import { safeJsonLdScript } from "@/app/_lib/safe-jsonld";
import { SITE_URL } from "@/app/_lib/site-config";

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
  const breadcrumbs = buildBreadcrumbListLd(game, SITE_URL);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLdScript(ld) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLdScript(breadcrumbs) }}
      />
      <ReadingPage game={game} cards={cards} />
    </>
  );
}
