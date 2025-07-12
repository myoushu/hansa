import { describe, it, expect, beforeEach } from 'vitest'
import { GameState } from '../../game/model'
import { MarkerSwapAction, MarkerUseAction } from '../../game/actions'
import { 
  createTestGameState, 
  setupCityWithOffices, 
  createToken,
  createTestPlayer
} from '../../test/utils'

describe('Swap Office State Management', () => {
  let state: GameState

  beforeEach(() => {
    state = createTestGameState()
  })

  describe('Office position updates', () => {
    it('should correctly swap office positions in regular offices array', () => {
      // Setup: Two offices to swap
      const cityName = 'Hamburg'
      state.players[0] = createTestPlayer('red', { readyMarkers: ['Swap'] })
      
      const office1 = createToken(0, false) // Player 0 tradesman
      const office2 = createToken(1, true)  // Player 1 merchant
      
      state = setupCityWithOffices(state, cityName, {
        tokens: [office1, office2]
      })
      
      state.context = {
        phase: 'Swap',
        player: 0,
        actions: [],
        hand: [],
        rewards: [],
        prev: { phase: 'Actions', player: 0, actions: [], hand: [] }
      }

      // Action: Swap offices at indices 0 and 1
      MarkerSwapAction(state, { city: cityName, office1: 0, office2: 1 })

      // Assertions: Positions should be swapped
      expect(state.cities[cityName].tokens[0]).toEqual(office2)
      expect(state.cities[cityName].tokens[1]).toEqual(office1)
      expect(state.cities[cityName].tokens).toHaveLength(2)
    })

    it('should preserve office properties during swap', () => {
      // Setup: Offices with different properties
      const cityName = 'Hamburg'
      state.players[0] = createTestPlayer('red', { readyMarkers: ['Swap'] })
      
      const office1 = { owner: 0, merch: false } // Tradesman
      const office2 = { owner: 2, merch: true }  // Merchant
      
      state = setupCityWithOffices(state, cityName, {
        tokens: [office1, office2]
      })
      
      state.context = {
        phase: 'Swap',
        player: 0,
        actions: [],
        hand: [],
        rewards: [],
        prev: { phase: 'Actions', player: 0, actions: [], hand: [] }
      }

      // Action: Swap offices
      MarkerSwapAction(state, { city: cityName, office1: 0, office2: 1 })

      // Assertions: All properties should be preserved
      expect(state.cities[cityName].tokens[0]).toEqual(office2)
      expect(state.cities[cityName].tokens[1]).toEqual(office1)
      expect(state.cities[cityName].tokens[0].owner).toBe(2)
      expect(state.cities[cityName].tokens[0].merch).toBe(true)
      expect(state.cities[cityName].tokens[1].owner).toBe(0)
      expect(state.cities[cityName].tokens[1].merch).toBe(false)
    })

    it('should not affect other office arrays (left offices, extras)', () => {
      // Setup: Complex city layout
      const cityName = 'Hamburg'
      state.players[0] = createTestPlayer('red', { readyMarkers: ['Swap'] })
      
      const leftOffice1 = createToken(2, false)
      const leftOffice2 = createToken(1, true)
      const extraOffice = createToken(0, false)
      const regularOffice1 = createToken(0, true)
      const regularOffice2 = createToken(1, false)
      
      state = setupCityWithOffices(state, cityName, {
        leftOffices: [leftOffice1, leftOffice2],
        extras: [extraOffice],
        tokens: [regularOffice1, regularOffice2]
      })
      
      state.context = {
        phase: 'Swap',
        player: 0,
        actions: [],
        hand: [],
        rewards: [],
        prev: { phase: 'Actions', player: 0, actions: [], hand: [] }
      }

      // Store original non-regular offices
      const originalLeftOffices = [...state.cities[cityName].leftOffices]
      const originalExtras = [...state.cities[cityName].extras]

      // Action: Swap regular offices (indices 3 and 4 in full layout)
      MarkerSwapAction(state, { city: cityName, office1: 3, office2: 4 })

      // Assertions: Only regular offices should change
      expect(state.cities[cityName].leftOffices).toEqual(originalLeftOffices)
      expect(state.cities[cityName].extras).toEqual(originalExtras)
      expect(state.cities[cityName].tokens[0]).toEqual(regularOffice2)
      expect(state.cities[cityName].tokens[1]).toEqual(regularOffice1)
    })
  })

  describe('Index calculation with complex layouts', () => {
    it('should correctly calculate regular office indices with left offices present', () => {
      // Setup: City with left offices affecting index calculation
      const cityName = 'Hamburg'
      state.players[0] = createTestPlayer('red', { readyMarkers: ['Swap'] })
      
      state = setupCityWithOffices(state, cityName, {
        leftOffices: [createToken(2), createToken(1)], // 2 left offices (indices 0-1)
        tokens: [createToken(0), createToken(1)]        // 2 regular offices (indices 2-3)
      })
      
      state.context = {
        phase: 'Swap',
        player: 0,
        actions: [],
        hand: [],
        rewards: [],
        prev: { phase: 'Actions', player: 0, actions: [], hand: [] }
      }

      const originalRegular1 = state.cities[cityName].tokens[0]
      const originalRegular2 = state.cities[cityName].tokens[1]

      // Action: Swap regular offices using their absolute indices (2 and 3)
      MarkerSwapAction(state, { city: cityName, office1: 2, office2: 3 })

      // Assertions: Should correctly swap within tokens array
      expect(state.cities[cityName].tokens[0]).toEqual(originalRegular2)
      expect(state.cities[cityName].tokens[1]).toEqual(originalRegular1)
      // Left offices should be unchanged
      expect(state.cities[cityName].leftOffices).toHaveLength(2)
    })

    it('should correctly calculate regular office indices with extras present', () => {
      // Setup: City with extra offices affecting index calculation
      const cityName = 'Hamburg'
      state.players[0] = createTestPlayer('red', { readyMarkers: ['Swap'] })
      
      state = setupCityWithOffices(state, cityName, {
        extras: [createToken(2), createToken(1)],    // 2 extra offices (indices 0-1)
        tokens: [createToken(0), createToken(1)]     // 2 regular offices (indices 2-3)
      })
      
      state.context = {
        phase: 'Swap',
        player: 0,
        actions: [],
        hand: [],
        rewards: [],
        prev: { phase: 'Actions', player: 0, actions: [], hand: [] }
      }

      const originalRegular1 = state.cities[cityName].tokens[0]
      const originalRegular2 = state.cities[cityName].tokens[1]

      // Action: Swap regular offices using their absolute indices (2 and 3)
      MarkerSwapAction(state, { city: cityName, office1: 2, office2: 3 })

      // Assertions: Should correctly swap within tokens array
      expect(state.cities[cityName].tokens[0]).toEqual(originalRegular2)
      expect(state.cities[cityName].tokens[1]).toEqual(originalRegular1)
      // Extra offices should be unchanged
      expect(state.cities[cityName].extras).toHaveLength(2)
    })

    it('should handle all three office types simultaneously', () => {
      // Setup: City with all office types
      const cityName = 'Hamburg'
      state.players[0] = createTestPlayer('red', { readyMarkers: ['Swap'] })
      
      state = setupCityWithOffices(state, cityName, {
        leftOffices: [createToken(2)],               // 1 left office (index 0)
        extras: [createToken(1), createToken(2)],    // 2 extra offices (indices 1-2)
        tokens: [createToken(0), createToken(1), createToken(2)] // 3 regular offices (indices 3-5)
      })
      
      state.context = {
        phase: 'Swap',
        player: 0,
        actions: [],
        hand: [],
        rewards: [],
        prev: { phase: 'Actions', player: 0, actions: [], hand: [] }
      }

      const originalRegular1 = state.cities[cityName].tokens[0] // Index 3 in full layout
      const originalRegular2 = state.cities[cityName].tokens[1] // Index 4 in full layout

      // Action: Swap first two regular offices (absolute indices 3 and 4)
      MarkerSwapAction(state, { city: cityName, office1: 3, office2: 4 })

      // Assertions: Only regular offices should be affected
      expect(state.cities[cityName].leftOffices).toHaveLength(1)
      expect(state.cities[cityName].extras).toHaveLength(2)
      expect(state.cities[cityName].tokens[0]).toEqual(originalRegular2)
      expect(state.cities[cityName].tokens[1]).toEqual(originalRegular1)
      expect(state.cities[cityName].tokens[2]).toEqual(createToken(2)) // Third regular office unchanged
    })
  })

  describe('Reward generation state accuracy', () => {
    it('should generate rewards with correct absolute indices', () => {
      // This test is for verifying the getValidSwapPairs function produces 
      // correct indices that work with MarkerSwapAction
      
      const cityName = 'Hamburg'
      state.players[0] = createTestPlayer('red', { readyMarkers: ['Swap'] })
      
      state = setupCityWithOffices(state, cityName, {
        leftOffices: [createToken(2)],            // Index 0
        extras: [createToken(1)],                 // Index 1
        tokens: [createToken(0), createToken(1), createToken(2)] // Indices 2-4
      })
      
      state.context = {
        phase: 'Actions',
        player: 0,
        actions: [],
        hand: [],
      }

      // Action: Generate swap rewards
      const newContext = MarkerUseAction(state, { kind: 'Swap' })

      // Assertions: Rewards should have correct indices for regular offices
      expect(newContext.rewards).toHaveLength(2) // Two adjacent pairs possible
      expect(newContext.rewards![0]!.action.params).toEqual({
        city: cityName,
        office1: 2, // First regular office absolute index
        office2: 3  // Second regular office absolute index
      })
      expect(newContext.rewards![1]!.action.params).toEqual({
        city: cityName,
        office1: 3, // Second regular office absolute index
        office2: 4  // Third regular office absolute index
      })

      // Verify these indices actually work for swapping
      state.context = newContext
      
      const originalFirst = state.cities[cityName].tokens[0]
      const originalSecond = state.cities[cityName].tokens[1]
      
      // Use the generated reward parameters
      MarkerSwapAction(state, newContext.rewards![0]!.action.params as any)
      
      expect(state.cities[cityName].tokens[0]).toEqual(originalSecond)
      expect(state.cities[cityName].tokens[1]).toEqual(originalFirst)
    })
  })

  describe('State immutability and side effects', () => {
    it('should not affect other cities when swapping in one city', () => {
      // Setup: Multiple cities with offices
      state.players[0] = createTestPlayer('red', { readyMarkers: ['Swap'] })
      
      state = setupCityWithOffices(state, 'Hamburg', {
        tokens: [createToken(0), createToken(1)]
      })
      state = setupCityWithOffices(state, 'Bremen', {
        tokens: [createToken(2), createToken(0)]
      })
      
      state.context = {
        phase: 'Swap',
        player: 0,
        actions: [],
        hand: [],
        rewards: [],
        prev: { phase: 'Actions', player: 0, actions: [], hand: [] }
      }

      // Store original Bremen state
      const originalBremenOffices = [...state.cities.Bremen.tokens]

      // Action: Swap offices in Hamburg only
      MarkerSwapAction(state, { city: 'Hamburg', office1: 0, office2: 1 })

      // Assertions: Bremen should be unchanged
      expect(state.cities.Bremen.tokens).toEqual(originalBremenOffices)
      expect(state.cities.Hamburg.tokens[0]).toEqual(createToken(1))
      expect(state.cities.Hamburg.tokens[1]).toEqual(createToken(0))
    })

    it('should not affect other game state properties', () => {
      // Setup: Game with various state properties
      const cityName = 'Hamburg'
      state.players[0] = createTestPlayer('red', { 
        readyMarkers: ['Swap'],
        actions: 2,
        keys: 3,
        privilege: 4,
        points: 15,
        bank: 5
      })
      
      state = setupCityWithOffices(state, cityName, {
        tokens: [createToken(0), createToken(1)]
      })
      
      state.turn = 7
      state.markers = ['Office', 'Upgrade']
      state.coellen = [null, createToken(0) as any, null, null]
      
      state.context = {
        phase: 'Swap',
        player: 0,
        actions: [],
        hand: [],
        rewards: [],
        prev: { phase: 'Actions', player: 0, actions: [], hand: [] }
      }

      // Store original state
      const originalPlayerState = {
        actions: state.players[0].actions,
        keys: state.players[0].keys,
        privilege: state.players[0].privilege,
        points: state.players[0].points,
        bank: state.players[0].bank,
        generalStock: { ...state.players[0].generalStock },
        personalSupply: { ...state.players[0].personalSupply }
      }
      const originalTurn = state.turn
      const originalMarkers = [...state.markers]
      const originalCoellen = [...state.coellen]

      // Action: Swap offices
      MarkerSwapAction(state, { city: cityName, office1: 0, office2: 1 })

      // Assertions: Other state should be unchanged
      expect(state.players[0].actions).toBe(originalPlayerState.actions)
      expect(state.players[0].keys).toBe(originalPlayerState.keys)
      expect(state.players[0].privilege).toBe(originalPlayerState.privilege)
      expect(state.players[0].points).toBe(originalPlayerState.points)
      expect(state.players[0].bank).toBe(originalPlayerState.bank)
      expect(state.players[0].generalStock).toEqual(originalPlayerState.generalStock)
      expect(state.players[0].personalSupply).toEqual(originalPlayerState.personalSupply)
      expect(state.turn).toBe(originalTurn)
      expect(state.markers).toEqual(originalMarkers)
      expect(state.coellen).toEqual(originalCoellen)
    })

    it('should not mutate original office objects', () => {
      // Setup: Specific office objects
      const cityName = 'Hamburg'
      state.players[0] = createTestPlayer('red', { readyMarkers: ['Swap'] })
      
      const office1 = { owner: 0, merch: false }
      const office2 = { owner: 1, merch: true }
      
      state = setupCityWithOffices(state, cityName, {
        tokens: [office1, office2]
      })
      
      state.context = {
        phase: 'Swap',
        player: 0,
        actions: [],
        hand: [],
        rewards: [],
        prev: { phase: 'Actions', player: 0, actions: [], hand: [] }
      }

      // Store original object references
      const originalOffice1Ref = state.cities[cityName].tokens[0]
      const originalOffice2Ref = state.cities[cityName].tokens[1]

      // Action: Swap offices
      MarkerSwapAction(state, { city: cityName, office1: 0, office2: 1 })

      // Assertions: Objects should be moved, not mutated
      expect(state.cities[cityName].tokens[0]).toBe(originalOffice2Ref)
      expect(state.cities[cityName].tokens[1]).toBe(originalOffice1Ref)
      
      // Original objects should maintain their properties
      expect(originalOffice1Ref.owner).toBe(0)
      expect(originalOffice1Ref.merch).toBe(false)
      expect(originalOffice2Ref.owner).toBe(1)
      expect(originalOffice2Ref.merch).toBe(true)
    })
  })

  describe('Context and phase management', () => {
    it('should properly restore previous context after swap', () => {
      // Setup: Complex context stack
      const cityName = 'Hamburg'
      state.players[0] = createTestPlayer('red', { readyMarkers: ['Swap'] })
      state = setupCityWithOffices(state, cityName, {
        tokens: [createToken(0), createToken(1)]
      })
      
      const originalContext = {
        phase: 'Actions' as const,
        player: 0,
        actions: [{ name: 'route' as const, params: { route: 0 } }],
        hand: [{ token: 't' as const, owner: 0 }],
      }
      
      state.context = {
        phase: 'Swap',
        player: 0,
        actions: [],
        hand: [],
        rewards: [],
        prev: originalContext
      }

      // Action: Execute swap
      const returnedContext = MarkerSwapAction(state, { city: cityName, office1: 0, office2: 1 })

      // Assertions: Should return exact previous context
      expect(returnedContext).toBe(originalContext)
      expect(returnedContext.phase).toBe('Actions')
      expect(returnedContext.actions).toHaveLength(1)
      expect(returnedContext.hand).toHaveLength(1)
    })

    it('should handle null previous context gracefully', () => {
      // Setup: Swap context without previous context (edge case)
      const cityName = 'Hamburg'
      state.players[0] = createTestPlayer('red', { readyMarkers: ['Swap'] })
      state = setupCityWithOffices(state, cityName, {
        tokens: [createToken(0), createToken(1)]
      })
      
      state.context = {
        phase: 'Swap',
        player: 0,
        actions: [],
        hand: [],
        rewards: [],
        // No prev context (shouldn't happen in practice)
      }

      // Action: Execute swap (should handle gracefully)
      expect(() => {
        MarkerSwapAction(state, { city: cityName, office1: 0, office2: 1 })
      }).not.toThrow()
    })
  })
})