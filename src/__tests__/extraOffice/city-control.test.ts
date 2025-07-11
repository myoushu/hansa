import { describe, it, expect, beforeEach } from 'vitest'
import { GameState } from '../../game/model'
import { cityOwner } from '../../game/helpers'
import { 
  createTestGameState, 
  createCityControlScenario
} from '../../test/utils'

describe('Extra Office City Control Logic', () => {
  let state: GameState

  beforeEach(() => {
    state = createTestGameState()
  })

  describe('Office priority hierarchy', () => {
    it('should prioritize regular offices over left offices', () => {
      const cityName = 'Hamburg'
      
      // Player 0 has left offices, Player 1 has regular office
      state = createCityControlScenario(cityName, {
        player0Left: 3,
        player1Regular: 1
      })
      
      const controller = cityOwner(state, cityName)
      
      expect(controller).toBe(1) // Player 1 should control with regular office
    })

    it('should prioritize extra offices over left offices', () => {
      const cityName = 'Hamburg'
      
      // Player 0 has left offices, Player 1 has extra office
      state = createCityControlScenario(cityName, {
        player0Left: 3,
        player1Extra: 1
      })
      
      const controller = cityOwner(state, cityName)
      
      expect(controller).toBe(1) // Player 1 should control with extra office
    })

    it('should treat regular and extra offices equally for control', () => {
      const cityName = 'Hamburg'
      
      // Player 0 has regular office, Player 1 has extra office
      state = createCityControlScenario(cityName, {
        player0Regular: 1,
        player1Extra: 1
      })
      
      const controller = cityOwner(state, cityName)
      
      // Should be tied, with player 1 winning (last to reach the count wins ties)
      expect(controller).toBe(1)
    })
  })

  describe('Left office tiebreaking', () => {
    it('should use left offices to break ties when no regular/extra offices exist', () => {
      const cityName = 'Hamburg'
      
      // Only left offices
      state = createCityControlScenario(cityName, {
        player0Left: 1,
        player1Left: 2
      })
      
      const controller = cityOwner(state, cityName)
      
      expect(controller).toBe(1) // Player 1 has more left offices
    })

    it('should not use left offices to break ties when regular/extra offices exist', () => {
      const cityName = 'Hamburg'
      
      // Tied in regular offices, but Player 1 has more left offices
      state = createCityControlScenario(cityName, {
        player0Regular: 1,
        player0Left: 1,
        player1Regular: 1,
        player1Left: 3
      })
      
      const controller = cityOwner(state, cityName)
      
      // Should still be Player 0 (first to reach the regular office count)
      // Left offices don't break ties when regular offices exist
      expect(controller).toBe(0)
    })

    it('should count left offices when players have zero regular/extra offices', () => {
      const cityName = 'Hamburg'
      
      // Player 0 has no offices, Player 1 has only left offices
      state = createCityControlScenario(cityName, {
        player1Left: 2
      })
      
      const controller = cityOwner(state, cityName)
      
      expect(controller).toBe(1)
    })
  })

  describe('Complex scenarios', () => {
    it('should handle mixed office types correctly', () => {
      const cityName = 'Hamburg'
      
      // Complex scenario with all office types
      state = createCityControlScenario(cityName, {
        player0Regular: 1,
        player0Extra: 1,
        player0Left: 2,
        player1Regular: 2,
        player1Left: 1,
        player2Extra: 1,
        player2Left: 3
      })
      
      const controller = cityOwner(state, cityName)
      
      // Player 0: 2 priority offices (1 regular + 1 extra)
      // Player 1: 2 priority offices (2 regular)
      // Player 2: 1 priority office (1 extra)
      // Tie between Player 0 and 1, Player 0 should win (first to reach count)
      expect(controller).toBe(0)
    })

    it('should return -1 when no player has any offices', () => {
      const cityName = 'Hamburg'
      
      state = createCityControlScenario(cityName, {})
      
      const controller = cityOwner(state, cityName)
      
      expect(controller).toBe(-1)
    })

    it('should handle single left office scenario', () => {
      const cityName = 'Hamburg'
      
      // Only one left office in the city
      state = createCityControlScenario(cityName, {
        player1Left: 1
      })
      
      const controller = cityOwner(state, cityName)
      
      expect(controller).toBe(1)
    })

    it('should prioritize higher regular office count over left offices', () => {
      const cityName = 'Hamburg'
      
      // Player 0 has many left offices, Player 1 has more regular offices
      state = createCityControlScenario(cityName, {
        player0Regular: 1,
        player0Left: 5,
        player1Regular: 2
      })
      
      const controller = cityOwner(state, cityName)
      
      expect(controller).toBe(1) // Player 1 wins with more regular offices
    })
  })

  describe('Three-player scenarios', () => {
    it('should correctly identify winner in three-way competition', () => {
      const cityName = 'Hamburg'
      
      // Three players with different office compositions
      state = createCityControlScenario(cityName, {
        player0Regular: 1,
        player0Left: 2,
        player1Extra: 2,
        player2Regular: 1,
        player2Extra: 1
      })
      
      const controller = cityOwner(state, cityName)
      
      // Player 0: 1 priority office
      // Player 1: 2 priority offices
      // Player 2: 2 priority offices
      // Tie between Player 1 and 2, Player 1 should win (first to reach count)
      expect(controller).toBe(1)
    })

    it('should use left offices in three-way tie with zero priority offices', () => {
      const cityName = 'Hamburg'
      
      // All players have only left offices
      state = createCityControlScenario(cityName, {
        player0Left: 1,
        player1Left: 3,
        player2Left: 2
      })
      
      const controller = cityOwner(state, cityName)
      
      expect(controller).toBe(1) // Player 1 has most left offices
    })
  })
})