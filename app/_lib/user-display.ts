function capitalize(segment: string) {
  if (!segment) return "";
  return segment.charAt(0).toUpperCase() + segment.slice(1);
}

export function getUserNameParts(email: string) {
  const localPart = email.split("@")[0] ?? "";
  const tokens = localPart
    .split(/[._-]+/)
    .map((token) => token.trim())
    .filter(Boolean)
    .map(capitalize);

  const firstName = tokens[0] ?? "";
  const lastName = tokens.length > 1 ? tokens.slice(1).join(" ") : "";
  const displayName = [firstName, lastName].filter(Boolean).join(" ").trim();

  return {
    firstName,
    lastName,
    displayName,
    initial: (firstName.charAt(0) || email.charAt(0) || "?").toUpperCase(),
  };
}
