export function getGameIconUrl(gameIcon: string | undefined): string | null {
  const trimmed = gameIcon?.trim();
  if (!trimmed) return null;

  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("blob:") ||
    trimmed.startsWith("data:")
  ) {
    return trimmed;
  }

  return null;
}

export function getGameIconFallback(gameName: string): string {
  const firstCharacter = gameName.trim().charAt(0);
  return firstCharacter ? firstCharacter.toUpperCase() : "?";
}
