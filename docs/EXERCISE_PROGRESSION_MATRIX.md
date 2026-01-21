# Exercise Progression Matrix by Movement Pattern

This document provides the complete exercise library with progression chains for every movement pattern used in the training system.

**Format:** `Easier → Base → Harder`

**Legend:**
- ✅ = Exists in current seedData.ts
- 🆕 = New exercise to create
- ⚠️ = Exists but needs progression link added

---

## 1. UPPER BODY PUSH - VERTICAL

Overhead pressing movements targeting shoulders and triceps.

### Exercise 1: Overhead Press Progression
| Level | Exercise | Slug | Equipment | Tags |
|-------|----------|------|-----------|------|
| Easier | ✅ Pike Push-Up | `pike_pushup` | bodyweight | upper_body, push, shoulder, bodyweight |
| Base | ✅ Dumbbell Shoulder Press | `db_shoulder_press` | dumbbell | upper_body, push, vertical, strength, shoulder |
| Harder | ✅ Overhead Press (Barbell) | `overhead_press` | barbell, dumbbell | upper_body, push, vertical, strength, shoulder |

**Progression Links to Add:**
```typescript
pike_pushup: { harder: "db_shoulder_press" }
db_shoulder_press: { easier: "pike_pushup", harder: "overhead_press" }
overhead_press: { easier: "db_shoulder_press" }
```

### Exercise 2: Push-Up to Overhead Progression
| Level | Exercise | Slug | Equipment | Tags |
|-------|----------|------|-----------|------|
| Easier | 🆕 Wall Push-Up | `wall_push_up` | bodyweight, wall | upper_body, push, bodyweight, vertical |
| Base | ✅ Pike Push-Up | `pike_pushup` | bodyweight | upper_body, push, shoulder, bodyweight |
| Harder | 🆕 Handstand Push-Up (Wall) | `wall_handstand_push_up` | bodyweight, wall | upper_body, push, vertical, shoulder, advanced, bodyweight |

### Exercise 3: Landmine/Angled Press Progression
| Level | Exercise | Slug | Equipment | Tags |
|-------|----------|------|-----------|------|
| Easier | 🆕 Half-Kneeling Single Arm Press | `half_kneeling_press` | dumbbell | upper_body, push, vertical, unilateral, stability |
| Base | 🆕 Standing Landmine Press | `landmine_press` | barbell | upper_body, push, vertical, unilateral, shoulder |
| Harder | 🆕 Push Press | `push_press` | barbell, dumbbell | upper_body, push, vertical, power, explosive, shoulder |

---

## 2. UPPER BODY PUSH - HORIZONTAL

Chest pressing and push-up movements.

### Exercise 1: Push-Up Progression (Bodyweight)
| Level | Exercise | Slug | Equipment | Tags |
|-------|----------|------|-----------|------|
| Easier | ✅ Incline Push-Up | `incline_push_up` | bodyweight, bench | upper_body, push, horizontal, strength, chest, bodyweight |
| Base | ✅ Push-Up | `push_up` | bodyweight | upper_body, push, horizontal, strength, chest, bodyweight |
| Harder | ✅ Decline Push-Up | `decline_push_up` | bodyweight, bench | upper_body, push, horizontal, strength, chest, bodyweight |

*Already properly linked ✅*

### Exercise 2: Explosive Push Progression
| Level | Exercise | Slug | Equipment | Tags |
|-------|----------|------|-----------|------|
| Easier | ✅ Push-Up | `push_up` | bodyweight | upper_body, push, horizontal, strength, chest, bodyweight |
| Base | ✅ Explosive Push-Up | `explosive_pushup` | bodyweight | upper_body, power, push, explosive, chest, plyometric |
| Harder | ✅ Plyometric Push-Up | `plyo_push_up` | bodyweight | upper_body, push, plyometric, power, explosive, chest |

**Progression Links to Add:**
```typescript
push_up: { ..., harder: "explosive_pushup" } // Add to existing
explosive_pushup: { easier: "push_up", harder: "plyo_push_up" }
plyo_push_up: { easier: "explosive_pushup" }
```

