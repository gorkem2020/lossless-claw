import { describe, expect, it } from "vitest";
import {
  compileSessionPattern,
  compileSessionPatterns,
  isBaseChannelSessionKey,
  matchesSessionPattern,
  sessionKeyChannelScope,
} from "../src/session-patterns.js";

describe("session ignore patterns", () => {
  it("treats * as non-colon wildcard and ** as cross-segment wildcard", () => {
    const baseCronPattern = compileSessionPattern("agent:*:cron:*");
    const cronRunPattern = compileSessionPattern("agent:*:cron:**");
    const deepPattern = compileSessionPattern("agent:main:subagent:**");

    expect(baseCronPattern.test("agent:main:cron:nightly")).toBe(true);
    expect(baseCronPattern.test("agent:main:cron:nightly:run:run-123")).toBe(false);
    expect(cronRunPattern.test("agent:main:cron:nightly:run:run-123")).toBe(true);
    expect(deepPattern.test("agent:main:subagent:child")).toBe(true);
    expect(deepPattern.test("agent:main:subagent:batch:child")).toBe(true);
  });

  it("matches session keys against any compiled ignore pattern", () => {
    const patterns = compileSessionPatterns([
      "agent:*:cron:**",
      "agent:ops:**",
    ]);

    expect(matchesSessionPattern("agent:main:cron:nightly:run:run-123", patterns)).toBe(true);
    expect(matchesSessionPattern("agent:ops:subagent:123", patterns)).toBe(true);
    expect(matchesSessionPattern("agent:main:main", patterns)).toBe(false);
  });
});

describe("session key channel scope", () => {
  it("reduces base, thread, and active-memory variants to one channel scope", () => {
    const base = "agent:scout:slack:channel:lobby";
    expect(sessionKeyChannelScope(base)).toBe(base);
    expect(sessionKeyChannelScope("agent:scout:slack:channel:lobby:thread:1700000000.000100")).toBe(base);
    expect(sessionKeyChannelScope("agent:scout:slack:channel:lobby:active-memory:abc123")).toBe(base);
    expect(
      sessionKeyChannelScope("agent:scout:slack:channel:lobby:thread:1700000000.000100:active-memory:abc123"),
    ).toBe(base);
  });

  it("has no channel scope for keys without a channel segment", () => {
    expect(sessionKeyChannelScope("agent:scout:direct-session")).toBeNull();
    expect(sessionKeyChannelScope("agent:main:main")).toBeNull();
    expect(sessionKeyChannelScope(undefined)).toBeNull();
    expect(sessionKeyChannelScope("")).toBeNull();
  });

  it("identifies base channel keys separately from thread and active-memory variants", () => {
    expect(isBaseChannelSessionKey("agent:scout:slack:channel:lobby")).toBe(true);
    expect(isBaseChannelSessionKey("agent:scout:slack:channel:lobby:thread:1700000000.000100")).toBe(false);
    expect(isBaseChannelSessionKey("agent:scout:slack:channel:lobby:active-memory:abc123")).toBe(false);
    expect(isBaseChannelSessionKey("agent:scout:direct-session")).toBe(false);
    expect(isBaseChannelSessionKey(undefined)).toBe(false);
  });
});
