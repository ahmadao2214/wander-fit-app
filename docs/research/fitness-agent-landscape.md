# Fitness apps that let an agent use the product

Research date: **2026-11-11**. This review uses opened first-party product pages, help articles, developer documentation, publisher repositories, and developer-written App Store text; the MyFitnessPal announcement is a release issued by MyFitnessPal on GlobeNewswire. It describes documented capabilities, without connecting an athlete account or testing writes. “None found” means no public athlete-facing agent surface was established in the cited pages, not proof that one cannot exist. “Unknown” means the source does not settle that detail. Phone support distinguishes using the external agent on a phone from merely receiving its output in a phone app; a browser product is identified explicitly. Account connection, chat-vendor dependence, and age/health-data statements follow the table.

## What exists

| Product | Surface | Actor | Reads | Writes | Confirmation | Works on phone | Source |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **Hevy** | ChatGPT app; official MCP/Claude connector | Athlete, own account | Workout history, exercise history, saved routines/folders, exercise library, profile/unit preferences | Create/update routines, save multi-routine plans and folders, create custom exercises. The documented MCP tools do **not** include logging completed workouts or moving calendar dates. | New routines/plans normally show a preview and **Save in Hevy** button; an explicit request can skip the preview. Custom exercises save immediately; no equivalent confirmation rule is stated for routine updates. | **Yes:** current ChatGPT plugin guide explicitly covers the phone app. | [H1], [H2], [H3] |
| **Caliber** | ChatGPT app; official MCP for Claude | Athlete, own account | Sets/reps/weights, PRs, plans, exercise library, calendar, body stats, nutrition/targets, cardio, steps, units | **None.** Suggested plans stay in the conversation; connector cannot create, edit, or delete account data. | Read-only; account authorization required. | **Yes:** vendor explicitly says ChatGPT and Claude mobile apps. | [C1], [C2] |
| **Strava** | Official MCP; Claude connector; Gemini connected app | Athlete/subscriber, own account | Live activity history, training analytics/load, fitness trends, cross-sport patterns, gear, best efforts, weather, streaks | **None:** cannot upload, edit, or delete activities. | Read-only; OAuth approval when connecting. | **Yes:** Strava mobile setup and Gemini mobile use are documented. | [ST1], [G1] |
| **MyFitnessPal — external** | ChatGPT app | Individual seeking nutrition guidance | MyFitnessPal nutrition/recipe resources and metrics entered in chat, including age, sex, weight, height, activity and goals. The release does not establish personal diary access. | Calorie/macro suggestions and recipes in chat; **no verified write to the MFP diary**. Account linking and meal logging are described as possible future iterations. | No account mutation established. | Not specified in the opened product announcement; do not infer mobile integration from the mobile MFP app. | [M1] |
| **MyFitnessPal — Nutrition Coach** | **In-app chat**, separate from its ChatGPT app | Athlete/member | Recent diary, calorie/macro goals, saved meals/recipes, food database and steps | Cannot log food or edit goals; cannot access weight history yet. | No write capability documented. | **Yes:** Premium/Premium+ on iOS, English, in six named countries; rollout caveat. | [M2] |
| **ABC Trainerize / FitMetrics** | Officially promoted MCP for Claude/ChatGPT; also internal AI tools | **Coach operating clients**, background comparison | Client workouts/nutrition/history, check-ins, conversations, forms; wearable recovery/sleep/readiness | Build programs, set macros, schedule check-ins, message cohorts | Explicit confirm-before-write, impact previews, audit trail and coach scoping | Client phone app receives results; external-agent phone operation is **not established** by these pages. | [TR1], [TR2], [TR3] |
| **TrainHeroic** | **None found for the athlete** | No athlete agent established | — | — | — | No external-agent phone workflow established. | [TH1], [TH2] |
| **TeamBuildr** | **None found** | No athlete agent established | — | — | — | No external-agent phone workflow established. | [TB1] |
| **Future** | **None found for the athlete**; Assistant Coach AI is described as a tool used by Future's coaches | Human coach serving athlete | No external-agent account reads established | No external-agent account writes established | — | Phone coaching is a product feature; no external-agent phone workflow established. | [F1], [F2] |
| **Fitbod** | **None found that could be verified in opened documentation**; ChatGPT listing lead unresolved | Unknown | Unknown | Unknown | Unknown | Unknown for the potential ChatGPT integration. | [FB1], [FB2], [FB4] |
| **Strong** | **Siri Shortcuts** listed by vendor; no verified ChatGPT/MCP surface in checked pages | Athlete | Exact Shortcut read actions unspecified | Exact Shortcut write actions unspecified; do not infer arbitrary set logging or calendar edits | Unspecified | **Yes, Siri on iPhone:** App Store explicitly lists Siri support. Android app availability does not establish Android agent support. | [S1], [S2] |
| **Ladder** | **None found**; human coaching is not an external agent | Athlete using coach-created plans | No external-agent reads established | No external-agent writes established | — | No external-agent phone workflow established. | [L1] |
| **JuggernautAI** | **None found**; adaptive programming is not evidence of a chatbot or connector | Athlete | No external-agent reads established | No external-agent writes established | — | iOS/Android product documented; external-agent phone workflow not established. | [J1] |
| **TrueCoach** | **None found for the athlete** | No athlete agent established | — | — | — | No external-agent phone workflow established. | [TC1], [TC2] |
| **WHOOP** | **In-app chat: WHOOP Coach**; direct external agent surface none found in checked WHOOP page | Athlete/member | Personal biometric context including Recovery, Strain, Sleep, Health, Stress and Journal behaviors | Advice and training-plan responses; persistent workout/calendar mutations are not established by this announcement | Not specified for account changes | **Yes, in WHOOP app.** OpenAI-powered does not mean callable from the user's ChatGPT account. | [W1] |
| **Nike Training Club** | **None found** | No external agent established | — | — | — | No external-agent phone workflow established in the developer's App Store description. | [N1] |
| **Tally** | Official remote MCP; Claude directory connector; custom ChatGPT connection | Athlete, own account | Training history, sets, exercise progress/library, saved workouts, planned days, weekly summaries and restorable workout versions | Plan up to 31 dates; add/remove/change exercises; move to an empty date; skip/delete plans. With full access/OAuth: log/edit/delete/restore finished workouts. | Finished-workout changes require the user's request; protected app-authored days need an explicit override. Version checks prevent stale edits; finished-workout changes have seven-day undo. No universal mandatory preview is documented. | **Yes via Claude mobile.** Vendor says custom MCP apps do **not** work in ChatGPT's phone app; its ChatGPT guide also limits write availability by plan. Tally itself is iPhone. | [T1], [T2], [T3] |
| **Athos** | Official remote MCP; own coaching chat; iPhone **beta** | Athlete, own account | Saved onboarding/questions/review/status, canonical active program, planning questions and queued-change status | Save intake answers/corrections, confirm first-program generation, adapt/move a remaining workout, replan remaining week, update or replace program, plan next week. Completed workout logging remains in the app. | Exact onboarding review needs explicit approval; program writes need consent and an explicit athlete request; replacement needs explicit confirmation. Queued changes must reach publication before being called saved. | iPhone TestFlight execution documented; **external chat on phone not explicitly verified** by connection guide. | [A1], [A2] |
| **Sport MCP** | Product-published remote MCP | Athlete, own account | Workouts/history/records, schedule, templates and permitted profile facts | Create templates, schedule/rearrange workouts, log described sessions | Vendor says Claude/ChatGPT/Gemini ask before saving/changing unless user enables always-allow | **Yes via Claude and Gemini mobile** after setup; vendor says custom ChatGPT connection is unavailable in its app. Training log is iPhone. | [SP1], [SP2], [SP3] |
| **SmartGym** | **Siri / App Intents**; separate in-app natural-language creation/refinement | Athlete; trainer features also exist | Routines, schedule, exercises, equipment, muscle groups, workout history/summary, recovery, goals and metrics | Siri can create/import a routine, start today's workout, log a set and advance exercises. In-app natural-language refinement can add/remove exercises and move a routine to another day; the page does not explicitly assign every refinement to Siri. | Siri workout creation opens SmartGym for review. Per-set confirmation unspecified. | **Yes:** native iPhone and Apple Watch; Apple platforms. | [SG1], [SG2] |
| **StrongLifts** | **Siri / Start Workout Shortcut action** | Athlete | Selects next workout or an already-running workout | Starts/resumes the workout. “Log a Workout” is listed as a phrase for **starting**, not evidence of dictated set logging. | On iPhone, an existing workout with logged sets prompts resume-versus-new choice | **Yes:** iPhone and Apple Watch | [SL1] |
| **Gentler Streak** | **Siri / App Intents**; on-screen awareness | Athlete | Activity status, today's workouts/suggestions/body metrics, last night's sleep; on-screen context | Start workout on Apple Watch. No calendar/program editing documented in cited release text. | Unspecified | **Yes:** iPhone/Apple Watch; version notes associate the new experience with iOS 27 and flag regional Siri availability. | [GS1] |
| **Peloton** | **Gemini connected app** | Athlete/individual | Search class catalog | Schedule classes; create multi-day training plans. No exercise-by-exercise strength prescription or completed-set logging documented here. | Peloton-specific confirmation rule unspecified | **Yes:** Google's availability table lists Gemini mobile, web and Windows. | [G1], [G2] |
| **Withings** | Official remote MCP | Individual, own profile | Measurements/body composition, sleep, workouts/activity, readiness, symptoms/goals, Health Memory and product documentation | Add measurements/symptoms; save/delete Health Memory facts. **Cannot edit/delete measurements** or manage devices/account. No workout-program/calendar writes documented. | Explicitly asks before writes | **Yes via Claude mobile after setup.** Vendor says ChatGPT custom connector is web-only; other clients' mobile availability varies. | [WI1], [WI2] |
| **Vis Pro** | Official **MCP Alpha** | Individual, own account | Elements of the user's program library | Create/modify workout programs in the library; sent to device. Scheduling and changes to individual workouts are described as future work. | Host-configurable: Claude setup recommends always-allow; no compulsory per-write confirmation stated | Device delivery documented; operating the external chat on a phone is **not established**. | [V1] |
| **Workout Chat** | Official MCP; also its own chat | Athlete, own account | Workout history/progress, exercise lookup, injury/goal context | Log/update workouts and exercises; log weight/injuries; update injury status, goals and unit preferences | OAuth approval documented; per-write confirmation unspecified | **Mobile web product**, installable to home screen, not a native mobile integration. External MCP client phone support not explicitly established. | [WC1], [WC2] |
| **Gym Plus** | Official MCP | Athlete, own account | Logged sessions, history export, aggregate records/activity, plans, exercise library | Detailed guide: create/edit/trash plans, including exercises/days; **cannot log sets or delete completed workouts**. Its repository makes a broader logging claim; see conflict below. | Write/destructive tools are flagged so the host **can** ask; mandatory confirmation not guaranteed | **Browser product**; guide says plans are usable on a phone in the browser. External chat mobile operation unspecified. | [GP1], [GP2] |
| **athletedata** | Own MCP bridge; **not an official connector from each underlying fitness vendor** | Athlete connecting own sources | Connected training, sleep/recovery, strength, nutrition and body data; repository names WHOOP, Hevy, Strong, Fitbod and others | With permission, push structured workouts to Garmin/COROS through Intervals.icu or Apple Watch through its iPhone app; log food; create a Hevy routine | Repository requires permission for writes; exact universal confirmation UI unspecified | iPhone/Watch delivery exists; checked client guides establish web/desktop, and explicitly exclude ChatGPT phone app custom connections. External phone chat not established there. | [AD1], [AD2], [AD3] |

