<!-- /founder:competitor-matrix · 2026-10-03 · input: Wander-Fit, offseason and preseason training for high school sport coaches without S&C staff -->
# Competitor matrix

Shared doc with the full research: https://claude.ai/code/artifact/1383f640-dc59-42d3-a506-add9590f623a

**Volt is the high threat: it already does Wander-Fit's core loop at high school prices and ships app updates every few days. The opening is narrow: day-1 readiness testing plus a per-player preseason ramp, for one sport.**

- Assumption: the target is high school girls' soccer coaches with no strength coach.
- Assumption: the Wander-Fit column reflects the code on branch `ccr-15f761ec-403o94` on 2026-10-03, not a roadmap.

## Market landscape

Prices checked 2026-10-03 on the linked pages. "Not found" means no opened page confirmed it.

| Competitor | Founded | Funding stage | Pricing | Segment | Key differentiator |
| --- | --- | --- | --- | --- | --- |
| [Volt Athletics](https://voltathletics.com/high-school) | Not found | Venture-backed; amounts not found. Acquired ZAMA Health Apr 2024 ([Volt blog](https://blog.voltathletics.com/home/2024/4/9/volt-athletics-elevates-ai-powered-athlete-development-platform-with-acquisition-of-zama-health)) | $900/yr (30 athletes), $1,400/yr (100); consumer $129.99/yr | HS and college teams, consumers | AI builds and adapts a full year from season dates |
| [TeamBuildr](https://www.teambuildr.com/pricing) | 2012 ([SaaS Club](https://saasclub.io/podcast/vertical-saas-hewitt-tomlin-teambuildr/)) | Bootstrapped; $10M ARR, 45 employees, about half of customers are high schools ([SaaS Club](https://saasclub.io/podcast/vertical-saas-hewitt-tomlin-teambuildr/)) | $90/mo (50) to $280/mo (1,000) | HS, college, pro S&C coaches | Same price for NFL and HS; coach-built programs |
| [TrainHeroic](https://www.trainheroic.com/pricing/) | Not found | Acquired by Garmin with TrainingPeaks, 2026-07-22 ([Bicycle Retailer](https://www.bicycleretailer.com/industry-news/2026/07/22/garmin-acquires-trainingpeaks-trainheroic-platforms)) | $9.99/mo (1) to $399.99/mo (1,000) | Independent performance coaches | Program marketplace plus coach dashboard |
| [Fit For 90](https://www.fitfor90.com/partner/hs) | Not found | Not found | HS: $300 course + $100/season monitoring | Soccer, HS to pro | Soccer periodization; session RPE load and readiness |
| [Techne Futbol](https://www.technefutbol.com/group-pricing) | Not found | Not found | $1,250/yr school, $1,500/yr team | Soccer players, teams, schools | Weekly skill drills; coach sees who trains |
| [BridgeAthletic](https://www.bridgeathletic.com/youth-organizations) | Not found | Not found (sources conflict) | HS tiers by quote | HS departments, college, trainers | Templates, AI import and build, screening |
| [Peak Strength](https://apps.apple.com/us/app/peak-strength/id1632549195) | Not found | Not found | $39.99/mo; $299 or $399.99/yr | Individual athletes | Human-written plans to a "Peak Date" |

## Feature matrix

| Feature | Volt | TeamBuildr | TrainHeroic | Fit For 90 | Techne | Bridge | Peak Strength | Wander-Fit |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Program auto-built from sport + season dates | Yes | No | No | Partial | No | Partial | Yes | Built |
| 1RM-based load scaling | Yes | Partial | Unknown | Unknown | No | Unknown | Partial | Built |
| Training age separate from age | Unknown | Unknown | Unknown | Unknown | Unknown | Unknown | Partial | Built |
| Team dashboard for one coach | Yes | Yes | Yes | Yes | Yes | Yes | No | Partial |
| Completion visible to coach | Yes | Yes | Yes | Unknown | Yes | Partial | No | Partial |
| Session RPE x minutes load | Partial | Unknown | Unknown | Yes | Unknown | Partial | Partial | Partial |
| Acute:chronic load flags | Unknown | Unknown | Unknown | Unknown | Unknown | Unknown | No | Planned |
| Readiness check-in | Yes | Unknown | Unknown | Yes | Unknown | Yes | Unknown | No |
| Day-1 fitness test with standards | Unknown | Unknown | Unknown | Unknown | Unknown | Partial | Partial | Partial |
| Soccer-specific content | Partial | No | No | Yes | Yes | Unknown | No | Partial |
| Shared tablet mode | Yes | Unknown | Unknown | Unknown | Unknown | Yes | No | No |

Wander-Fit, from the repo: intake asks sport, experience years, maxes and season timeline. Sets log RPE and sessions log duration, not yet combined into load. Trainer analytics screen says "Coming soon." Reassessment re-tests maxes.

## Positioning gaps

1. **Day-1 readiness test that sets each player's 3-week ramp.** Missing: no tool found that turns a preseason field test into a per-player plan; coaches use a stopwatch and a PDF ([example](https://libertygirlssoccer.com/wp-content/uploads/2015/03/2015SummerFitness.pdf)). Why it matters: college preseason practice injury rates are 2.9x in-season ([Hootman 2007](https://pmc.ncbi.nlm.nih.gov/articles/PMC1941297/)), and testing at tryouts is allowed where offseason tracking isn't. Difficulty: low to medium. Head start: Estimate 3 to 6 months, because Volt has season dates and readiness surveys and ships weekly.
2. **Preseason load ramp a sport coach can read in 10 seconds.** Missing: Fit For 90 measures session RPE load but is bundled with a $300 course and its iOS app was last updated 2019-01-23 ([App Store](https://apps.apple.com/us/app/fit-for-90/id1215367316)). Why it matters: weeks 1 to 3 are when undertrained players get hurt. Difficulty: medium; evidence for ACWR is disputed ([Impellizzeri 2020](https://europepmc.org/article/MED/32502973)). Head start: Estimate 6 to 12 months against Fit For 90, 3 to 6 against Volt.

## Threat assessment

| Rank | Competitor | Threat | Resources | Overlap | Release speed |
| --- | --- | --- | --- | --- | --- |
| 1 | Volt | High | 15,000+ teams, 2M+ people trained ([press](https://voltathletics.com/press/)) | Highest: same loop and HS buyer | v24.7.0 two days before 2026-10-03; weekly or faster ([App Store](https://apps.apple.com/us/app/volt-gym-home-workout-plans/id1189345596)) |
| 2 | TeamBuildr | Medium | $10M ARR, 45 staff, bootstrapped | Medium: owns HS weight rooms, no auto-programming | Every 1 to 3 weeks ([App Store](https://apps.apple.com/us/app/teambuildr-training/id1588729407)) |
| 3 | Fit For 90 | Medium (soccer) | Not found | High in soccer: RPE load, readiness, summer app | iOS last updated 2019-01-23 |

TrainHeroic now has Garmin's resources but sells to independent coaches. Techne (last iOS update 2024-07-11) and Peak Strength (2024-09-03) move slowly.

## Strategic recommendations

- **Position to own:** preseason readiness for high school girls' soccer teams with no strength coach.
- **Feature to ship first:** a day-1 field test that puts each player in a readiness tier and auto-assigns a 3-week ramp, on one coach screen.
- **Competitor to watch:** Volt. If it adds a preseason test module, gap 1 closes.
