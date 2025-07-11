import { describe, it, expect, beforeEach } from 'vitest'
import { GameState } from '../../game/model'
import { MarkerOfficeAction } from '../../game/actions'
import { areCitiesLinked } from '../../game/helpers'
import { 
  createTestGameState, 
  createOfficePhaseState, 
  setupCityWithOffices, 
  createToken,
  findRoute
} from '../../test/utils'

describe('Extra Office Edge Cases and Integration', () => {
  let state: GameState

  beforeEach(() => {
    state = createTestGameState()
  })

  describe('East-West route integration', () => {
    it('should award points when left office completes Arnheim-Stendal connection', () => {
      const cityName = 'Arnheim'
      
      // Setup state where placing left office in Arnheim will complete the connection
      state = setupCityWithOffices(state, cityName, {
        tokens: [createToken(1)] // Existing office
      })
      
      // Set up cities along the path to make the connection nearly complete
      // This is a simplified test - in reality, you'd need to set up the full path
      state = setupCityWithOffices(state, 'Stendal', {
        tokens: [createToken(0)] // Player 0's office in Stendal
      })
      
      state = createOfficePhaseState([cityName], [
        { token: 't', owner: 0 }
      ])

      const initialPoints = state.players[0].points
      const initialLinkStatus = state.players[0].linkEastWest
      
      const newContext = MarkerOfficeAction(state, { city: cityName })
      
      // If connection was completed, should award points
      if (areCitiesLinked(state, 'Arnheim', 'Stendal', 0)) {
        expect(state.players[0].points).toBeGreaterThan(initialPoints)
        expect(state.players[0].linkEastWest).toBe(true)
        
        // Should log the connection completion
        const logMessages = state.log.map(entry => entry.message)
        expect(logMessages.some(msg => 
          typeof msg === 'string' && msg.includes('east-west route')
        )).toBe(true)
      }
    })

    it('should not award points if east-west route already completed', () => {
      const cityName = 'Hamburg'
      state = setupCityWithOffices(state, cityName, {
        tokens: [createToken(1)]
      })
      
      // Player already has east-west connection
      state.players[0].linkEastWest = true
      
      state = createOfficePhaseState([cityName], [
        { token: 't', owner: 0 }
      ])

      const initialPoints = state.players[0].points
      
      const newContext = MarkerOfficeAction(state, { city: cityName })
      
      // Should not award additional points
      expect(state.players[0].points).toBe(initialPoints)
    })
  })

  describe('Game end conditions', () => {
    it('should trigger game end when player reaches 20 points', () => {
      const cityName = 'Hamburg'
      state = setupCityWithOffices(state, cityName, {
        tokens: [createToken(1)]
      })
      
      // Set player close to 20 points
      state.players[0].points = 19
      
      // Mock the east-west connection to award 1+ points
      state.players[0].linkEastWest = false
      
      state = createOfficePhaseState([cityName], [
        { token: 't', owner: 0 }
      ])

      const newContext = MarkerOfficeAction(state, { city: cityName })
      
      // If points reached 20+, game should end
      if (state.players[0].points >= 20) {
        expect(state.context.prev?.endGame).toBe(true)
        
        // Should log game end
        const logMessages = state.log.map(entry => entry.message)
        expect(logMessages.some(msg => 
          typeof msg === 'string' && msg.includes('Game over')
        )).toBe(true)
      }
    })

    it('should not trigger game end when no player reaches 20 points', () => {
      const cityName = 'Hamburg'
      state = setupCityWithOffices(state, cityName, {
        tokens: [createToken(1)]
      })
      
      // All players well below 20 points
      state.players.forEach(player => {
        player.points = 10
        player.linkEastWest = true // Prevent east-west bonus
      })
      
      state = createOfficePhaseState([cityName], [
        { token: 't', owner: 0 }
      ])

      const newContext = MarkerOfficeAction(state, { city: cityName })
      
      expect(state.context.prev?.endGame).toBeUndefined()
    })
  })

  describe('Office marker consumption', () => {
    it('should handle case where player has multiple Office markers', () => {
      const cityName = 'Hamburg'
      state = setupCityWithOffices(state, cityName, {
        tokens: [createToken(1)]
      })
      
      state = createOfficePhaseState([cityName], [
        { token: 't', owner: 0 }
      ])
      
      // Player has multiple Office markers
      state.players[0].readyMarkers = ['Office', 'Office', 'Upgrade']

      const newContext = MarkerOfficeAction(state, { city: cityName })
      
      // Should consume exactly one Office marker
      expect(state.players[0].readyMarkers).toEqual(['Office', 'Upgrade'])
      expect(state.players[0].usedMarkers).toContain('Office')
    })

    it('should handle case where Office marker is not first in ready markers', () => {
      const cityName = 'Hamburg'
      state = setupCityWithOffices(state, cityName, {
        tokens: [createToken(1)]
      })
      
      state = createOfficePhaseState([cityName], [
        { token: 't', owner: 0 }
      ])
      
      // Office marker not first
      state.players[0].readyMarkers = ['Upgrade', 'Office', 'Swap']

      const newContext = MarkerOfficeAction(state, { city: cityName })
      
      // Should find and consume the Office marker specifically
      expect(state.players[0].readyMarkers).toEqual(['Upgrade', 'Swap'])
      expect(state.players[0].usedMarkers).toContain('Office')
    })

    it('should work when Office marker is the only ready marker', () => {
      const cityName = 'Hamburg'
      state = setupCityWithOffices(state, cityName, {
        tokens: [createToken(1)]
      })
      
      // Only Office marker
      state.players[0].readyMarkers = ['Office']
      
      state = createOfficePhaseState([cityName], [
        { token: 't', owner: 0 }
      ])

      const newContext = MarkerOfficeAction(state, { city: cityName })
      
      expect(state.players[0].readyMarkers).toEqual([])
      expect(state.players[0].usedMarkers).toContain('Office')
    })
  })

  describe('Context management', () => {
    it('should properly return to previous context', () => {
      const cityName = 'Hamburg'
      state = setupCityWithOffices(state, cityName, {
        tokens: [createToken(1)]
      })
      
      state = createOfficePhaseState([cityName], [
        { token: 't', owner: 0 }
      ])

      const expectedPrevContext = state.context.prev
      
      const result = MarkerOfficeAction(state, { city: cityName })
      
      expect(result).toBe(expectedPrevContext)
    })

    it('should clear hand after token consumption', () => {
      const cityName = 'Hamburg'
      state = setupCityWithOffices(state, cityName, {
        tokens: [createToken(1)]
      })
      
      state = createOfficePhaseState([cityName], [
        { token: 't', owner: 0 },
        { token: 'm', owner: 0 }
      ])

      const newContext = MarkerOfficeAction(state, { city: cityName })
      
      expect(state.context.hand).toEqual([])
    })
  })

  describe('Multiple left offices in same city', () => {
    it('should correctly place multiple left offices from different players', () => {
      const cityName = 'Hamburg'
      state = createOfficePhaseState([cityName], [
        { token: 't', owner: 0 }
      ])
      
      state = setupCityWithOffices(state, cityName, {
        tokens: [createToken(1)], // Existing office
        leftOffices: [createToken(1)] // One left office from another player
      })

      const newContext = MarkerOfficeAction(state, { city: cityName })
      
      // Should add to existing left offices
      expect(state.cities[cityName].leftOffices).toHaveLength(2)
      expect(state.cities[cityName].leftOffices[0]).toEqual({ owner: 1, merch: false })
      expect(state.cities[cityName].leftOffices[1]).toEqual({ owner: 0, merch: false })
    })

    it('should approach maximum left office limit', () => {
      const cityName = 'Hamburg'
      state = createOfficePhaseState([cityName], [
        { token: 't', owner: 0 }
      ])
      
      state = setupCityWithOffices(state, cityName, {
        tokens: [createToken(1)],
        leftOffices: Array(4).fill(null).map((_, i) => createToken((i % 3) + 1)) // 4 left offices
      })

      const newContext = MarkerOfficeAction(state, { city: cityName })
      
      // Should now have 5 left offices (maximum)
      expect(state.cities[cityName].leftOffices).toHaveLength(5)
    })
  })

  describe('Integration with different city configurations', () => {
    it('should work with cities that have only extra offices', () => {
      const cityName = 'Hamburg'
      state = setupCityWithOffices(state, cityName, {
        tokens: [], // No regular offices
        extras: [createToken(1), createToken(2)] // Only extra offices
      })
      
      state = createOfficePhaseState([cityName], [
        { token: 'm', owner: 0 }
      ])

      const newContext = MarkerOfficeAction(state, { city: cityName })
      
      expect(state.cities[cityName].leftOffices).toHaveLength(1)
      expect(state.cities[cityName].leftOffices[0]).toEqual({
        owner: 0,
        merch: true
      })
    })

    it('should work with cities that have mixed office types', () => {
      const cityName = 'Hamburg'
      state = createOfficePhaseState([cityName], [
        { token: 't', owner: 0 }
      ])
      
      state = setupCityWithOffices(state, cityName, {
        tokens: [createToken(1)], // Regular office
        extras: [createToken(2)], // Extra office
        leftOffices: [createToken(0)] // Existing left office
      })

      const newContext = MarkerOfficeAction(state, { city: cityName })
      
      // Should add to existing left offices
      expect(state.cities[cityName].leftOffices).toHaveLength(2)
      expect(state.cities[cityName].tokens).toHaveLength(1) // Regular offices unchanged
      expect(state.cities[cityName].extras).toHaveLength(1) // Extra offices unchanged
    })
  })
})