**Account connection, vendor scope, and age/health-data notes**

- **Hevy:** OAuth sign-in to the existing Hevy account, without an API key, powers the MCP surface; ChatGPT and Claude are supported, and other MCP clients are documented, so the product is not locked to one chat vendor. The new ChatGPT app replaces HevyGPT; the older GPT's Android limitation should not be applied to the new phone instructions. The integration pages discuss authorized training-data access and disconnection, but state no teen-specific agent policy. [H1], [H2], [H3]
- **Caliber:** OAuth 2.0 with Caliber sign-in; both ChatGPT and Claude, not one vendor. It exposes only the athlete's own data, including body and nutrition data. The privacy policy says services are intended for ages 13+, but does not define a separate adolescent MCP workflow. Documentation conflict: the help article's overview says free accounts work, while its Requirements section says active subscription; the product MCP page expressly says free accounts work. [C1], [C2], [C3]
- **Strava:** OAuth plus a Strava subscription; officially supported assistants are Claude and Gemini, not arbitrary MCP clients by inference. Its integration help limits access to the athlete's own account and allows revocation. Google's table makes the Gemini integration **18+, US-only, English, personal Google accounts**. That restriction concerns the Gemini route, not a blanket Strava minimum age. [ST1], [G1]
- **MyFitnessPal external:** The company-issued release documents ChatGPT specifically and puts account linking in future-tense examples, so it does not establish an authenticated diary connection. It explicitly collects demographic/body/activity inputs for nutrition suggestions; it states no teen-specific rules or product-specific phone support. The companion company blog URL returned HTTP 403; the company-issued release was opened directly and is the primary evidence used here. [M1], [M3]
- **Trainerize/FitMetrics:** A coach connects FitMetrics from the Trainerize web account; the opened documents do not settle the external client's exact OAuth/key flow. Claude, ChatGPT, CRM and custom tools are supported. Published controls include per-coach scope and read-only keys; client health context includes nutrition and wearable recovery/sleep. No adolescent-specific agent rules or phone-agent guarantee appear in these cited pages. This is a roster/business surface, not evidence that an athlete can connect their own client account. [TR1], [TR2], [TR3]
- **Strong:** Siri Shortcuts are advertised and its App Store listing confirms Siri support, but these pages supply neither the Siri action inventory nor connection/confirmation instructions. Siri is the named vendor surface; no external chat account-linking flow is established. The product page mentions privacy/permissions and body measurements, but gives no Siri-specific health-data or teen rules. [S1], [S2]
- **Tally:** OAuth 2.1 with Apple/Google/email sign-in, or API keys with Read only / Read and plan / Full access levels; supports multiple MCP clients. Its privacy policy describes optional cloud sync, connected assistants, planning context including injuries, and deletion controls; it excludes children under 13, without defining a separate 14–17 agent-consent flow. ChatGPT plan/phone restrictions above are Tally's documented restrictions, not a rule inferred for all ChatGPT apps. [T1], [T2], [T3], [T4]
- **Athos:** OAuth with scoped onboarding/program permissions, using the same Athos account; ChatGPT, Claude and other clients have setup instructions, with client-verification caveats. The iPhone product is a TestFlight beta. Published privacy text covers training experience, schedule, injuries, workout/meal logs, food photos and coaching conversations, and says the service is for adults 18+. The terms also say 18+, while visibly labeling themselves a starter template; treat that wording as published policy evidence, not a mature compliance guarantee. [A1], [A2], [A3], [A4]
- **Sport MCP:** OAuth 2.1/PKCE with app-account sign-in and consent; no pasted key. Multiple assistants are documented. Its policy explains that training/profile facts read by an assistant go to that assistant's provider, while conversations stay with the provider. Its terms require **16+**; its Gemini setup additionally says **18+**. Neither supports treating the complete 14–17 group as covered. [SP1], [SP2], [SP3], [SP4]
- **SmartGym:** Siri invokes the installed Apple app, rather than a documented ChatGPT/Claude account connector. The release says SmartGym Intelligence must be enabled with consent, uses anonymous requests and does not retain prompts; this is the vendor's statement about that AI feature, not a blanket statement about all Siri processing. No teen-specific terms appear in the cited release. [SG1]
- **StrongLifts:** Install the app on iPhone/Watch and invoke Siri; no separate external account link or prebuilt Shortcut is needed. Siri is the documented surface. The setup article gives no teen or health-data-processing rules. [SL1]
- **Gentler Streak:** Siri/App Intents operate through the installed Apple app; no external chat login is described. The developer's listing says health/fitness data remains on-device via HealthKit, and carries an App Store 13+ content rating; that rating does **not** establish teen account eligibility or a special teen agent-consent flow. [GS1]
- **Peloton:** Enable/use its Gemini connected app; Google's general setup is through Connected Apps and any prompted third-party connection flow. The checked sources do not publish Peloton-specific account scopes or confirmation behavior. Gemini is the only verified vendor surface here. Google's table requires **18+, US, English, personal Google account**; it does not state Peloton-specific health-data handling. [G1], [G2], [G3]
- **Withings:** Withings+ membership and OAuth sign-in on Withings' page; not vendor-locked, with guides for Claude, ChatGPT, Vibe and Grok. Its support article also names Gemini as compatible. Data access is restricted to the connected person's own profile, excluding family profiles; vendor states HDS-certified health-data hosting and explicit approval before writes. No teen-specific connector eligibility appears in the cited connector pages. [WI1], [WI2]
- **Vis:** Authorize access to the Vis Pro account from ChatGPT or Claude; exact authentication protocol is not specified in the announcement. Not locked to one assistant. The privacy policy describes workout data and says the service is not directed to under-13s; no adolescent-specific MCP rules are documented. The announcement remains explicitly Alpha and limits current writes to library elements. [V1], [V2]
- **Workout Chat:** OAuth 2.1/PKCE and dynamic client registration; same account across clients, with remote Streamable HTTP MCP rather than a single-vendor connector. Tool scope explicitly includes weight and injuries. These docs do not specify teen eligibility, a distinct health-data consent flow, or compulsory per-write approval. Its mobile product is a web app. [WC1], [WC2]
- **Gym Plus:** Browser sign-in/OAuth for Claude and ChatGPT; personal tokens are also documented for other clients. Not vendor-locked. The detailed guide limits access to the connected account, records tool/field names rather than field values in an audit log, and says sets must be logged in the app. Its repository instead says an assistant can log workouts; this conflict is unresolved, so agent set logging is **not counted as verified**. Neither cited guide establishes teen-specific or medical-data handling. [GP1], [GP2]
- **athletedata:** Connect sources to an athletedata account, then authorize the agent via OAuth or API key; supports several MCP clients. The repository names health/recovery and nutrition sources and states no sale or model training on the data. It does not establish teen eligibility or a mandatory per-write preview. Its own connector is primary evidence for this **bridge's claims**, not proof that WHOOP, Strong or Fitbod ships the same integration itself. [AD1], [AD2], [AD3]

