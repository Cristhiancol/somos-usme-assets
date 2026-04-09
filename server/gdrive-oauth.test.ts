import { describe, it, expect } from "vitest";

describe("Google Drive OAuth configuration", () => {
  it("should have GOOGLE_DRIVE_CLIENT_SECRET configured", () => {
    const secret = process.env.GOOGLE_DRIVE_CLIENT_SECRET;
    expect(secret).toBeTruthy();
    expect(secret!.length).toBeGreaterThan(10);
  });

  it("should build a valid Google OAuth URL", async () => {
    // Import after env is set
    const { getGDriveAuthUrl } = await import("./gdrive-oauth");
    const url = getGDriveAuthUrl("https://example.com/callback");
    expect(url).toContain("accounts.google.com/o/oauth2/v2/auth");
    expect(url).toContain("client_id=220183698829");
    expect(url).toContain("drive.readonly");
    expect(url).toContain("offline");
    expect(url).toContain("gdrive_auth");
  });
});