### Exercise 3: Bench Press Progression (Weighted)
| Level | Exercise | Slug | Equipment | Tags |
|-------|----------|------|-----------|------|
| Easier | ✅ Dumbbell Bench Press | `db_bench_press` | dumbbell, bench | upper_body, push, horizontal, strength, chest, bilateral |
| Base | ✅ Bench Press | `bench_press` | barbell, bench, rack | upper_body, push, horizontal, strength, chest, bilateral, compound |
| Harder | 🆕 Close-Grip Bench Press | `close_grip_bench_press` | barbell, bench, rack | upper_body, push, horizontal, strength, chest, compound |

*db_bench_press → bench_press already linked ✅*

### Exercise 4: Incline Press Progression
| Level | Exercise | Slug | Equipment | Tags |
|-------|----------|------|-----------|------|
| Easier | ✅ Incline Push-Up | `incline_push_up` | bodyweight, bench | upper_body, push, incline, strength, chest, bodyweight |
| Base | ✅ Incline Dumbbell Press | `incline_db_press` | dumbbell, incline_bench | upper_body, push, incline, strength, chest |
| Harder | 🆕 Incline Barbell Press | `incline_bench_press` | barbell, incline_bench, rack | upper_body, push, incline, strength, chest, compound |

---

## 3. UPPER BODY PULL - VERTICAL

Pull-up and lat pulldown movements.

### Exercise 1: Pull-Up Progression
| Level | Exercise | Slug | Equipment | Tags |
|-------|----------|------|-----------|------|
| Easier | ✅ Assisted Pull-Up | `assisted_pull_up` | pull_up_bar, band | upper_body, pull, vertical, strength, back |
| Base | ✅ Pull-Up | `pull_up` | pull_up_bar | upper_body, pull, vertical, strength, back, bodyweight |
| Harder | ✅ Weighted Pull-Up | `weighted_pull_up` | pull_up_bar, dumbbell | upper_body, pull, vertical, strength, back |

*Already properly linked ✅*

### Exercise 2: Lat Pulldown Progression
| Level | Exercise | Slug | Equipment | Tags |
|-------|----------|------|-----------|------|
| Easier | 🆕 Straight Arm Pulldown | `straight_arm_pulldown` | cable_machine | upper_body, pull, vertical, back, isolation |
| Base | ✅ Lat Pulldown | `lat_pulldown` | cable_machine | upper_body, pull, vertical, strength, back |
| Harder | 🆕 Close-Grip Lat Pulldown | `close_grip_lat_pulldown` | cable_machine | upper_body, pull, vertical, strength, back |

**Progression Links to Add:**
```typescript
lat_pulldown: { easier: "straight_arm_pulldown", harder: "close_grip_lat_pulldown" }
// Also add bodyweight alternative:
lat_pulldown: { easier: "assisted_pull_up" } // For equipment-free regression
```

### Exercise 3: Bodyweight Vertical Pull Progression
| Level | Exercise | Slug | Equipment | Tags |
|-------|----------|------|-----------|------|
| Easier | 🆕 Scapular Pull-Up | `scapular_pull_up` | pull_up_bar | upper_body, pull, vertical, stability, back, bodyweight |
| Base | 🆕 Negative Pull-Up | `negative_pull_up` | pull_up_bar | upper_body, pull, vertical, strength, back, bodyweight |
| Harder | ✅ Pull-Up | `pull_up` | pull_up_bar | upper_body, pull, vertical, strength, back, bodyweight |

---

## 4. UPPER BODY PULL - HORIZONTAL

Row movements targeting back and biceps.

### Exercise 1: Row Progression (Dumbbell)
| Level | Exercise | Slug | Equipment | Tags |
|-------|----------|------|-----------|------|
| Easier | 🆕 Chest-Supported Row | `chest_supported_row` | dumbbell, incline_bench | upper_body, pull, horizontal, back, bilateral |
| Base | ✅ Dumbbell Row | `db_row` | dumbbell, bench | upper_body, pull, horizontal, strength, back, unilateral |
| Harder | 🆕 Kroc Row | `kroc_row` | dumbbell, bench | upper_body, pull, horizontal, strength, back, unilateral, power |