**Limits of negative and inaccessible findings.** TrainHeroic's own integration page documents Apple Health nutrition and coach-oriented Zapier; its Zapier guide lists invitation, sale, trial and cancellation triggers, not athlete program editing. TeamBuildr's checked integration index lists device/AMS/export/webhook integrations, without an agent surface. TrueCoach's own Zapier documentation describes organizational triggers and an Add Client action, not an athlete editing their training from chat. These are not counted as athlete-facing MCP integrations merely because an automation directory can advertise an MCP wrapper. [TH1], [TH2], [TB1], [TC1]

Fitbod's ChatGPT directory URL surfaced in search, but opening both its named URL and directory identifier returned only a loading shell. Its opened integration documentation and App Store description did not establish that potential agent surface's capabilities. Therefore neither the listing's advertised functionality nor any read/write/phone/auth behavior is treated as verified here. Future's documented Assistant Coach AI assists its coaches; Ladder's checked page describes expert human coaching; JuggernautAI describes adaptive programming; Nike's developer listing describes workouts/programs. None of those facts by itself establishes an external agent or an athlete-facing AI chatbot. [FB1], [FB2], [FB3], [FB4], [F1], [F2], [L1], [J1], [N1]

## What nobody ships

This heading names **gaps in the checked public specifications**, not a provable market-wide absence. In particular, “nobody lets an agent place exercises, move workout dates, or conduct intake” would be an incorrect conclusion: Hevy saves exercise routines, Tally edits dated workouts, Athos conducts saved onboarding and replans training, and SmartGym provides Siri workout creation and set logging. [H2], [T1], [A1], [SG1]

