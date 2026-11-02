import { describe, it, expect } from "vitest";
import { hostBlocked } from "@/lib/safe-fetch";

describe("GEO tool host blocklist", () => {
  it("blocks localhost and private names", () => {
    expect(hostBlocked("localhost")).toBe(true);
    expect(hostBlocked("127.0.0.1")).toBe(true);
    expect(hostBlocked("10.0.0.1")).toBe(true);
    expect(hostBlocked("192.168.1.8")).toBe(true);
    expect(hostBlocked("169.254.169.254")).toBe(true);
    expect(hostBlocked("metadata.google.internal")).toBe(true);
  });

  it("allows public hostnames", () => {
    expect(hostBlocked("example.com")).toBe(false);
    expect(hostBlocked("avalokite.xyz")).toBe(false);
  });
});