### Exercise 2: Bodyweight Row Progression
| Level | Exercise | Slug | Equipment | Tags |
|-------|----------|------|-----------|------|
| Easier | 🆕 Elevated Inverted Row | `elevated_inverted_row` | barbell, rack | upper_body, pull, horizontal, back, bodyweight |
| Base | ✅ Inverted Row | `inverted_row` | barbell, rack, rings | upper_body, pull, horizontal, strength, back, bodyweight |
| Harder | 🆕 Feet-Elevated Inverted Row | `feet_elevated_inverted_row` | barbell, rack, box | upper_body, pull, horizontal, strength, back, bodyweight |

**Progression Links to Add:**
```typescript
inverted_row: { easier: "elevated_inverted_row", harder: "feet_elevated_inverted_row" }
```

### Exercise 3: Cable Row Progression
| Level | Exercise | Slug | Equipment | Tags |
|-------|----------|------|-----------|------|
| Easier | ✅ Face Pull | `face_pull` | cable_machine, band | upper_body, pull, horizontal, shoulder_health, rear_delt |
| Base | 🆕 Seated Cable Row | `cable_row` | cable_machine | upper_body, pull, horizontal, strength, back |
| Harder | 🆕 Single Arm Cable Row | `single_arm_cable_row` | cable_machine | upper_body, pull, horizontal, strength, back, unilateral, anti_rotation |

### Exercise 4: Band/TRX Row Progression (Equipment-Flexible)
| Level | Exercise | Slug | Equipment | Tags |
|-------|----------|------|-----------|------|
| Easier | 🆕 Band Row | `band_row` | band | upper_body, pull, horizontal, back, bodyweight |
| Base | ✅ TRX Row | `trx_row` | trx | upper_body, pull, back, horizontal |
| Harder | 🆕 Single Arm TRX Row | `single_arm_trx_row` | trx | upper_body, pull, horizontal, back, unilateral, anti_rotation |

---

## 5. LOWER BODY PUSH (Squat Patterns)

Knee-dominant movements targeting quads and glutes.

### Exercise 1: Bilateral Squat Progression
| Level | Exercise | Slug | Equipment | Tags |
|-------|----------|------|-----------|------|
| Easier | ✅ Goblet Squat | `goblet_squat` | dumbbell, kettlebell | lower_body, squat, bilateral, strength, quad_dominant |
| Base | ✅ Back Squat | `back_squat` | barbell, rack | lower_body, squat, bilateral, strength, compound |
| Harder | ✅ Front Squat | `front_squat` | barbell, rack | lower_body, squat, bilateral, strength, quad_dominant |

**Progression Links to Add:**
```typescript
goblet_squat: { harder: "back_squat" }
back_squat: { easier: "goblet_squat", harder: "front_squat" }
front_squat: { easier: "back_squat" }
```

### Exercise 2: Bodyweight Squat Progression
| Level | Exercise | Slug | Equipment | Tags |
|-------|----------|------|-----------|------|
| Easier | ✅ Assisted Squat | `assisted_squat` | bodyweight | lower_body, squat, bilateral, mobility, bodyweight |
| Base | ✅ Bodyweight Squat | `bodyweight_squat` | bodyweight | lower_body, squat, bilateral, strength, bodyweight |
| Harder | ✅ Jump Squat | `jump_squat` | bodyweight | lower_body, squat, bilateral, plyometric, power, explosive |

*Already properly linked ✅*

### Exercise 3: Unilateral Squat Progression
| Level | Exercise | Slug | Equipment | Tags |
|-------|----------|------|-----------|------|
| Easier | ✅ Single Leg Squat to Box | `single_leg_squat_box` | box, bench | lower_body, squat, unilateral, strength, single_leg, balance |
| Base | ✅ Bulgarian Split Squat | `bulgarian_split_squat` | dumbbell, bench | lower_body, squat, unilateral, strength, single_leg |
| Harder | 🆕 Pistol Squat | `pistol_squat` | bodyweight | lower_body, squat, unilateral, strength, single_leg, balance, advanced, bodyweight |

