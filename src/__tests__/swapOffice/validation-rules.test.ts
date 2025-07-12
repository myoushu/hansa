import { describe, it, expect, beforeEach } from 'vitest'
import { GameState } from '../../game/model'
import { MarkerSwapAction } from '../../game/actions'
import { canSwapOfficePair, getValidSwapPairs } from '../../game/helpers'
import { 
  createTestGameState, 
  setupCityWithOffices, 
  createToken,
  createTestPlayer
} from '../../test/utils'

describe('Swap Office Validation Rules', () => {
  let state: GameState

  beforeEach(() => {
    state = createTestGameState()
  })

  describe('Adjacent offices requirement', () => {
    it('should allow swapping adjacent offices', () => {
      // Setup: Two adjacent offices
      const cityName = 'Hamburg'
      state = setupCityWithOffices(state, cityName, {
        tokens: [createToken(0), createToken(1)] // Adjacent at indices 0-1
      })

      // Validation: Should allow swapping
      const validationError = canSwapOfficePair(state, cityName, 0, 1)
      expect(validationError).toBeNull()
    })

    it('should reject swapping non-adjacent offices', () => {
      // Setup: Three offices with gap
      const cityName = 'Hamburg'
      state = setupCityWithOffices(state, cityName, {
        tokens: [createToken(0), createToken(1), createToken(2)] // Offices at indices 0-2
      })

      // Validation: Should reject swapping indices 0 and 2 (not adjacent)
      const validationError = canSwapOfficePair(state, cityName, 0, 2)
      expect(validationError).toBe('Offices must be adjacent')
    })

    it('should reject swapping same office with itself', () => {
      // Setup: Single office
      const cityName = 'Hamburg'
      state = setupCityWithOffices(state, cityName, {
        tokens: [createToken(0)]
      })

      // Validation: Should reject swapping office with itself
      const validationError = canSwapOfficePair(state, cityName, 0, 0)
      expect(validationError).toBe('Offices must be adjacent')
    })
  })

  describe('Same city restriction', () => {
    it('should only find valid pairs within the same city', () => {
      // Setup: Multiple cities with offices
      state = setupCityWithOffices(state, 'Hamburg', {
        tokens: [createToken(0), createToken(1)] // One pair
      })
      state = setupCityWithOffices(state, 'Bremen', {
        tokens: [createToken(0), createToken(1)] // Another pair
      })

      // Validation: Each city should only return its own pairs
      const hamburgPairs = getValidSwapPairs(state, 'Hamburg')
      const bremenPairs = getValidSwapPairs(state, 'Bremen')

      expect(hamburgPairs).toHaveLength(1)
      expect(bremenPairs).toHaveLength(1)
      
      // Hamburg pair should reference Hamburg office indices
      expect(hamburgPairs[0]).toEqual({ office1: 0, office2: 1 })
      // Bremen pair should reference Bremen office indices
      expect(bremenPairs[0]).toEqual({ office1: 0, office2: 1 })
    })

    it('should generate independent pairs for each city', () => {
      // Setup: Different office configurations in different cities
      state = setupCityWithOffices(state, 'Hamburg', {
        tokens: [createToken(0), createToken(1)] // Two offices
      })
      state = setupCityWithOffices(state, 'Bremen', {
        tokens: [createToken(0), createToken(1), createToken(2)] // Three offices
      })

      // Action: Get pairs for each city
      const hamburgPairs = getValidSwapPairs(state, 'Hamburg')
      const bremenPairs = getValidSwapPairs(state, 'Bremen')

      // Assertions: Different cities should have different numbers of pairs
      expect(hamburgPairs).toHaveLength(1) // One pair from two offices
      expect(bremenPairs).toHaveLength(2) // Two pairs from three offices
      expect(hamburgPairs[0]).toEqual({ office1: 0, office2: 1 })
      expect(bremenPairs[0]).toEqual({ office1: 0, office2: 1 })
      expect(bremenPairs[1]).toEqual({ office1: 1, office2: 2 })
    })
  })

  describe('Extra office restrictions', () => {
    it('should reject swapping left offices (extra offices)', () => {
      // Setup: City with left offices and regular offices
      const cityName = 'Hamburg'
      state = setupCityWithOffices(state, cityName, {
        leftOffices: [createToken(0), createToken(1)], // Left offices at indices 0-1
        tokens: [createToken(0), createToken(1)] // Regular offices at indices 2-3
      })

      // Validation: Should reject swapping left offices
      const validationError1 = canSwapOfficePair(state, cityName, 0, 1)
      expect(validationError1).toBe('Cannot swap left offices or extra offices')

      // Should also reject swapping left office with regular office
      const validationError2 = canSwapOfficePair(state, cityName, 0, 2)
      expect(validationError2).toBe('Cannot swap left offices or extra offices')
    })

    it('should reject swapping extra offices', () => {
      // Setup: City with extras and regular offices
      const cityName = 'Hamburg'
      state = setupCityWithOffices(state, cityName, {
        extras: [createToken(0), createToken(1)], // Extra offices at indices 0-1
        tokens: [createToken(0), createToken(1)] // Regular offices at indices 2-3
      })

      // Validation: Should reject swapping extra offices
      const validationError1 = canSwapOfficePair(state, cityName, 0, 1)
      expect(validationError1).toBe('Cannot swap left offices or extra offices')

      // Should also reject swapping extra office with regular office
      const validationError2 = canSwapOfficePair(state, cityName, 1, 2)
      expect(validationError2).toBe('Cannot swap left offices or extra offices')
    })

    it('should only find valid pairs among regular offices', () => {
      // Setup: Complex city layout
      const cityName = 'Hamburg'
      state = setupCityWithOffices(state, cityName, {
        leftOffices: [createToken(2)], // 1 left office (index 0)
        extras: [createToken(1)], // 1 extra office (index 1) 
        tokens: [createToken(0), createToken(1), createToken(2)] // 3 regular offices (indices 2-4)
      })

      // Validation: Should only find pairs among regular offices (indices 2-4)
      const validPairs = getValidSwapPairs(state, cityName)
      expect(validPairs).toHaveLength(2)
      expect(validPairs).toEqual([
        { office1: 2, office2: 3 }, // First and second regular offices
        { office1: 3, office2: 4 }  // Second and third regular offices
      ])
    })

    it('should handle city with only left/extra offices gracefully', () => {
      // Setup: City with only non-swappable offices
      const cityName = 'Hamburg'
      state = setupCityWithOffices(state, cityName, {
        leftOffices: [createToken(0), createToken(1)],
        extras: [createToken(2)],
        tokens: [] // No regular offices
      })

      // Validation: Should find no valid pairs
      const validPairs = getValidSwapPairs(state, cityName)
      expect(validPairs).toHaveLength(0)
    })
  })

  describe('Office existence validation', () => {
    it('should reject swapping non-existent offices', () => {
      // Setup: City with only one office
      const cityName = 'Hamburg'
      state = setupCityWithOffices(state, cityName, {
        tokens: [createToken(0)] // Only one office at index 0
      })

      // Validation: Should reject swapping with non-existent office
      const validationError = canSwapOfficePair(state, cityName, 0, 1)
      expect(validationError).toBe('Office index out of range')
    })

    it('should reject negative office indices', () => {
      // Setup: City with offices
      const cityName = 'Hamburg'
      state = setupCityWithOffices(state, cityName, {
        tokens: [createToken(0), createToken(1)]
      })

      // Validation: Should reject negative indices
      const validationError = canSwapOfficePair(state, cityName, -1, 0)
      expect(validationError).toBe('Cannot swap left offices or extra offices')
    })

    it('should reject indices beyond available offices', () => {
      // Setup: City with two offices
      const cityName = 'Hamburg'
      state = setupCityWithOffices(state, cityName, {
        tokens: [createToken(0), createToken(1)] // Offices at indices 0-1
      })

      // Validation: Should reject index 2 (doesn't exist)
      const validationError = canSwapOfficePair(state, cityName, 1, 2)
      expect(validationError).toBe('Office index out of range')
    })
  })

  describe('Error handling in swap execution', () => {
    it('should throw error when trying to swap invalid office pair', () => {
      // Setup: Invalid swap scenario
      const cityName = 'Hamburg'
      state.players[0] = createTestPlayer('red', { readyMarkers: ['Swap'] })
      state = setupCityWithOffices(state, cityName, {
        tokens: [createToken(0), createToken(1), createToken(2)]
      })
      
      state.context = {
        phase: 'Swap',
        player: 0,
        actions: [],
        hand: [],
        rewards: [],
        prev: {
          phase: 'Actions',
          player: 0,
          actions: [],
          hand: [],
        }
      }

      // Action: Try to swap non-adjacent offices
      expect(() => {
        MarkerSwapAction(state, { city: cityName, office1: 0, office2: 2 })
      }).toThrow('Cannot swap offices: Offices must be adjacent')
    })

    it('should throw error when trying to swap left offices', () => {
      // Setup: City with left offices
      const cityName = 'Hamburg'
      state.players[0] = createTestPlayer('red', { readyMarkers: ['Swap'] })
      state = setupCityWithOffices(state, cityName, {
        leftOffices: [createToken(0), createToken(1)],
        tokens: [createToken(0)]
      })
      
      state.context = {
        phase: 'Swap',
        player: 0,
        actions: [],
        hand: [],
        rewards: [],
        prev: {
          phase: 'Actions',
          player: 0,
          actions: [],
          hand: [],
        }
      }

      // Action: Try to swap left offices
      expect(() => {
        MarkerSwapAction(state, { city: cityName, office1: 0, office2: 1 })
      }).toThrow('Cannot swap offices: Cannot swap left offices or extra offices')
    })

    it('should throw error when trying to swap non-existent offices', () => {
      // Setup: City with limited offices
      const cityName = 'Hamburg'
      state.players[0] = createTestPlayer('red', { readyMarkers: ['Swap'] })
      state = setupCityWithOffices(state, cityName, {
        tokens: [createToken(0)] // Only one office
      })
      
      state.context = {
        phase: 'Swap',
        player: 0,
        actions: [],
        hand: [],
        rewards: [],
        prev: {
          phase: 'Actions',
          player: 0,
          actions: [],
          hand: [],
        }
      }

      // Action: Try to swap with non-existent office
      expect(() => {
        MarkerSwapAction(state, { city: cityName, office1: 0, office2: 1 })
      }).toThrow('Cannot swap offices: Office index out of range')
    })
  })

  describe('Color and piece type restrictions ignored', () => {
    it('should allow swapping offices of different colors', () => {
      // Setup: Adjacent offices owned by different players (different colors)
      const cityName = 'Hamburg'
      state = setupCityWithOffices(state, cityName, {
        tokens: [
          createToken(0), // Red player office
          createToken(1)  // Blue player office
        ]
      })

      // Validation: Should allow swapping despite different colors
      const validationError = canSwapOfficePair(state, cityName, 0, 1)
      expect(validationError).toBeNull()
    })

    it('should allow swapping merchants and tradesmen', () => {
      // Setup: Adjacent offices with different piece types
      const cityName = 'Hamburg'
      state = setupCityWithOffices(state, cityName, {
        tokens: [
          createToken(0, false), // Tradesman (square)
          createToken(0, true)   // Merchant (disc)
        ]
      })

      // Validation: Should allow swapping despite different piece types
      const validationError = canSwapOfficePair(state, cityName, 0, 1)
      expect(validationError).toBeNull()
    })

    it('should find valid pairs regardless of ownership or piece type', () => {
      // Setup: Mixed ownership and piece types
      const cityName = 'Hamburg'
      state = setupCityWithOffices(state, cityName, {
        tokens: [
          createToken(0, false), // Player 0 tradesman
          createToken(1, true),  // Player 1 merchant  
          createToken(2, false), // Player 2 tradesman
          createToken(0, true)   // Player 0 merchant
        ]
      })

      // Validation: Should find all adjacent pairs regardless of color/type
      const validPairs = getValidSwapPairs(state, cityName)
      expect(validPairs).toHaveLength(3) // Three adjacent pairs possible
      expect(validPairs).toEqual([
        { office1: 0, office2: 1 },
        { office1: 1, office2: 2 },
        { office1: 2, office2: 3 }
      ])
    })
  })
})