# Wander-Fit: market research handoff

Paste this whole file into Grok (or attach it) as the first message. Attach `competitor-matrix.md` and the Markdown export of the "Wander-Fit Market Research" doc for the full tables and every source link.

## Instructions for the assistant picking this up

You are continuing market research for two co-founders deciding whether to keep building Wander-Fit. The research below was done Oct 3, 2026, from pages that were actually opened. Keep these rules:

- Put a source link next to every new fact. Mark anything you could not open yourself as "unverified".
- Items marked "unverified" below are still unverified. Don't upgrade them without a source.
- Don't redo the competitor survey from scratch. Extend it or correct it with sources.
- The founders have zero users. Prefer cheap tests with real coaches over more desk research.

## The company

- **Product:** Wander-Fit, an iOS app (Expo/React Native, Convex backend). An athlete picks a sport and enters experience and weeks until the season. The app generates a periodized offseason program in three phases (general prep, specific prep, sport-specific prep), with 1RM-based intensity scaling, a calendar and workout logging.
- **Already in the code:** intake for sport, age group, experience years, maxes, season timeline and training days. Per-set RPE and session duration are stored but not combined into a workload number. Reassessment re-tests maxes. Trainer-client links exist; trainer analytics is "Coming soon."
- **Team:** one engineer and one certified personal trainer. Seven months of building. Zero real users.
- **Original hypothesis:** coaches hand out offseason programs and learn in weeks 1 to 3 of preseason who skipped, through soft-tissue injuries and poor conditioning. Likely buyer: a high school, club, or D2/D3 coach with no strength and conditioning staff.
- **A Northwestern athletic trainer told them:** athletes get 4 separate sheets; adherence is low even at the pro level; completion checkboxes can't verify the work; RPE x minutes gives an acute:chronic workload ratio, healthy at 0.8 to 1.3; training age should be separate from age.

## Verdict so far

**Crowded, not an open gap (about 70% confidence).** For school teams, "catch who skipped the offseason" also runs into rules.

1. **The product already exists.** Volt sells to high school sport coaches with no strength staff. Coaches "plug in season dates to build a full year of periodized training in seconds," with AI adjustment and completion tracking, for $900/yr (30 athletes) ([Volt](https://voltathletics.com/sport-coaches/)).
2. **Rules limit offseason tracking.**
   - NCAA Division III: voluntary summer workouts must have "no reporting back to coaching staff" and "no recording attendance" ([NCAA](https://ncaaorg.s3.amazonaws.com/compliance/rrs/2020/presentations/Division_III/Division_III_Bylaw_17.pdf)).
   - Delaware: coaches may not "directly or indirectly require" out-of-season participation ([DE code](https://archive.regulations.delaware.gov/AdminCode/title14/1000/1040.pdf)).
   - Texas: summer attendance is voluntary and can't be required to try out ([UIL](https://www.uiltexas.org/athletics/summer-strength-conditioning)).
3. **The pain is real but measured mostly in college.** College preseason practice injury rate is 6.6 per 1,000 athlete-exposures vs 2.3 in-season ([Hootman 2007](https://pmc.ncbi.nlm.nih.gov/articles/PMC1941297/)). No high-school-specific preseason rate was found.
4. **The high school gap has only one hard number.** In one Southwestern state, 62.9% of HS weight rooms had no dedicated strength coach ([Judge 2024](https://europepmc.org/article/MED/39446733)). The common "10 to 15% of high schools have one" figure has no source.
5. **The acute:chronic workload ratio (ACWR) is disputed.** 0.85 to 1.35 was protective in elite rugby ([Hulin 2016](https://europepmc.org/article/MED/26511006)), but a 2020 review found "no evidence supporting the use of ACWR" in load management ([Impellizzeri 2020](https://europepmc.org/article/MED/32502973)).

## Competitors that matter most

| Competitor | Why it matters | Source |
| --- | --- | --- |
| Volt | High threat. Same core loop, same HS buyer; 15,000+ teams; app updates weekly or faster | [high school](https://voltathletics.com/high-school), [press](https://voltathletics.com/press/) |
| TeamBuildr | Bootstrapped, $10M ARR, 45 staff, about half of customers are high schools; coach builds programs, $90 to $280/mo | [SaaS Club](https://saasclub.io/podcast/vertical-saas-hewitt-tomlin-teambuildr/), [pricing](https://www.teambuildr.com/pricing) |
| Fit For 90 | Soccer only. Session RPE load, readiness, summer app; HS: $300 course + $100/season. iOS app last updated Jan 2019 | [HS partner](https://www.fitfor90.com/partner/hs), [App Store](https://apps.apple.com/us/app/fit-for-90/id1215367316) |
| TrainHeroic | Acquired by Garmin with TrainingPeaks on Jul 22, 2026; sells to independent coaches | [Bicycle Retailer](https://www.bicycleretailer.com/industry-news/2026/07/22/garmin-acquires-trainingpeaks-trainheroic-platforms) |
| Techne Futbol | Soccer drills; coach sees who trains; $1,250 to $1,500/yr | [pricing](https://www.technefutbol.com/group-pricing) |
| Peak Strength | Consumer; human-written plans to a "Peak Date"; $299/yr | [App Store](https://apps.apple.com/us/app/peak-strength/id1632549195) |

**Graveyard pattern:** small tools absorbed by platforms (Kinduct to Teamworks, Hudl Technique to OnForm, Krossover to Hudl, PUSH to WHOOP, Sparta Science to Oura, MOJO to TeamSnap). No public post-mortem of an offseason-compliance startup was found.

## Recommended wedge (not yet tested)

**Segment:** head coaches of high school girls' soccer teams with no strength coach.

**Promise:** "Know on day 1 who is ready. Every undertrained player gets an individual 3-week ramp."

This moves from policing the offseason to measuring and managing preseason. Preseason isn't offseason, so the voluntary-workout rules shouldn't apply. That is a reading to confirm with state associations.

**Price hypothesis:** about $300 per team per season. **Backup segment:** HS girls' volleyball.

The 3 riskiest assumptions:

1. HS coaches lose enough players in preseason weeks 1 to 3 to care. Test: 15 coach interviews.
2. Someone pays ~$300 when Volt, Fit For 90 and Techne exist. Test: paid pre-orders or booster-club purchase orders.
3. A day-1 test plus daily RPE flags at-risk players, and coaches will log it. Test: pilot with 3 to 5 teams; RPE entered for 80%+ of sessions in under 5 coach-minutes/day.

## Still unverified or open

- **Unverified:**
  - WHOOP's 2021 purchase of PUSH
  - Starting Strength app retirement (Dec 31, 2025)
  - Athos shutdown (June 2023)
  - A D2 "no reporting back" rule
  - NCAA football preseason days 1 to 5 injury figures
- **Not found:** funding amounts for Volt, Fit For 90, Techne, BridgeAthletic and Peak Strength. No national figure on how often preseason fitness tests decide roster spots. No survey on how HS coaches choose software.
- **Not researched:** rules for club (non-school) teams.
- **Reddit:** blocked during research. Coach sentiment there is unread.

## Good next tasks

1. Draft a 15-question interview script for HS girls' soccer coaches, aimed at assumption 1.
2. Check whether 3 to 5 large states' associations (for example CIF, UIL, OHSAA, FHSAA, GHSA) restrict preseason testing or app-based load tracking. Link the rule text.
3. Find any HS-level preseason injury data (High School RIO, NATA, state AT surveys) that splits weeks 1 to 3.
4. Read r/footballstrategy and r/soccercoaching threads on summer workouts and preseason fitness tests. Quote and link them.
