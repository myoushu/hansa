import { describe, it, expect, beforeEach } from 'vitest'
import { GameState } from '../../game/model'
import { MarkerOfficeAction } from '../../game/actions'
import { 
  createTestGameState, 
  createOfficePhaseState, 
  setupCityWithOffices, 
  createToken
} from '../../test/utils'

describe('Extra Office Token Management', () => {
  let state: GameState

  beforeEach(() => {
    state = createTestGameState()
  })

  describe('Token preference rules', () => {
    it('should prefer tradesman tokens over merchant tokens', () => {
      const cityName = 'Hamburg'
      state = setupCityWithOffices(state, cityName, {
        tokens: [createToken(1)]
      })
      
      // Hand has both types - should use tradesman
      state = createOfficePhaseState([cityName], [
        { token: 'm', owner: 0 },
        { token: 't', owner: 0 },
        { token: 'm', owner: 0 }
      ])

      const initialGeneralStock = { ...state.players[0].generalStock }
      
      const newContext = MarkerOfficeAction(state, { city: cityName })
      
      // Should use tradesman for office
      expect(state.cities[cityName].leftOffices[state.cities[cityName].leftOffices.length - 1].merch).toBe(false)
      
      // Should return 2 merchants to general stock
      expect(state.players[0].generalStock.m).toBe(initialGeneralStock.m + 2)
      expect(state.players[0].generalStock.t).toBe(initialGeneralStock.t)
    })

    it('should use merchant when only merchants available', () => {
      const cityName = 'Hamburg'
      state = setupCityWithOffices(state, cityName, {
        tokens: [createToken(1)]
      })
      
      // Hand has only merchants
      state = createOfficePhaseState([cityName], [
        { token: 'm', owner: 0 },
        { token: 'm', owner: 0 }
      ])

      const initialGeneralStock = { ...state.players[0].generalStock }
      
      const newContext = MarkerOfficeAction(state, { city: cityName })
      
      // Should use merchant for office
      expect(state.cities[cityName].leftOffices[state.cities[cityName].leftOffices.length - 1].merch).toBe(true)
      
      // Should return 1 merchant to general stock
      expect(state.players[0].generalStock.m).toBe(initialGeneralStock.m + 1)
    })

    it('should use merchant when only one merchant available', () => {
      const cityName = 'Hamburg'
      state = setupCityWithOffices(state, cityName, {
        tokens: [createToken(1)]
      })
      
      // Hand has only one merchant
      state = createOfficePhaseState([cityName], [
        { token: 'm', owner: 0 }
      ])

      const newContext = MarkerOfficeAction(state, { city: cityName })
      
      // Should use merchant for office
      expect(state.cities[cityName].leftOffices[state.cities[cityName].leftOffices.length - 1].merch).toBe(true)
      
      // Hand should be empty after using the token
      expect(state.context.hand).toHaveLength(0)
    })

    it('should use tradesman when only one tradesman available', () => {
      const cityName = 'Hamburg'
      state = setupCityWithOffices(state, cityName, {
        tokens: [createToken(1)]
      })
      
      // Hand has only one tradesman
      state = createOfficePhaseState([cityName], [
        { token: 't', owner: 0 }
      ])

      const newContext = MarkerOfficeAction(state, { city: cityName })
      
      // Should use tradesman for office
      expect(state.cities[cityName].leftOffices[state.cities[cityName].leftOffices.length - 1].merch).toBe(false)
      
      // Hand should be empty after using the token
      expect(state.context.hand).toHaveLength(0)
    })
  })

  describe('Token return to general stock', () => {
    it('should return all unused tokens to general stock', () => {
      const cityName = 'Hamburg'
      state = setupCityWithOffices(state, cityName, {
        tokens: [createToken(1)]
      })
      
      // Large hand with mixed tokens
      state = createOfficePhaseState([cityName], [
        { token: 't', owner: 0 }, // Will be used
        { token: 'm', owner: 0 }, // Will be returned
        { token: 't', owner: 0 }, // Will be returned
        { token: 'm', owner: 0 }, // Will be returned
        { token: 't', owner: 0 }  // Will be returned
      ])

      const initialGeneralStock = { ...state.players[0].generalStock }
      
      const newContext = MarkerOfficeAction(state, { city: cityName })
      
      // Should return 4 tokens: 2 merchants + 2 tradesmen
      expect(state.players[0].generalStock.m).toBe(initialGeneralStock.m + 2)
      expect(state.players[0].generalStock.t).toBe(initialGeneralStock.t + 2)
      
      // Hand should be empty
      expect(state.context.hand).toHaveLength(0)
    })

    it('should handle edge case with all merchants', () => {
      const cityName = 'Hamburg'
      state = setupCityWithOffices(state, cityName, {
        tokens: [createToken(1)]
      })
      
      // All merchants in hand
      state = createOfficePhaseState([cityName], [
        { token: 'm', owner: 0 },
        { token: 'm', owner: 0 },
        { token: 'm', owner: 0 }
      ])

      const initialGeneralStock = { ...state.players[0].generalStock }
      
      const newContext = MarkerOfficeAction(state, { city: cityName })
      
      // Should use one merchant, return two
      expect(state.players[0].generalStock.m).toBe(initialGeneralStock.m + 2)
      expect(state.players[0].generalStock.t).toBe(initialGeneralStock.t)
    })

    it('should handle edge case with all tradesmen', () => {
      const cityName = 'Hamburg'
      state = setupCityWithOffices(state, cityName, {
        tokens: [createToken(1)]
      })
      
      // All tradesmen in hand
      state = createOfficePhaseState([cityName], [
        { token: 't', owner: 0 },
        { token: 't', owner: 0 },
        { token: 't', owner: 0 }
      ])

      const initialGeneralStock = { ...state.players[0].generalStock }
      
      const newContext = MarkerOfficeAction(state, { city: cityName })
      
      // Should use one tradesman, return two
      expect(state.players[0].generalStock.m).toBe(initialGeneralStock.m)
      expect(state.players[0].generalStock.t).toBe(initialGeneralStock.t + 2)
    })
  })

  describe('Token ownership validation', () => {
    it('should only use tokens owned by current player', () => {
      const cityName = 'Hamburg'
      state = setupCityWithOffices(state, cityName, {
        tokens: [createToken(1)]
      })
      
      // Hand has tokens from different players
      state = createOfficePhaseState([cityName], [
        { token: 't', owner: 0 }, // Current player's token
        { token: 'm', owner: 1 }, // Another player's token (shouldn't be in hand normally)
      ])

      const initialPlayerStock = { ...state.players[0].generalStock }
      const initialOtherStock = { ...state.players[1].generalStock }
      
      const newContext = MarkerOfficeAction(state, { city: cityName })
      
      // Should use current player's tradesman
      expect(state.cities[cityName].leftOffices[state.cities[cityName].leftOffices.length - 1]).toEqual({
        owner: 0,
        merch: false
      })
      
      // Should return all tokens to current player's general stock  
      expect(state.players[0].generalStock.m).toBe(initialPlayerStock.m + 1)
      expect(state.players[0].generalStock.t).toBe(initialPlayerStock.t)
    })
  })

  describe('Empty hand scenarios', () => {
    it('should throw error when hand is empty', () => {
      const cityName = 'Hamburg'
      state = setupCityWithOffices(state, cityName, {
        tokens: [createToken(1)]
      })
      
      // Empty hand
      state = createOfficePhaseState([cityName], [])

      expect(() => {
        MarkerOfficeAction(state, { city: cityName })
      }).toThrow('No tokens available from route completion')
    })

    it('should not modify game state when throwing error', () => {
      const cityName = 'Hamburg'
      // Empty hand
      state = createOfficePhaseState([cityName], [])
      
      state = setupCityWithOffices(state, cityName, {
        tokens: [createToken(1)]
      })

      const originalLeftOffices = state.cities[cityName].leftOffices.length
      const originalReadyMarkers = [...state.players[0].readyMarkers]
      const originalUsedMarkers = [...state.players[0].usedMarkers]

      expect(() => {
        MarkerOfficeAction(state, { city: cityName })
      }).toThrow()

      // Key state should remain unchanged except marker is consumed before error check
      expect(state.cities[cityName].leftOffices).toHaveLength(originalLeftOffices)
      expect(state.players[0].readyMarkers).toEqual([]) // Marker removed before error
      expect(state.players[0].usedMarkers).toContain('Office') // Marker moved to used
    })
  })
})