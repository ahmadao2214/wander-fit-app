# Chat hands stay inside the program

An athlete's chat may reorder a prescribed day, swap two prescribed days, and take an easier or harder version a movement already has. The first build writes the reorder and the swap. It does not write easier or harder, because the app chooses that from the workout's intensity and does not store an athlete's choice on the day. The program intake computed stays the assignment. The chat does not pull a movement from the library bank, and it does not change skill, phase, or the intensity ceiling.

A 14–17 athlete connects their own account. The app has no parent account, and the age group on intake stays.

The chat shows the day as it will look and writes only after the athlete accepts. If the day changed after the chat read it, that acceptance does not apply and the chat reads the day again. Reorder, swap, and the easier or harder version can be reversed by doing them again, so this slice has no separate undo ledger.

The first connection is one remote MCP server, proved in Claude on the phone. It reads the athlete's program and the prescribed days in unlocked phases, and it writes only the three accepted day changes. A locked phase stays unread and unchanged. The chat states a phase, a day, an exercise, a set, or a rep only when a tool returned it on that turn. Logging a set stays in the app. Intake is the next slice: the chat submits answers the athlete stated, and the app recomputes the program. The library-add slice stays after intake.

The athlete finds the steps in App Settings. They add the connector in Claude. If intake is not finished, the chat says there is no program yet and does not invent one.

Every athlete who can sign in gets this connection. Pricing and who can reach it later are decided after it exists.

## Later slice, agreed and not started

The chat may add a movement that already exists in the library onto a day. The day keeps its phase and skill. The added movement is marked so a prescribed movement and an athlete-added movement stay distinct. Phase, skill, and the intensity ceiling stay with the program until a trainer product exists. The same acceptance rule applies.

## Sign-in for the connection

Clerk, which already signs the athlete into the app, is the authorization server for the connection. The `/mcp` endpoint is only a resource server: it publishes metadata at `/.well-known/oauth-protected-resource/mcp` naming Clerk, and a request without a token gets a 401 that points there. Convex checks the Clerk OAuth access token through a second provider in `auth.config.ts`, whose audience is the endpoint's own address (`MCP_RESOURCE_URL`). Every hand, including the app's own Today query, then runs as that athlete with no second code path. The provider is off until `MCP_RESOURCE_URL` is set on a deployment.