**Progression Links to Add:**
```typescript
single_leg_squat_box: { harder: "bulgarian_split_squat" }
bulgarian_split_squat: { easier: "single_leg_squat_box", harder: "pistol_squat" }
pistol_squat: { easier: "bulgarian_split_squat" }
```

---

## 6. LOWER BODY PULL/HINGE

Hip-dominant movements targeting hamstrings, glutes, and posterior chain.

### Exercise 1: Bilateral Hinge Progression
| Level | Exercise | Slug | Equipment | Tags |
|-------|----------|------|-----------|------|
| Easier | ✅ Romanian Deadlift | `romanian_deadlift` | barbell, dumbbell | lower_body, hinge, bilateral, strength, hamstring, posterior_chain |
| Base | ✅ Trap Bar Deadlift | `trap_bar_deadlift` | trap_bar | lower_body, hinge, bilateral, strength, compound, power |
| Harder | 🆕 Conventional Deadlift | `conventional_deadlift` | barbell | lower_body, hinge, bilateral, strength, compound, posterior_chain |

**Progression Links to Add:**
```typescript
romanian_deadlift: { harder: "trap_bar_deadlift" }
trap_bar_deadlift: { easier: "romanian_deadlift", harder: "conventional_deadlift" }
conventional_deadlift: { easier: "trap_bar_deadlift" }
```

### Exercise 2: Unilateral Hinge Progression
| Level | Exercise | Slug | Equipment | Tags |
|-------|----------|------|-----------|------|
| Easier | 🆕 Kickstand RDL | `kickstand_rdl` | dumbbell, kettlebell | lower_body, hinge, unilateral, strength, hamstring, balance |
| Base | ✅ Single Leg RDL | `single_leg_rdl` | dumbbell, kettlebell | lower_body, hinge, unilateral, strength, balance, hamstring |
| Harder | 🆕 Single Leg Deadlift | `single_leg_deadlift` | barbell, dumbbell | lower_body, hinge, unilateral, strength, balance, hamstring, advanced |

**Progression Links to Add:**
```typescript
single_leg_rdl: { easier: "kickstand_rdl", harder: "single_leg_deadlift" }
```

### Exercise 3: Glute-Dominant Hinge Progression
| Level | Exercise | Slug | Equipment | Tags |
|-------|----------|------|-----------|------|
| Easier | ✅ Glute Bridge | `glute_bridge` | bodyweight | lower_body, hinge, bilateral, glute, strength |
| Base | ✅ Hip Thrust | `hip_thrust` | barbell, bench | lower_body, hinge, bilateral, strength, glute |
| Harder | 🆕 Single Leg Hip Thrust | `single_leg_hip_thrust` | barbell, bench | lower_body, hinge, unilateral, strength, glute |

**Progression Links to Add:**
```typescript
glute_bridge: { harder: "hip_thrust" }
hip_thrust: { easier: "glute_bridge", harder: "single_leg_hip_thrust" }
```

### Exercise 4: Bodyweight Hinge Progression
| Level | Exercise | Slug | Equipment | Tags |
|-------|----------|------|-----------|------|
| Easier | ✅ Glute Bridge | `glute_bridge` | bodyweight | lower_body, hinge, bilateral, glute, strength |
| Base | 🆕 Single Leg Glute Bridge | `single_leg_glute_bridge` | bodyweight | lower_body, hinge, unilateral, glute, strength, bodyweight |
| Harder | 🆕 Nordic Curl (Eccentric) | `nordic_curl` | bodyweight | lower_body, hinge, bilateral, hamstring, strength, advanced, bodyweight |

---

## 7. ROTATION

Rotational power and mobility movements.

