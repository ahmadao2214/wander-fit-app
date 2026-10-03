<!-- /founder:pricing-strategy · 2026-10-03 · input: First pass of pricing strategy for WanderFit, using the draft tiers in .cursor/plans/trial_user_launch_plan (Free / Athlete $9-15 / Trainer $29-49 / Team custom) -->

# WanderFit pricing strategy (first pass)

Assumption: a parent pays for most athletes, because two of the three age groups (10-13, 14-17) are minors.
Assumption: launch is iOS and Android through in-app purchase, enrolled in Apple's Small Business Program (15% fee).
Assumption: 2 developers on Convex Pro.
Assumption: the trainer program builder is not shipped (deferred in the trial launch plan).

## 1. Pricing model analysis

| Model | Fit score | Pros | Cons |
|-------|-----------|------|------|
| Flat subscription | 4 | Matches a 12-week cycle that repeats each season. Simple for parents. | Churn between seasons. |
| Usage-based | 1 | None. | Parents can't predict per-workout cost. Infra cost is near zero, so nothing to pass through. |
| Per-seat | 3 | Right model for the coach side (TrainHeroic, Trainerize, TeamBuildr all price by athlete count). | Wrong for a single family. |
| Freemium | 5 | Intake, onboarding and GPP are a complete taste of the product. The phase-complete celebration screen is a built-in upgrade moment. | Free users cost support time. |
| Credits | 1 | None. | Adds math to a product sold on simplicity. |
| One-time purchase | 2 | A season pass fits how parents think about preseason. | No recurring revenue. |

**Recommendation: freemium into a flat subscription**, because the free GPP phase proves the athlete will actually train, and the parent pays once they've seen 4 weeks of logged workouts. Per-seat pricing applies only to the coach tier.

## 2. Tier design

Your draft has 4 tiers (Free, Athlete, Trainer, Team). **Cut Team for now**, because there is no multi-trainer or bulk athlete product to sell, and a "Contact us" tier with nothing behind it costs credibility.

### Free: "Starter", $0
- Full intake (sport, age group, experience, training days, season timeline)
- Full GPP phase: 4 weeks at the athlete's skill level
- Workout execution with set logging and warmups
- 1RM tracking for the 3 core lifts (back squat, bench press, trap bar deadlift)
- Workout calendar with drag and swap
- Full history, never truncated. History is what makes the parent believe the kid is training, so don't gate it.

**Upgrade trigger:** GPP complete. Put the paywall on the existing celebration screen, "SPP is next", because motivation peaks right after a phase ends.

### Athlete: $14.99/mo, $34.99 per 12-week season, $99.99/yr (44% off monthly)
- Everything in Starter
- SPP and SSP phases: the full 12-week program
- Reassessment and skill level progression (Novice to Moderate to Advanced)
- A new 12-week cycle each season, timed to the athlete's season start date
- Intensity scaling from logged 1RMs
- 1 athlete per subscription

**Upgrade trigger:** the athlete gets a coach (school, club or private), and the coach wants to see their logs.

### Coach: $39/mo or $390/yr (17% off), up to 15 athletes
- Every rostered athlete gets Athlete tier free
- Client invitations and roster (already built)
- View each athlete's program, logs and 1RMs
- Analytics screen (already built)
- Each extra athlete above 15: $2/mo
- Sold by the founders, not self-serve, for the first 90 days, because the program builder isn't ready and each early coach needs a call to set up

**Upgrade trigger:** 15+ athletes, or a second coach on the same roster. That becomes the Team tier once it exists.

**Your draft prices:** the $9 end of the Athlete range is wrong. Volt charges individuals $19.99/mo for a comparable product, so $9 gives away about 40% of what parents already accept. $14.99 is the right number. Your $29-49 Trainer range is right; pick $39.

## 3. Competitive pricing context

All checked 2026-10-03.

