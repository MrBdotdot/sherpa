/**
 * JSON-LD is embedded into a <script type="application/ld+json"> block. If any
 * field in the structured-data object contains the literal text `</script>`,
 * it would terminate the script element and become an injection vector when
 * naively interpolated via dangerouslySetInnerHTML. Escape `<` to `<` —
 * this is the standard mitigation and remains valid JSON.
 */
export function safeJsonLdScript(obj: unknown): string {
  return JSON.stringify(obj).replace(/</g, "\\u003c");
}
