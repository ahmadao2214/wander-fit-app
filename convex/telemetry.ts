import { internalAction } from "./_generated/server";
import { v } from "convex/values";

const DEFAULT_POSTHOG_API_HOST = "https://us.posthog.com";

export interface DeletePostHogPersonResult {
  deleted: boolean;
  alreadyGone?: boolean;
  reason?: "unconfigured" | "invalid_id" | "error";
  deletedCount?: number;
}

/**
 * Deletes a PostHog person and their associated events by distinct_id (Convex users._id).
 *
 * Designed to be scheduled from Thread C's account deletion cascade
 * (`purgeAthleteRecords` / `deleteMyAccount`). Cleanly no-ops when
 * POSTHOG_PERSONAL_API_KEY or POSTHOG_PROJECT_ID is unset (dev, CI, E2E)
 * and never throws so account deletion in Convex cannot be blocked by
 * transient PostHog API failures.
 */
export const deletePostHogPerson = internalAction({
  args: {
    distinctId: v.id("users"),
  },
  handler: async (_ctx, args): Promise<DeletePostHogPersonResult> => {
    const cleanId = String(args.distinctId).trim();
    if (!cleanId) {
      return { deleted: false, reason: "invalid_id" };
    }

    const apiKey = process.env.POSTHOG_PERSONAL_API_KEY?.trim();
    const projectId = process.env.POSTHOG_PROJECT_ID?.trim();
    const host = (process.env.POSTHOG_HOST?.trim() || DEFAULT_POSTHOG_API_HOST).replace(/\/+$/, "");

    if (!apiKey || !projectId) {
      return { deleted: false, reason: "unconfigured" };
    }

    const headers = {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    };

    try {
      const lookupUrl = `${host}/api/projects/${encodeURIComponent(projectId)}/persons/?distinct_id=${encodeURIComponent(cleanId)}`;
      const lookupResponse = await fetch(lookupUrl, { method: "GET", headers });

      if (lookupResponse.status === 404) {
        return { deleted: false, alreadyGone: true };
      }
      if (!lookupResponse.ok) {
        console.error("[Telemetry] PostHog person lookup failed:", lookupResponse.status);
        return { deleted: false, reason: "error" };
      }

      const payload = (await lookupResponse.json()) as {
        results?: Array<{ id?: number | string; distinct_ids?: string[] }>;
      };
      const results = Array.isArray(payload.results) ? payload.results : [];

      // Verify each matched person explicitly owns `cleanId` before issuing DELETE
      const matchingPersons = results.filter(
        (person) =>
          person.id !== undefined &&
          person.id !== null &&
          Array.isArray(person.distinct_ids) &&
          person.distinct_ids.includes(cleanId)
      );

      if (matchingPersons.length === 0) {
        return { deleted: false, alreadyGone: true };
      }

      let deletedCount = 0;
      for (const person of matchingPersons) {
        const deleteUrl = `${host}/api/projects/${encodeURIComponent(projectId)}/persons/${encodeURIComponent(String(person.id))}/?delete_events=true`;
        const deleteResponse = await fetch(deleteUrl, { method: "DELETE", headers });
        if (deleteResponse.status === 404 || deleteResponse.ok) {
          deletedCount += 1;
        } else {
          console.error("[Telemetry] PostHog person delete failed:", deleteResponse.status);
          return { deleted: false, reason: "error", deletedCount };
        }
      }

      return { deleted: deletedCount > 0, deletedCount };
    } catch (error) {
      console.error("[Telemetry] PostHog person deletion threw:", error);
      return { deleted: false, reason: "error" };
    }
  },
});