### Exercise 1: Medicine Ball Rotation Progression
| Level | Exercise | Slug | Equipment | Tags |
|-------|----------|------|-----------|------|
| Easier | 🆕 Kneeling Med Ball Rotation | `kneeling_med_ball_rotation` | medicine_ball | core, rotation, power, mobility |
| Base | ✅ Medicine Ball Rotational Throw | `med_ball_rotational_throw` | medicine_ball, wall | core, power, rotation, explosive |
| Harder | 🆕 Rotational Med Ball Slam | `rotational_med_ball_slam` | medicine_ball | core, power, rotation, explosive, full_body |

### Exercise 2: Cable/Band Rotation Progression
| Level | Exercise | Slug | Equipment | Tags |
|-------|----------|------|-----------|------|
| Easier | ✅ Band Woodchop | `band_woodchop` | band | core, rotation, functional, power |
| Base | ✅ Cable Woodchop | `cable_woodchop` | cable_machine | core, rotation, power, functional |
| Harder | 🆕 Low-to-High Cable Woodchop | `low_high_woodchop` | cable_machine | core, rotation, power, functional, explosive |

**Progression Links to Add:**
```typescript
band_woodchop: { harder: "cable_woodchop" }
cable_woodchop: { easier: "band_woodchop", harder: "low_high_woodchop" }
```

### Exercise 3: Bodyweight Rotation Progression
| Level | Exercise | Slug | Equipment | Tags |
|-------|----------|------|-----------|------|
| Easier | ✅ Thoracic Rotation | `thoracic_rotation` | bodyweight | mobility, thoracic, rotation, warmup |
| Base | 🆕 Standing Rotation Reach | `standing_rotation_reach` | bodyweight | core, rotation, mobility, warmup |
| Harder | ✅ World's Greatest Stretch | `worlds_greatest_stretch` | bodyweight | mobility, warmup, hip, thoracic, dynamic |

---

## 8. ABDOMINAL / ANTI-ROTATION CORE

Stability-focused core movements that resist movement.

### Exercise 1: Anti-Extension (Plank) Progression
| Level | Exercise | Slug | Equipment | Tags |
|-------|----------|------|-----------|------|
| Easier | ✅ Knee Plank | `knee_plank` | bodyweight | core, anti_extension, stability, isometric |
| Base | ✅ Plank | `plank` | bodyweight | core, anti_extension, stability, isometric |
| Harder | ✅ Plank with Shoulder Taps | `plank_shoulder_taps` | bodyweight | core, anti_extension, anti_rotation, stability, dynamic |

*Already properly linked ✅*

### Exercise 2: Anti-Rotation Progression
| Level | Exercise | Slug | Equipment | Tags |
|-------|----------|------|-----------|------|
| Easier | ✅ Dead Bug | `dead_bug` | bodyweight | core, anti_extension, stability, coordination, warmup |
| Base | ✅ Pallof Press | `pallof_press` | cable_machine, band | core, anti_rotation, stability |
| Harder | 🆕 Pallof Press with March | `pallof_press_march` | cable_machine, band | core, anti_rotation, stability, dynamic |

**Progression Links to Add:**
```typescript
dead_bug: { harder: "pallof_press" }
pallof_press: { easier: "dead_bug", harder: "pallof_press_march" }
```

### Exercise 3: Anti-Lateral Flexion (Side Plank) Progression
| Level | Exercise | Slug | Equipment | Tags |
|-------|----------|------|-----------|------|
| Easier | 🆕 Knee Side Plank | `knee_side_plank` | bodyweight | core, anti_lateral_flexion, stability, isometric |
| Base | ✅ Side Plank | `side_plank` | bodyweight | core, anti_lateral_flexion, stability, isometric |
| Harder | 🆕 Side Plank with Hip Dip | `side_plank_hip_dip` | bodyweight | core, anti_lateral_flexion, stability, dynamic |

**Progression Links to Add:**
```typescript
side_plank: { easier: "knee_side_plank", harder: "side_plank_hip_dip" }
```