| Competitor | Price | Included | WanderFit position |
|---|---|---|---|
| [Volt Individual](https://voltathletics.com/individuals) | $19.99/mo, $39.99/qtr, $129.99/yr | 40+ sports, 1,500+ videos, adaptive weights, coach chat | **Below** by 25%, because Volt has video and 40+ sports vs. our 4 categories and no videos. |
| [TrainHeroic Marketplace](https://marketplace.trainheroic.com/) | $27 to $49/mo per program | One coach's fixed program | **Well below**, because those are fixed programs, while WanderFit adapts to intake and reassessment. |
| [TrainHeroic Coach](https://www.trainheroic.com/pricing/) | $9.99/mo (1 athlete), $34.99/mo (15) | Program builder, video review, messaging | **Slightly above** at 15 athletes, because athletes get a complete periodized program, not an empty builder. |
| [Trainerize](https://www.quickcoach.fit/trainerize-pricing-2026.html) | Pro 15: $50/mo ($45 annual) | General personal training platform, add-ons extra | **Below**, because WanderFit is sport-specific with fewer features. |
| [TeamBuildr](https://www.teambuildr.com/pricing) | $90/mo or $900/yr for 50 athletes | School and team strength programs | **Don't compete yet.** This is the future Team tier. Volt's school plans start at [$900/yr for 30 athletes](https://voltathletics.com/high-school). |

## 4. Unit economics check

**Fixed costs per month**
- Convex Pro: $25 × 2 devs = $50 ([source](https://www.convex.dev/pricing))
- Apple Developer: $99/yr = $8.25
- Clerk: $0 up to 50,000 retained users ([source](https://clerk.com/pricing))
- RevenueCat: $0 up to $2,500 monthly tracked revenue, then 1% ([source](https://www.revenuecat.com/pricing/))
- **Total: about $58/mo**

**Variable cost per active user per month**
- Estimate: Convex usage. 13 workouts × 150 function calls + 30 app opens × 30 calls = about 2,850 calls. Convex Pro includes 25M calls, which covers about 8,700 active users before overage. Estimate: under $0.05/user.
- App store fee: 15% ([Small Business Program](https://adapty.io/blog/app-store-small-business-program/)). Estimate: Google Play's subscription fee is also 15%; confirm in Play Console.
- Estimate: support at 1 ticket per 10 users per month, 10 minutes each. Founder time, $0 cash today.
- Exercise videos aren't hosted yet (`videoUrl` is marked FUTURE in the schema). Redo this section when they ship, because video bandwidth will be the largest variable cost.

**Gross margin by tier** (store fee + 1% RevenueCat + $0.05 infra)

| Tier | Monthly revenue | Costs | Net | Gross margin |
|---|---|---|---|---|
| Starter | $0 | $0.05 | -$0.05 | n/a |
| Athlete monthly | $14.99 | $2.25 + $0.15 + $0.05 | $12.54 | 84% |
| Athlete season | $11.66 | $1.75 + $0.12 + $0.05 | $9.74 | 84% |
| Athlete annual | $8.33 | $1.25 + $0.08 + $0.05 | $6.95 | 83% |
| Coach (Stripe, 15 athletes) | $39.00 | $1.43 Stripe + $0.80 infra | $36.77 | 94% |

**Break-even**
- Cash costs ($58/mo): 5 Athlete monthly subscribers, or 9 annual, or 2 coaches.
- A milestone that matters more, $5,000 MRR: about 470 paying athletes at blended ARPU, or 136 coaches.

**Target blended ARPU:** Estimate: mix of 50% annual, 30% season, 20% monthly gives 0.5 × $8.33 + 0.3 × $11.66 + 0.2 × $14.99 = **$10.66 per paying athlete per month**. Replace with real mix after 100 subscribers.

## 5. Pricing psychology

1. **Anchoring:** on the paywall, show Annual first as "$8.33/mo", with Monthly at $14.99 beside it. For parents, add one line: "Less than one private training session per year". Estimate: private sessions run $50 to $100; [confirm with 3 local trainers' rates before using this line].
2. **Decoy:** the $34.99 season pass is priced close to 3 months of monthly ($44.97) so that annual looks like a clear win: "4 seasons of training for the price of under 3". Some will buy it anyway, at 84% margin.
3. **Annual framing:** "$99.99 a year covers off-season, preseason and in-season blocks. Save 44%." Tie the year to the athlete's own season timeline from intake, because that date is already in the app and makes the plan feel personal.

## 6. Launch pricing vs. scale pricing

**Launch price (first 90 days):**
- **Founding Athlete:** $9.99/mo or $69.99/yr for the first 100 paying athletes, locked while subscribed. Because launch has 4 sport categories and no videos, and you need 100 families' retention data and testimonials more than $5 a month. Set this up as separate store products in RevenueCat, not an introductory offer, because Apple intro offers expire after the first period.
- **Basketball trial athlete:** free through her first full 12-week cycle in exchange for weekly feedback and permission to quote her and her parent. [Quote from the trial athlete's parent about the first 12 weeks]
- **Founding Coach:** first 10 coaches free for 60 days, then $29/mo locked.

**Grandfathering:** founding prices hold as long as the subscription is unbroken. A lapse over 30 days returns them to the current price. Regular subscribers keep their old price for 6 months after an increase, with 30 days' notice, because Apple requires subscriber consent for most price increases anyway.

**Raise prices when all of these hold:**
1. Paywall view to paid conversion is 10% or higher at $14.99 over at least 300 paywall views (an internal threshold, not an industry benchmark).
2. 40% or more of paid athletes start a second 12-week cycle.
3. Exercise videos are live for every exercise in the program templates.
4. Fewer than 20% of exit-survey answers from users who saw the paywall and didn't buy cite price.

The next scale price is **$19.99/mo, $129.99/yr**, matching Volt, because at that point the product matches Volt on video and beats it on periodization.
