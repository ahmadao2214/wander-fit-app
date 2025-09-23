/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as invitations from "../invitations.js";
import type * as sampleData from "../sampleData.js";
import type * as users from "../users.js";
import type * as workoutSessions from "../workoutSessions.js";
import type * as workouts from "../workouts.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  invitations: typeof invitations;
  sampleData: typeof sampleData;
  users: typeof users;
  workoutSessions: typeof workoutSessions;
  workouts: typeof workouts;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
