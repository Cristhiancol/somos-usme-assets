import { describe, it, expect } from "vitest";

describe("Google Drive OAuth configuration", () => {
  it("should have GOOGLE_DRIVE_CLIENT_SECRET configured", () => {
    const secret = process.env.GOOGLE_DRIVE_CLIENT_SECRET;
    expect(secret).toBeTruthy();
    expect(secret!.length).toBeGreaterThan(10);
  });

  it("should build a valid Google OAuth URL", async () => {
    // Import after env is set
    const { getGDriveAuthUrl, parseGDriveState } = await import("./gdrive-oauth");
    const redirectUri = "https://example.com/callback";
    const url = getGDriveAuthUrl(redirectUri);
    expect(url).toContain("accounts.google.com/o/oauth2/v2/auth");
    expect(url).toContain("client_id=327414420578");
    expect(url).toContain("drive.readonly");
    expect(url).toContain("offline");
    // state is now a base64url-encoded JSON containing gdrive_auth and redirectUri
    const stateMatch = url.match(/state=([^&]+)/);
    expect(stateMatch).toBeTruthy();
    const parsed = parseGDriveState(decodeURIComponent(stateMatch![1]));
    expect(parsed).toBeTruthy();
    expect(parsed!.type).toBe("gdrive_auth");
    expect(parsed!.redirectUri).toBe(redirectUri);
  });
});
