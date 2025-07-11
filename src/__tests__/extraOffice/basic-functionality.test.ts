import { describe, it, expect, beforeEach } from 'vitest'
import { GameState } from '../../game/model'
import { MarkerOfficeAction } from '../../game/actions'
import { 
  createTestGameState, 
  createOfficePhaseState, 
  setupCityWithOffices, 
  createToken,
  findRoute 
} from '../../test/utils'

describe('Extra Office Basic Functionality', () => {
  let state: GameState

  beforeEach(() => {
    state = createTestGameState()
  })

  describe('Office marker usage', () => {
    it('should place extra office in city to the left', () => {
      // Setup: City with existing office, player has tokens in hand from route completion
      const cityName = 'Hamburg'
      state = setupCityWithOffices(state, cityName, {
        tokens: [createToken(1)] // Another player's office
      })
      
      state = createOfficePhaseState([cityName], [
        { token: 't', owner: 0 }
      ])

      const initialLeftOffices = state.cities[cityName].leftOffices.length
      
      // Action: Use office marker
      const newContext = MarkerOfficeAction(state, { city: cityName })
      
      // Assertions - state is mutated in place
      expect(state.cities[cityName].leftOffices).toHaveLength(initialLeftOffices + 1)
      expect(state.cities[cityName].leftOffices[state.cities[cityName].leftOffices.length - 1]).toEqual({
        owner: 0,
        merch: false
      })
    })

    it('should consume Office marker from ready markers', () => {
      const cityName = 'Hamburg'
      state = setupCityWithOffices(state, cityName, {
        tokens: [createToken(1)]
      })
      
      state = createOfficePhaseState([cityName], [
        { token: 't', owner: 0 }
      ])

      expect(state.players[0].readyMarkers).toContain('Office')
      expect(state.players[0].usedMarkers).not.toContain('Office')
      
      const newContext = MarkerOfficeAction(state, { city: cityName })
      
      expect(state.players[0].readyMarkers).not.toContain('Office')
      expect(state.players[0].usedMarkers).toContain('Office')
    })

    it('should use tradesman token when available', () => {
      const cityName = 'Hamburg'
      state = setupCityWithOffices(state, cityName, {
        tokens: [createToken(1)]
      })
      
      state = createOfficePhaseState([cityName], [
        { token: 't', owner: 0 },
        { token: 'm', owner: 0 }
      ])

      const newContext = MarkerOfficeAction(state, { city: cityName })
      
      // Should use tradesman (square marker)
      expect(state.cities[cityName].leftOffices[state.cities[cityName].leftOffices.length - 1].merch).toBe(false)
    })

    it('should use merchant token when only merchants available', () => {
      const cityName = 'Hamburg'
      state = setupCityWithOffices(state, cityName, {
        tokens: [createToken(1)]
      })
      
      state = createOfficePhaseState([cityName], [
        { token: 'm', owner: 0 },
        { token: 'm', owner: 0 }
      ])

      const newContext = MarkerOfficeAction(state, { city: cityName })
      
      // Should use merchant (disc marker)
      expect(state.cities[cityName].leftOffices[state.cities[cityName].leftOffices.length - 1].merch).toBe(true)
    })

    it('should return remaining tokens to general stock', () => {
      const cityName = 'Hamburg'
      state = setupCityWithOffices(state, cityName, {
        tokens: [createToken(1)]
      })
      
      state = createOfficePhaseState([cityName], [
        { token: 't', owner: 0 },
        { token: 'm', owner: 0 },
        { token: 't', owner: 0 }
      ])

      const initialGeneralStock = { ...state.players[0].generalStock }
      
      const newContext = MarkerOfficeAction(state, { city: cityName })
      
      // Should return 2 tokens (1 merchant, 1 tradesman) to general stock
      expect(state.players[0].generalStock.m).toBe(initialGeneralStock.m + 1)
      expect(state.players[0].generalStock.t).toBe(initialGeneralStock.t + 1)
      expect(state.context.hand).toHaveLength(0)
    })

    it('should add log entry for office placement', () => {
      const cityName = 'Hamburg'
      state = setupCityWithOffices(state, cityName, {
        tokens: [createToken(1)]
      })
      
      state = createOfficePhaseState([cityName], [
        { token: 't', owner: 0 }
      ])

      const initialLogLength = state.log.length
      
      const newContext = MarkerOfficeAction(state, { city: cityName })
      
      expect(state.log).toHaveLength(initialLogLength + 1)
      expect(state.log[state.log.length - 1]).toEqual({
        player: 0,
        message: expect.stringContaining(`uses Office marker to place an office to the left in ${cityName}`)
      })
    })

    it('should return to previous context after placement', () => {
      const cityName = 'Hamburg'
      state = setupCityWithOffices(state, cityName, {
        tokens: [createToken(1)]
      })
      
      state = createOfficePhaseState([cityName], [
        { token: 't', owner: 0 }
      ])

      const prevContext = state.context.prev
      
      const newContext = MarkerOfficeAction(state, { city: cityName })
      
      expect(newContext).toBe(prevContext)
    })
  })

  describe('Error handling', () => {
    it('should throw error when no tokens available in hand', () => {
      const cityName = 'Hamburg'
      state = setupCityWithOffices(state, cityName, {
        tokens: [createToken(1)]
      })
      
      state = createOfficePhaseState([cityName], []) // No tokens in hand

      expect(() => {
        MarkerOfficeAction(state, { city: cityName })
      }).toThrow('No tokens available from route completion')
    })
  })
})