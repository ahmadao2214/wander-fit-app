/**
 * @deprecated Compatibility path for installed builds only.
 *
 * Builds from before the trainer/client screens were removed call
 * `api.workoutSessions.getHistory` from the History tab. It now serves the
 * caller's GPP sessions, which is what that tab renders (`templateSnapshot`).
 * Delete this file once no installed build older than that change is in use.
 */
export { getHistory } from "./gppWorkoutSessions";