### Exercise 4: Dynamic Core Progression
| Level | Exercise | Slug | Equipment | Tags |
|-------|----------|------|-----------|------|
| Easier | ✅ Bird Dog | `bird_dog` | bodyweight | core, anti_rotation, stability, coordination, warmup |
| Base | 🆕 Bird Dog with Band | `bird_dog_band` | band | core, anti_rotation, stability, coordination |
| Harder | ✅ Single Arm Plank | `single_arm_plank` | bodyweight | core, anti_rotation, stability, isometric |

**Progression Links to Add:**
```typescript
bird_dog: { harder: "bird_dog_band" }
bird_dog_band: { easier: "bird_dog", harder: "single_arm_plank" }
```

### Exercise 5: Flexion Core Progression
| Level | Exercise | Slug | Equipment | Tags |
|-------|----------|------|-----------|------|
| Easier | 🆕 Lying Leg Raise | `lying_leg_raise` | bodyweight | core, strength, hip_flexor, anti_extension |
| Base | ✅ Hanging Leg Raise | `hanging_leg_raise` | pull_up_bar | core, anti_extension, strength, hip_flexor |
| Harder | 🆕 Toes to Bar | `toes_to_bar` | pull_up_bar | core, strength, hip_flexor, advanced |

**Progression Links to Add:**
```typescript
lying_leg_raise: { harder: "hanging_leg_raise" }
hanging_leg_raise: { easier: "lying_leg_raise", harder: "toes_to_bar" }
```

---

## 9. LUNGE

Single-leg step patterns in multiple directions.

### Exercise 1: Sagittal Plane Lunge Progression
| Level | Exercise | Slug | Equipment | Tags |
|-------|----------|------|-----------|------|
| Easier | ✅ Reverse Lunge | `reverse_lunge` | dumbbell, bodyweight | lower_body, lunge, unilateral, strength, single_leg |
| Base | ✅ Walking Lunge | `walking_lunge` | dumbbell, bodyweight | lower_body, lunge, unilateral, strength, conditioning |
| Harder | 🆕 Deficit Reverse Lunge | `deficit_reverse_lunge` | dumbbell, plyo_box | lower_body, lunge, unilateral, strength, single_leg |

*reverse_lunge → walking_lunge already linked ✅*

**Progression Links to Add:**
```typescript
walking_lunge: { ..., harder: "deficit_reverse_lunge" }
```

### Exercise 2: Frontal Plane Lunge Progression
| Level | Exercise | Slug | Equipment | Tags |
|-------|----------|------|-----------|------|
| Easier | 🆕 Lateral Step-Up | `lateral_step_up` | box, dumbbell | lower_body, lunge, unilateral, frontal, strength |
| Base | ✅ Lateral Lunge | `lateral_lunge` | dumbbell, bodyweight | lower_body, lunge, unilateral, mobility, frontal |
| Harder | 🆕 Cossack Squat | `cossack_squat` | bodyweight, dumbbell | lower_body, lunge, unilateral, frontal, mobility, strength |

**Progression Links to Add:**
```typescript
lateral_lunge: { easier: "lateral_step_up", harder: "cossack_squat" }
```

### Exercise 3: Explosive Lunge Progression
| Level | Exercise | Slug | Equipment | Tags |
|-------|----------|------|-----------|------|
| Easier | ✅ Reverse Lunge | `reverse_lunge` | bodyweight | lower_body, lunge, unilateral, strength, single_leg |
| Base | 🆕 Split Squat Jump | `split_squat_jump` | bodyweight | lower_body, lunge, unilateral, plyometric, power, explosive |
| Harder | 🆕 Alternating Lunge Jump | `alternating_lunge_jump` | bodyweight | lower_body, lunge, unilateral, plyometric, power, explosive |

### Exercise 4: Step-Up Progression
| Level | Exercise | Slug | Equipment | Tags |
|-------|----------|------|-----------|------|
| Easier | 🆕 Low Box Step-Up | `low_box_step_up` | box | lower_body, lunge, unilateral, strength, single_leg |
| Base | 🆕 Step-Up | `step_up` | box, dumbbell | lower_body, lunge, unilateral, strength, single_leg |
| Harder | 🆕 Lateral Box Step-Up | `lateral_box_step_up` | box, dumbbell | lower_body, lunge, unilateral, frontal, strength |

