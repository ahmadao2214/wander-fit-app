# Wander-Fit Design System Reference

## Color Usage Guidelines

### Stat Numbers
All numeric statistics use a consistent color scheme:
- **`$primary` (Electric Blue)** - All stat numbers (days completed, streak, exercises tried, training days, years experience)
- **`$color11` (Neutral)** - Non-numeric values like dates

### Intensity Colors (Traffic Light System)
Used exclusively for workout intensity indicators:
- **`$intensityLow6` (Green)** - Low intensity workouts
- **`$intensityMed6` (Amber/Orange)** - Moderate intensity workouts
- **`$intensityHigh6` (Red)** - High intensity workouts

Background variants: `$intensityLow2`, `$intensityMed2`, `$intensityHigh2`

**Important:** Never use `$accent` (flame orange) for stats as it collides with the amber intensity color.

### Phase Icons
Each training phase has a consistent icon:
- **GPP (General Physical Preparedness):** `Target` icon - building foundation
- **SPP (Sport Physical Preparedness):** `Flame` icon - intensity/sport-specific
- **SSP (Sport Specific Preparedness):** `Trophy` icon - peak performance

### Brand Colors
- **`$primary`** - Electric blue, main action color
- **`$accent`** - Flame orange, reserved for intensity badges and special callouts (e.g., skill level badge)
- **`$brand1`** - Light blue background for featured cards (e.g., profile header, workout card)
- **`$brand2`** - Slightly darker blue for primary feature icon backgrounds (e.g., Training Science)
- **`$color4`** - Neutral gray for secondary/settings icon backgrounds (e.g., App Settings)

### Surface Colors
- **`$background`** - Main app background
- **`$surface`** - Card backgrounds
- **`$surfaceHover`** - Card hover/press state
- **`$borderColor`** - Card borders

### Text Colors
- **`$color12`** - Primary text (headings, important content)
- **`$color11`** - Secondary text (body content)
- **`$color10`** - Tertiary text (labels, captions)
- **`$color9`** - Muted icons

## Component Patterns

### Stat Cards (Numbers-Only Pattern)
Simple stat cards without icon backgrounds for clean, scannable layouts:
```tsx
<Card flex={1} minWidth={100} p="$4" bg="$surface" rounded="$4" borderWidth={1} borderColor="$borderColor">
  <YStack items="center" gap="$1">
    <StatNumber color="$primary">{value}</StatNumber>
    <Text fontSize={11} color="$color10" text="center" fontFamily="$body" fontWeight="500">
      Label{'\n'}Text
    </Text>
  </YStack>
</Card>
```

### Info Rows (Icon + Text Pattern)
For displaying labeled information with icons:
```tsx
<XStack items="center" gap="$3">
  <IconComponent size={20} color="$color9" />
  <YStack flex={1}>
    <Text fontSize={12} color="$color10" fontFamily="$body">Label</Text>
    <Text fontSize={15} fontFamily="$body" fontWeight="600" color="$color12">{value}</Text>
  </YStack>
</XStack>
```

### Intensity Badge
```tsx
<Card bg={intensityBgColor} px="$3" py="$1" rounded="$10">
  <XStack items="center" gap="$1">
    {isHigh ? <Flame size={12} color={intensityColor} /> : <Zap size={12} color={intensityColor} />}
    <Text fontSize="$2" color={intensityColor} fontWeight="600">{label}</Text>
  </XStack>
</Card>
```

### Actionable Card (Navigation Pattern)
For tappable cards that navigate to other screens:
```tsx
<Card
  p="$4"
  bg="$surface"
  rounded="$4"
  borderWidth={1}
  borderColor="$borderColor"
  pressStyle={{ bg: '$surfaceHover' }}
  onPress={() => router.push('/destination')}
>
  <XStack items="center" gap="$3">
    <YStack bg="$brand2" p="$2" rounded="$10">
      <IconComponent size={18} color="$primary" />
    </YStack>
    <YStack flex={1}>
      <Text fontSize={15} fontFamily="$body" fontWeight="500" color="$color12">
        Title
      </Text>
      <Text fontSize={12} fontFamily="$body" color="$color10">
        Subtitle
      </Text>
    </YStack>
    <ChevronRight size={20} color="$color9" />
  </XStack>
</Card>
```

### Status Indicator Cards (My Maxes Pattern)
For items with completion state:
- **Completed:** Icon background `$green3`, icon color `$green10`, Check icon
- **Incomplete:** Icon background `$color4`, icon color `$color9`, relevant icon (e.g., Dumbbell)

## Typography

### Fonts
- **`$heading`** - Bebas Neue, used for display headings
- **`$body`** - Plus Jakarta Sans, used for all body text

### Heading Styles
- **DisplayHeading:** 24-32px, Bebas Neue, `$color12`
- **SectionLabel:** 11px, uppercase, letter-spacing 1.5, `$color10`
- **StatNumber:** 24-28px, bold, `$primary`

## Hierarchy Guidelines

### Profile Screen Order
1. Profile Header (user info)
2. Progress Stats (achievements/wins)
3. Training Info (current state)
4. My Maxes (1RM data)
5. Assessment (intake data)
6. Learn (Training Science)
7. Settings
8. Sign Out

### Today Screen Order
1. Header (greeting)
2. Active Session Alert (if applicable)
3. Today's Workout Card
4. Your Progress stats
