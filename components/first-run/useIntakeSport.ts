import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { useFirstRunDraft } from '../../hooks/useFirstRunDraft'
import { storyCategory, tintedGround, type StoryCategory } from '../../lib/firstRunStory'

/**
 * The picked sport and its category, for screens that theme the world by it.
 * `ground` is the tinted game-night background once a sport is known.
 */
export function useIntakeSport(): {
  sport: { _id: string; name: string; gppCategoryId: number } | undefined
  category: StoryCategory | null
  ground: string
} {
  const { draft } = useFirstRunDraft()
  const sports = useQuery(api.sports.list)
  const sport = sports?.find((s) => s._id === draft?.answers.sportId)
  const category = sport ? storyCategory(sport.gppCategoryId) : null
  return { sport, category, ground: tintedGround(category?.color) }
}