---

## 10. JUMP (Plyometrics)

Explosive power movements.

### Exercise 1: Vertical Jump Progression
| Level | Exercise | Slug | Equipment | Tags |
|-------|----------|------|-----------|------|
| Easier | ✅ Jump Squat | `jump_squat` | bodyweight | lower_body, squat, bilateral, plyometric, power, explosive |
| Base | ✅ Box Jump | `box_jump` | plyo_box | lower_body, plyometric, power, explosive |
| Harder | ✅ Depth Jump | `depth_jump` | plyo_box | lower_body, plyometric, power, reactive |

**Progression Links to Add:**
```typescript
jump_squat: { harder: "box_jump" }
box_jump: { easier: "jump_squat", harder: "depth_jump" }
depth_jump: { easier: "box_jump" }
```

### Exercise 2: Horizontal Jump Progression
| Level | Exercise | Slug | Equipment | Tags |
|-------|----------|------|-----------|------|
| Easier | 🆕 Standing Long Jump | `standing_long_jump` | bodyweight | lower_body, plyometric, horizontal, power |
| Base | ✅ Broad Jump | `broad_jump` | bodyweight | lower_body, plyometric, power, horizontal, explosive |
| Harder | 🆕 Consecutive Broad Jumps | `consecutive_broad_jumps` | bodyweight | lower_body, plyometric, power, horizontal, explosive, reactive |

**Progression Links to Add:**
```typescript
broad_jump: { easier: "standing_long_jump", harder: "consecutive_broad_jumps" }
```

### Exercise 3: Lateral Jump Progression
| Level | Exercise | Slug | Equipment | Tags |
|-------|----------|------|-----------|------|
| Easier | ✅ Skater Jump | `skater_jump` | bodyweight | lower_body, plyometric, power, frontal, single_leg |
| Base | ✅ Skater Hops | `skater_hops` | bodyweight | lower_body, plyometric, explosive, frontal, conditioning, agility |
| Harder | 🆕 Lateral Bounding | `lateral_bounding` | bodyweight | lower_body, plyometric, power, frontal, single_leg, reactive |

**Progression Links to Add:**
```typescript
skater_jump: { harder: "skater_hops" }
skater_hops: { easier: "skater_jump", harder: "lateral_bounding" }
```

### Exercise 4: Reactive Jump Progression
| Level | Exercise | Slug | Equipment | Tags |
|-------|----------|------|-----------|------|
| Easier | ✅ Box Jump | `box_jump` | plyo_box | lower_body, plyometric, power, explosive |
| Base | 🆕 Drop Jump | `drop_jump` | plyo_box | lower_body, plyometric, reactive, power |
| Harder | ✅ Depth Jump | `depth_jump` | plyo_box | lower_body, plyometric, power, reactive |

---

## 11. CARRY

Loaded locomotion for core stability, grip, and full-body conditioning.

### Exercise 1: Bilateral Carry Progression
| Level | Exercise | Slug | Equipment | Tags |
|-------|----------|------|-----------|------|
| Easier | 🆕 Goblet Carry | `goblet_carry` | dumbbell, kettlebell | full_body, carry, core, stability |
| Base | 🆕 Farmer's Carry | `farmers_carry` | dumbbell, kettlebell, trap_bar | full_body, carry, grip_endurance, core, conditioning |
| Harder | 🆕 Trap Bar Carry | `trap_bar_carry` | trap_bar | full_body, carry, grip_endurance, strength, conditioning |

### Exercise 2: Unilateral Carry Progression
| Level | Exercise | Slug | Equipment | Tags |
|-------|----------|------|-----------|------|
| Easier | 🆕 Suitcase Carry | `suitcase_carry` | dumbbell, kettlebell | full_body, carry, anti_lateral_flexion, core, unilateral |
| Base | 🆕 Single Arm Overhead Carry | `single_arm_overhead_carry` | dumbbell, kettlebell | full_body, carry, shoulder, stability, unilateral |
| Harder | 🆕 Waiter Carry | `waiter_carry` | dumbbell, kettlebell | full_body, carry, shoulder, stability, unilateral, balance |

