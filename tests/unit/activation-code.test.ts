import { describe, expect, it } from "vitest";
import {
  ACTIVATION_CODE_PATTERN,
  formatActivationCodeInput,
  isCompleteActivationCodeInput,
  isValidActivationCodeFormat,
  normalizeActivationCode,
} from "@/lib/activation-code";
import { generateActivationCode } from "@/server/services/activation-code";

describe("activation code format", () => {
  it("generates codes matching the canonical shape", () => {
    for (let i = 0; i < 50; i += 1) {
      expect(generateActivationCode()).toMatch(ACTIVATION_CODE_PATTERN);
    }
  });

  it("never uses ambiguous characters (0, 1, I, O)", () => {
    for (let i = 0; i < 200; i += 1) {
      expect(generateActivationCode()).not.toMatch(/[01IO]/);
    }
  });

  it("generates unique codes across a large batch", () => {
    const codes = new Set<string>();
    for (let i = 0; i < 1000; i += 1) codes.add(generateActivationCode());
    expect(codes.size).toBe(1000);
  });

  it("is not derived from a sequential / guessable value", () => {
    const first = generateActivationCode();
    const second = generateActivationCode();
    expect(first).not.toBe(second);
    // No part of the code is a zero-padded counter.
    expect(first).not.toMatch(/VRC-0000-0000/);
  });
});

describe("activation code input handling", () => {
  it("normalizes the ways a buyer may type the code", () => {
    const expected = "VRC-7K4P-92MA";
    expect(normalizeActivationCode("VRC-7K4P-92MA")).toBe(expected);
    expect(normalizeActivationCode("vrc-7k4p-92ma")).toBe(expected);
    expect(normalizeActivationCode("vrc 7k4p 92ma")).toBe(expected);
    expect(normalizeActivationCode("7k4p92ma")).toBe(expected);
    expect(normalizeActivationCode("VRC7K4P92MA")).toBe(expected);
  });

  it("rejects incomplete or wrong-length codes", () => {
    expect(isValidActivationCodeFormat("VRC-7K4P-92M")).toBe(false);
    expect(isValidActivationCodeFormat("VRC-7K4P-92MAA")).toBe(false);
    expect(isValidActivationCodeFormat("7K4P-92MA")).toBe(false);
    expect(isCompleteActivationCodeInput("VRC-7K4P-92M")).toBe(false);
    expect(isCompleteActivationCodeInput("VRC-7K4P-92MA")).toBe(true);
  });

  it("formats keystrokes progressively while the buyer types", () => {
    expect(formatActivationCodeInput("7")).toBe("VRC-7");
    expect(formatActivationCodeInput("7k4p")).toBe("VRC-7K4P");
    expect(formatActivationCodeInput("7k4p92")).toBe("VRC-7K4P-92");
    expect(formatActivationCodeInput("7k4p92ma")).toBe("VRC-7K4P-92MA");
    // Extra characters beyond the payload are ignored.
    expect(formatActivationCodeInput("7k4p92maextra")).toBe("VRC-7K4P-92MA");
  });
});