- **No documented complete tryout-prep flow matching this brief.** The checked agent specifications do not describe one athlete workflow that combines sport, training years/days, a 14–17 age group and weeks until season; computes a GPP category, skill level and GPP/SPP/SSP phase; and maintains the resulting calendar and scheduled-day set log. Their documented objects are routines, planned workout days, a general personalized program, or fitness/nutrition analytics. This is a specification gap, not evidence that a general-purpose assistant could never propose such a plan. [H2], [C2], [T1], [A1], [SP1], [SG1]
- **No verified coverage of that entire minor age group through the closest writable surfaces.** Athos publishes adult-only eligibility; Sport MCP requires 16+ and its Gemini route requires 18+; Peloton and Strava in Gemini require 18+. Tally's under-13 exclusion and Caliber's 13+ policy do not document a special 14–17 training/agent-permission workflow, and Caliber cannot write the program. [A3], [SP4], [SP1], [G1], [T4], [C1], [C3]
- **No established native iOS-and-Android equivalent of the complete flow above.** Hevy and Caliber do document mobile chat, so phone access itself is not an empty market. The closest detailed calendar/write references here include iPhone Tally and Sport MCP, iPhone-beta Athos, and Apple-specific SmartGym; Workout Chat and Gym Plus explicitly remain browser products. A custom ChatGPT MCP setup page or delivery to a phone does not establish operation inside a mobile chat app. [H3], [C1], [T2], [T3], [SP1], [A2], [SG1], [WC2], [GP1]
- **The app keeping the training record is already shipped.** Tally versions calendar/history writes, Sport MCP stores the scheduled workout and lifting record, Hevy saves routines back into its app, and Athos requires canonical program readback after queued edits. The unverified part is the brief's specific intake-to-phase-to-tryout program and youth/mobile coverage, not the general idea of an external conversation changing app-owned training data. [T1], [SP1], [H2], [A1]
- **Roster administration is a different comparison.** Trainerize's real MCP writes are coach-scoped; TrainHeroic and TrueCoach's cited automation docs concern coach/business events. They do not establish that an athlete can authorize their own assistant to fill intake and change their own computed tryout program. [TR1], [TR3], [TH2], [TC1]

