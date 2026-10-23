import { describe, it, expect } from "vitest";
import {
  getVerificationErrorMessage,
  VERIFICATION_FALLBACK_MESSAGE,
} from "../signUpErrors";

const clerkError = (code: string, extra: Record<string, string> = {}) => ({
  clerkError: true,
  errors: [{ code, ...extra }],
});

describe("getVerificationErrorMessage", () => {
  it("explains an incorrect code", () => {
    expect(getVerificationErrorMessage(clerkError("form_code_incorrect"))).toBe(
      "That code is incorrect. Please try again."
    );
  });

  it("tells the user to resend an expired code", () => {
    expect(getVerificationErrorMessage(clerkError("verification_expired"))).toContain("Resend");
  });

  it("handles too many attempts", () => {
    expect(getVerificationErrorMessage(clerkError("verification_failed"))).toContain("Too many attempts");
    expect(getVerificationErrorMessage(clerkError("too_many_requests"))).toContain("Too many attempts");
  });

  it("hides Clerk's developer-facing message when the user quota is exceeded", () => {
    const message = getVerificationErrorMessage(
      clerkError("user_quota_exceeded", {
        longMessage: "You have reached your limit of 100 users. If you need more users, please use a Production instance.",
      })
    );
    expect(message).toBe("We can't create new accounts right now. Please try again later.");
    expect(message).not.toContain("Production instance");
  });

  it("falls back to Clerk's long message for unknown codes", () => {
    expect(
      getVerificationErrorMessage(clerkError("something_new", { message: "Short", longMessage: "Long message" }))
    ).toBe("Long message");
  });

  it("falls back to Clerk's short message when there is no long message", () => {
    expect(getVerificationErrorMessage(clerkError("something_new", { message: "Short" }))).toBe("Short");
  });

  it("uses the generic message for non-Clerk errors", () => {
    expect(getVerificationErrorMessage(new Error("network down"))).toBe(VERIFICATION_FALLBACK_MESSAGE);
    expect(getVerificationErrorMessage(undefined)).toBe(VERIFICATION_FALLBACK_MESSAGE);
    expect(getVerificationErrorMessage({ errors: [] })).toBe(VERIFICATION_FALLBACK_MESSAGE);
  });
});
