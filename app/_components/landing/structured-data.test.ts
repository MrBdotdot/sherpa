import { describe, it, expect } from "vitest";
import {
  buildWebSiteLd,
  buildOrganizationLd,
  buildSoftwareApplicationLd,
} from "./structured-data";

describe("buildWebSiteLd", () => {
  it("emits a WebSite with @context, @type, name, url, description", () => {
    const ld = buildWebSiteLd();
    expect(ld["@context"]).toBe("https://schema.org");
    expect(ld["@type"]).toBe("WebSite");
    expect(ld.name).toBe("Sherpa");
    expect(typeof ld.url).toBe("string");
    expect((ld.url as string).startsWith("http")).toBe(true);
    expect(ld.description).toBeTruthy();
  });
});

describe("buildOrganizationLd", () => {
  it("emits an Organization with @context, @type, name, url, logo, email", () => {
    const ld = buildOrganizationLd();
    expect(ld["@type"]).toBe("Organization");
    expect(ld.name).toBe("Sherpa");
    expect(ld.email).toBe("hello@sherpa.games");
    expect(typeof ld.logo).toBe("string");
    expect((ld.logo as string).endsWith("/sherpa-icon.svg")).toBe(true);
  });

  it("omits sameAs when SOCIAL_PROFILES is empty", () => {
    const ld = buildOrganizationLd();
    expect("sameAs" in ld).toBe(false);
  });
});

describe("buildSoftwareApplicationLd", () => {
  it("emits a SoftwareApplication with required schema.org fields", () => {
    const ld = buildSoftwareApplicationLd();
    expect(ld["@type"]).toBe("SoftwareApplication");
    expect(ld.name).toBe("Sherpa");
    expect(ld.applicationCategory).toBe("DesignApplication");
    expect(ld.operatingSystem).toBe("Web");
    expect(typeof ld.description).toBe("string");
    expect((ld.description as string)).toContain("board game designers");
  });

  it("omits offers (pricing not finalized)", () => {
    const ld = buildSoftwareApplicationLd();
    expect("offers" in ld).toBe(false);
  });

  it("omits aggregateRating (no real reviews to claim)", () => {
    const ld = buildSoftwareApplicationLd();
    expect("aggregateRating" in ld).toBe(false);
  });
});