## Sources

- [H1] — Hevy: official MCP overview and supported assistants.
- [H2] — Hevy: MCP tool inventory and preview/direct-save rules; opened successfully by direct HTTP fetch.
- [H3] — Hevy: current ChatGPT app, phone instructions and retirement of HevyGPT.
- [C1] — Caliber: official MCP product page, mobile support and read-only boundary.
- [C2] — Caliber: MCP instructions, OAuth and tool inventory; internally inconsistent subscription wording.
- [C3] — Caliber: privacy policy, health data and age statement.
- [ST1] — Strava: official AI-assistant connection help, supported clients and read-only boundary.
- [M1] — MyFitnessPal-issued January 7, 2026 product release, hosted by GlobeNewswire; primary company statement, not a news report.
- [M2] — MyFitnessPal: in-app Nutrition Coach capabilities and limitations.
- [M3] — MyFitnessPal companion company blog; HTTP 403 when opened, not used as capability evidence.
- [TR1] — Trainerize: FitMetrics feature page, external-agent actions and write controls.
- [TR2] — Trainerize: November 9, 2026 release announcement.
- [TR3] — Trainerize: FitMetrics FAQ, connection entry point and coach/client distinction.
- [TH1] — TrainHeroic: supported integrations.
- [TH2] — TrainHeroic: its Zapier integration and trigger list.
- [TB1] — TeamBuildr: integration documentation index checked.
- [F1] — Future: Assistant Coach AI announcement.
- [F2] — Future: current product page checked.
- [FB1] — Fitbod: integration documentation checked.
- [FB2] — Fitbod named ChatGPT directory URL; opened only a loading shell.
- [FB3] — Fitbod ChatGPT directory identifier; opened only a loading shell.
- [FB4] — Fitbod: developer-written App Store description checked.
- [S1] — Strong: product page naming Siri Shortcuts.
- [S2] — Strong: App Store listing explicitly identifying Siri support.
- [L1] — Ladder: product/coaching page checked.
- [J1] — JuggernautAI: product/adaptive-programming page checked.
- [TC1] — TrueCoach: first-party Zapier integration help.
- [TC2] — TrueCoach: product/features page checked.
- [W1] — WHOOP: first-party WHOOP Coach announcement identifying its in-app location.
- [N1] — Nike Training Club: developer-written App Store description checked.
- [T1] — Tally: MCP builder reference, tool scopes and write protection.
- [T2] — Tally: Claude connection and phone support.
- [T3] — Tally: ChatGPT connection, plan restrictions and phone limitation.
- [T4] — Tally: privacy policy; opened successfully by direct HTTP fetch.
- [A1] — Athos: production connection guide and tool descriptions.
- [A2] — Athos: product page and iPhone TestFlight beta status.
- [A3] — Athos: privacy policy; opened successfully by direct HTTP fetch.
- [A4] — Athos: published terms, including template caveat and 18+ wording.
- [SP1] — Sport MCP: product/connection guide, phone use and confirmation behavior.
- [SP2] — Sport MCP: publisher's connector repository and OAuth specification.
- [SP3] — Sport MCP: privacy policy; opened successfully by direct HTTP fetch.
- [SP4] — Sport MCP: terms and 16+ requirement; opened successfully by direct HTTP fetch.
- [SG1] — SmartGym: version 8 release, Siri/App Intents and in-app AI distinctions.
- [SG2] — SmartGym: version 7.5 release, Siri/Shortcuts and trainer context.
- [SL1] — StrongLifts: Siri workout-start instructions.
- [GS1] — Gentler Streak: developer-written App Store description and version history, including Siri/App Intents release notes; full text also opened by direct HTTP fetch.
- [G1] — Google: Gemini connected-app availability table, including Peloton and Strava.
- [G2] — Google: official connected-app launch announcement naming Peloton.
- [G3] — Google: connected-app management instructions.
- [WI1] — Withings: official connector guide, tools, write controls, privacy and mobile limits.
- [WI2] — Withings: support documentation for its official connector.
- [V1] — Vis Fitness: MCP Alpha announcement and present limits.
- [V2] — Vis Fitness: privacy policy.
- [WC1] — Workout Chat: official MCP/API documentation.
- [WC2] — Workout Chat: client/account behavior and explicit web-app/mobile-web description.
- [GP1] — Gym Plus: detailed tool/connection guide; opened successfully by direct HTTP fetch.
- [GP2] — Gym Plus: publisher's repository; broader logging claim conflicts with detailed guide.
- [AD1] — athletedata: publisher's MCP repository, supported-source and write claims.
- [AD2] — athletedata: ChatGPT setup and phone limitation.
- [AD3] — athletedata: Claude setup and permission guidance.