### Exercise 3: Overhead Carry Progression
| Level | Exercise | Slug | Equipment | Tags |
|-------|----------|------|-----------|------|
| Easier | 🆕 Single Arm Overhead Carry | `single_arm_overhead_carry` | dumbbell, kettlebell | full_body, carry, shoulder, stability, unilateral |
| Base | 🆕 Double Overhead Carry | `double_overhead_carry` | dumbbell, kettlebell | full_body, carry, shoulder, stability, bilateral |
| Harder | 🆕 Overhead Plate Carry | `overhead_plate_carry` | barbell | full_body, carry, shoulder, core, stability |

### Exercise 4: Front-Loaded Carry Progression
| Level | Exercise | Slug | Equipment | Tags |
|-------|----------|------|-----------|------|
| Easier | 🆕 Goblet Carry | `goblet_carry` | dumbbell, kettlebell | full_body, carry, core, stability |
| Base | 🆕 Front Rack Carry | `front_rack_carry` | kettlebell, dumbbell | full_body, carry, core, anti_extension |
| Harder | 🆕 Zercher Carry | `zercher_carry` | barbell | full_body, carry, core, anti_extension, strength |

---

## Summary: New Exercises Required

### High Priority (Core Progressions & Common Movements)

| Exercise | Slug | Movement Pattern |
|----------|------|------------------|
| Single Leg Glute Bridge | `single_leg_glute_bridge` | Hinge |
| Lying Leg Raise | `lying_leg_raise` | Core |
| Knee Side Plank | `knee_side_plank` | Core |
| Side Plank Hip Dip | `side_plank_hip_dip` | Core |
| Pallof Press March | `pallof_press_march` | Core |
| Step-Up | `step_up` | Lunge |
| Farmer's Carry | `farmers_carry` | Carry |
| Suitcase Carry | `suitcase_carry` | Carry |

### Medium Priority (Progressions & Variants)

| Exercise | Slug | Movement Pattern |
|----------|------|------------------|
| Pistol Squat | `pistol_squat` | Lower Push |
| Conventional Deadlift | `conventional_deadlift` | Hinge |
| Nordic Curl | `nordic_curl` | Hinge |
| Kickstand RDL | `kickstand_rdl` | Hinge |
| Split Squat Jump | `split_squat_jump` | Lunge |
| Cossack Squat | `cossack_squat` | Lunge |
| Drop Jump | `drop_jump` | Jump |
| Lateral Bounding | `lateral_bounding` | Jump |

### Lower Priority (Equipment-Specific)

| Exercise | Slug | Movement Pattern |
|----------|------|------------------|
| Push Press | `push_press` | Vertical Push |
| Landmine Press | `landmine_press` | Vertical Push |
| Cable Row | `cable_row` | Horizontal Pull |
| Front Rack Carry | `front_rack_carry` | Carry |
| Zercher Carry | `zercher_carry` | Carry |

---

## Total Count by Movement Pattern

| Pattern | Existing | New Required | Total |
|---------|----------|--------------|-------|
| Upper Push - Vertical | 3 | 5 | 8 |
| Upper Push - Horizontal | 8 | 2 | 10 |
| Upper Pull - Vertical | 5 | 4 | 9 |
| Upper Pull - Horizontal | 7 | 7 | 14 |
| Lower Push (Squat) | 8 | 1 | 9 |
| Lower Pull/Hinge | 7 | 5 | 12 |
| Rotation | 5 | 4 | 9 |
| Core/Anti-Rotation | 12 | 6 | 18 |
| Lunge | 5 | 7 | 12 |
| Jump | 7 | 4 | 11 |
| Carry | 0 | 10 | 10 |
| **TOTAL** | **67** | **55** | **122** |

---

## Next Steps

1. Review this document for exercise selection accuracy
2. Prioritize which new exercises to add first
3. Update existing exercises with progression links
4. Add new exercises to seedData.ts
5. Update category-specific pools in generateTemplates.ts
