import { describe, it, expect } from "vitest";
import { deriveEntitlements } from "./usePlan";

describe("deriveEntitlements", () => {
  it("free plan has no publish, branding shown, no team seats, 0 collaborators", () => {
    const r = deriveEntitlements("free", null);
    expect(r.canPublish).toBe(false);
    expect(r.hasBranding).toBe(true);
    expect(r.hasTeamSeats).toBe(false);
    expect(r.maxCollaborators).toBe(0);
  });

  it("pro plan can publish, no branding, has team seats, 1 collaborator", () => {
    const r = deriveEntitlements("pro", null);
    expect(r.canPublish).toBe(true);
    expect(r.hasBranding).toBe(false);
    expect(r.hasTeamSeats).toBe(true);
    expect(r.maxCollaborators).toBe(1);
  });

  it("studio plan can publish, no branding, has team seats, unlimited collaborators", () => {
    const r = deriveEntitlements("studio", null);
    expect(r.canPublish).toBe(true);
    expect(r.hasBranding).toBe(false);
    expect(r.hasTeamSeats).toBe(true);
    expect(r.maxCollaborators).toBe("unlimited");
  });

  it("lifetime plan can publish, no branding, no team seats, 0 collaborators", () => {
    const r = deriveEntitlements("lifetime", null);
    expect(r.canPublish).toBe(true);
    expect(r.hasBranding).toBe(false);
    expect(r.hasTeamSeats).toBe(false);
    expect(r.maxCollaborators).toBe(0);
  });

  it("expired pro plan is treated as free", () => {
    const expired = new Date(Date.now() - 1000).toISOString();
    const r = deriveEntitlements("pro", expired);
    expect(r.canPublish).toBe(false);
    expect(r.hasTeamSeats).toBe(false);
    expect(r.maxCollaborators).toBe(0);
  });

  it("non-expired pro plan with future expires_at retains entitlements", () => {
    const future = new Date(Date.now() + 86400000).toISOString();
    const r = deriveEntitlements("pro", future);
    expect(r.canPublish).toBe(true);
    expect(r.hasTeamSeats).toBe(true);
    expect(r.maxCollaborators).toBe(1);
  });
});