[H1]: https://www.hevyapp.com/hevy-mcp/
[H2]: https://mcp.hevy.com/docs
[H3]: https://www.hevyapp.com/features/hevy-chatgpt/
[C1]: https://caliberstrong.com/mcp/
[C2]: https://caliberstrong.freshdesk.com/support/solutions/articles/48001282391-mcp-server-instructions
[C3]: https://caliberstrong.com/privacy-policy/
[ST1]: https://support.strava.com/en-us/articles/15401531-how-do-i-connect-strava-to-an-ai-assistant
[M1]: https://www.globenewswire.com/news-release/2026/01/07/3214864/0/en/MyFitnessPal-Launches-App-in-New-ChatGPT-Health-Experience.html
[M2]: https://support.myfitnesspal.com/hc/en-us/articles/45212266254221-Introducing-Nutrition-Coach-Your-Nutrition-Assistant
[M3]: https://blog.myfitnesspal.com/myfitnesspal-chatgpt-your-nutrition-questions-answered-in-seconds/
[TR1]: https://www.trainerize.com/features/fitmetrics/
[TR2]: https://www.trainerize.com/blog/new-abc-trainerize-updates-coach-more-flexibly-stay-connected-and-get-more-done-with-ai-tools-you-already-use/
[TR3]: https://help.trainerize.com/hc/en-us/articles/53936407675796-FitMetrics-FAQ
[TH1]: https://support.trainheroic.com/hc/en-us/articles/18156689314701-Does-TrainHeroic-support-integrations-with-other-apps
[TH2]: https://support.trainheroic.com/hc/en-us/articles/18156590611341-TrainHeroic-s-Zapier-Integration
[TB1]: https://support.teambuildr.com/category/f9x82p5l42-integrations
[F1]: https://future.co/blog/meet-assistant-coach-ai-the-state-of-the-art-in-ai-coaching--cpbangxjl
[F2]: https://future.co/
[FB1]: https://help.fitbod.me/hc/en-us/sections/35305345636375-Integrations
[FB2]: https://chatgpt.com/plugins/fitbod
[FB3]: https://chatgpt.com/plugins/plugin_asdk_app_695c64b1d0f08191a1b440a5329b8b95
[FB4]: https://apps.apple.com/us/app/fitbod-gym-fitness-planner/id1041517543
[S1]: https://www.strong.app/
[S2]: https://apps.apple.com/us/app/strong-workout-tracker-gym-log/id464254577
[L1]: https://www.joinladder.com/
[J1]: https://www.juggernautai.app/
[TC1]: https://help.truecoach.co/en/articles/8688374-zapier-integration
[TC2]: https://truecoach.co/
[W1]: https://www.whoop.com/us/en/press-center/whoop-unveils-the-new-whoop-coach-powered-by-openai/
[N1]: https://apps.apple.com/us/app/nike-training-club/id301521403
[T1]: https://tallyworkout.app/connect/mcp
[T2]: https://tallyworkout.app/connect/claude
[T3]: https://tallyworkout.app/connect/chatgpt
[T4]: https://tallyworkout.app/privacy
[A1]: https://www.athos.fitness/connect
[A2]: https://www.athos.fitness/
[A3]: https://www.athos.fitness/privacy
[A4]: https://www.athos.fitness/terms
[SP1]: https://sport-mcp.com/
[SP2]: https://github.com/davidvi/sport-mcp-connector
[SP3]: https://sport-mcp.com/privacy
[SP4]: https://sport-mcp.com/terms
[SG1]: https://smartgymapp.com/releases/smartgym-8
[SG2]: https://smartgymapp.com/releases/smartgym-7-5
[SL1]: https://support.stronglifts.com/article/199-siri-start-workout
[GS1]: https://apps.apple.com/us/app/gentler-streak-workout-tracker/id1576857102
[G1]: https://support.google.com/gemini/table/17434654?hl=en
[G2]: https://blog.google/innovation-and-ai/products/gemini-app/new-connected-apps-gemini/
[G3]: https://support.google.com/gemini/answer/13695044
[WI1]: https://static.withings.com/content/v2/app/mcp/en/index.html
[WI2]: https://support.withings.com/hc/en-us/articles/51863118412049-Withings-Withings-AI-Connector-Apps
[V1]: https://vis.fitness/blog/vis-pro-mcp-alpha
[V2]: https://vis.fitness/privacy
[WC1]: https://workout.chat/api_docs
[WC2]: https://workout.chat/features/works-everywhere
[GP1]: https://gym.plus/use-with-claude
[GP2]: https://github.com/gym-plus/mcp
[AD1]: https://github.com/athletedata-health/mcp
[AD2]: https://www.athletedata.health/mcp/setup/chatgpt
[AD3]: https://www.athletedata.health/mcp/setup/claude-desktop
