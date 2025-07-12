import { describe, it, expect, beforeEach } from 'vitest'
import { GameState } from '../../game/model'
import { MarkerUseAction, MarkerSwapAction } from '../../game/actions'
// import { hasNoSwappableOffice } from '../../game/helpers' // Not exported
import { 
  createTestGameState, 
  setupCityWithOffices, 
  createToken,
  createTestPlayer,
  createRouteCompletionState
} from '../../test/utils'

describe('Swap Office Edge Cases & Integration', () => {
  let state: GameState

  beforeEach(() => {
    state = createTestGameState()
  })

  describe('No valid swap scenarios', () => {
    it('should handle empty cities gracefully', () => {
      // Setup: Player has Swap marker but all cities are empty
      state.players[0] = createTestPlayer('red', { readyMarkers: ['Swap'] })
      // All cities start empty by default
      
      state.context = {
        phase: 'Actions',
        player: 0,
        actions: [],
        hand: [],
      }

      const initialLogLength = state.log.length

      // Action: Try to use Swap marker
      const newContext = MarkerUseAction(state, { kind: 'Swap' })

      // Assertions: Should return same context with log message
      expect(newContext).toBe(state.context)
      expect(state.log.length).toBeGreaterThan(initialLogLength)
      expect(state.log[state.log.length - 1].message).toContain('no valid office pairs available')
    })

    it('should handle cities with only single offices', () => {
      // Setup: Multiple cities but each has only one office
      state.players[0] = createTestPlayer('red', { readyMarkers: ['Swap'] })
      state = setupCityWithOffices(state, 'Hamburg', {
        tokens: [createToken(0)] // Single office
      })
      state = setupCityWithOffices(state, 'Bremen', {
        tokens: [createToken(1)] // Single office
      })
      
      state.context = {
        phase: 'Actions',
        player: 0,
        actions: [],
        hand: [],
      }

      // Action: Try to use Swap marker
      const newContext = MarkerUseAction(state, { kind: 'Swap' })

      // Assertions: No adjacent pairs possible
      expect(newContext).toBe(state.context)
      expect(state.log[state.log.length - 1].message).toContain('no valid office pairs available')
    })

    it('should handle cities with only non-swappable offices', () => {
      // Setup: Cities with only left offices and extras
      state.players[0] = createTestPlayer('red', { readyMarkers: ['Swap'] })
      state = setupCityWithOffices(state, 'Hamburg', {
        leftOffices: [createToken(0), createToken(1)],
        extras: [createToken(2)],
        tokens: [] // No regular offices
      })
      
      state.context = {
        phase: 'Actions',
        player: 0,
        actions: [],
        hand: [],
      }

      // Action: Try to use Swap marker
      const newContext = MarkerUseAction(state, { kind: 'Swap' })

      // Assertions: No swappable offices available
      expect(newContext).toBe(state.context)
      expect(state.log[state.log.length - 1].message).toContain('no valid office pairs available')
    })
  })

  describe('Complex city layouts', () => {
    it('should correctly handle mixed office types with gaps', () => {
      // Setup: Complex layout with various office types
      const cityName = 'Hamburg'
      state.players[0] = createTestPlayer('red', { readyMarkers: ['Swap'] })
      state = setupCityWithOffices(state, cityName, {
        leftOffices: [createToken(2), createToken(1)], // Indices 0-1
        extras: [createToken(0), createToken(1), createToken(2)], // Indices 2-4
        tokens: [createToken(0), createToken(1), createToken(2), createToken(0)] // Indices 5-8
      })
      
      state.context = {
        phase: 'Actions',
        player: 0,
        actions: [],
        hand: [],
      }

      // Action: Use Swap marker
      const newContext = MarkerUseAction(state, { kind: 'Swap' })

      // Assertions: Should only find pairs among regular offices (indices 5-8)
      expect(newContext.phase).toBe('Swap')
      expect(newContext.rewards).toHaveLength(3) // Three adjacent pairs: (5,6), (6,7), (7,8)
      
      const rewards = newContext.rewards!
      expect(rewards[0]!.action.params).toEqual({ city: cityName, office1: 5, office2: 6 })
      expect(rewards[1]!.action.params).toEqual({ city: cityName, office1: 6, office2: 7 })
      expect(rewards[2]!.action.params).toEqual({ city: cityName, office1: 7, office2: 8 })
    })

    it('should handle swapping in one city while others have no valid pairs', () => {
      // Setup: Mixed scenario across cities
      state.players[0] = createTestPlayer('red', { readyMarkers: ['Swap'] })
      
      // Hamburg: Has swappable offices
      state = setupCityWithOffices(state, 'Hamburg', {
        tokens: [createToken(0), createToken(1)]
      })
      
      // Bremen: Only left offices
      state = setupCityWithOffices(state, 'Bremen', {
        leftOffices: [createToken(0), createToken(1)],
        tokens: []
      })
      
      // Cologne: Single office
      state = setupCityWithOffices(state, 'Cologne', {
        tokens: [createToken(2)]
      })
      
      state.context = {
        phase: 'Actions',
        player: 0,
        actions: [],
        hand: [],
      }

      // Action: Use Swap marker
      const newContext = MarkerUseAction(state, { kind: 'Swap' })

      // Assertions: Should only find pairs in Hamburg
      expect(newContext.phase).toBe('Swap')
      expect(newContext.rewards).toHaveLength(1)
      expect(newContext.rewards![0]!.title).toBe('Swap offices in Hamburg')
    })
  })

  describe('Integration with game flow', () => {
    it('should work when used during Actions phase', () => {
      // Setup: Standard Actions phase
      state.players[0] = createTestPlayer('red', { 
        readyMarkers: ['Swap'],
        actions: 2 
      })
      state = setupCityWithOffices(state, 'Hamburg', {
        tokens: [createToken(0), createToken(1)]
      })
      
      state.context = {
        phase: 'Actions',
        player: 0,
        actions: [],
        hand: [],
      }

      // Action: Use Swap marker (doesn't consume action)
      const newContext = MarkerUseAction(state, { kind: 'Swap' })

      // Assertions: Should transition to Swap phase
      expect(newContext.phase).toBe('Swap')
      expect(state.players[0].actions).toBe(2) // Actions unchanged (marker use is free)
    })

    it('should preserve game state after swap completion', () => {
      // Setup: Game state with various elements
      const cityName = 'Hamburg'
      state.players[0] = createTestPlayer('red', { 
        readyMarkers: ['Swap', 'Office'],
        actions: 1,
        keys: 3,
        points: 10
      })
      state = setupCityWithOffices(state, cityName, {
        tokens: [createToken(0), createToken(1)]
      })
      
      state.turn = 5
      state.log = [{ player: 0, message: 'Previous action' }]
      
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

      const initialState = {
        turn: state.turn,
        playerActions: state.players[0].actions,
        playerKeys: state.players[0].keys,
        playerPoints: state.players[0].points,
        logLength: state.log.length
      }

      // Action: Execute swap
      const newContext = MarkerSwapAction(state, { city: cityName, office1: 0, office2: 1 })

      // Assertions: Game state should be preserved except for swap effects
      expect(state.turn).toBe(initialState.turn)
      expect(state.players[0].actions).toBe(initialState.playerActions)
      expect(state.players[0].keys).toBe(initialState.playerKeys)
      expect(state.players[0].points).toBe(initialState.playerPoints)
      expect(state.log).toHaveLength(initialState.logLength + 1) // Only swap log added
      expect(newContext.phase).toBe('Actions') // Returned to previous context
    })

    it('should work as route completion reward', () => {
      // Setup: Route completion scenario where Swap marker is gained
      const routeIndex = 0
      state = createRouteCompletionState(routeIndex, [
        { token: 't', owner: 0 }
      ])
      
      // Simulate gaining Swap marker during route completion
      state.players[0].readyMarkers = ['Swap']
      state = setupCityWithOffices(state, 'Hamburg', {
        tokens: [createToken(0), createToken(1)]
      })

      // Player could use Swap marker immediately after gaining it
      const swapContext = MarkerUseAction(state, { kind: 'Swap' })
      
      // Assertions: Should work even during route completion context
      expect(swapContext.phase).toBe('Swap')
      expect(swapContext.prev).toBe(state.context) // Should preserve route context
    })
  })

  describe('Swap availability checking', () => {
    it('should generate no rewards when no swappable offices exist', () => {
      // Setup: Player with no valid swap options
      state.players[0] = createTestPlayer('red', { readyMarkers: ['Swap'] })
      
      // Only single offices in cities
      state = setupCityWithOffices(state, 'Hamburg', {
        tokens: [createToken(0)]
      })
      state = setupCityWithOffices(state, 'Bremen', {
        leftOffices: [createToken(0)]
      })
      
      state.context = {
        phase: 'Actions',
        player: 0,
        actions: [],
        hand: [],
      }

      // Check: Should return same context (no rewards)
      const newContext = MarkerUseAction(state, { kind: 'Swap' })
      expect(newContext).toBe(state.context)
    })

    it('should generate rewards when swappable offices exist', () => {
      // Setup: Player with valid swap options
      state.players[0] = createTestPlayer('red', { readyMarkers: ['Swap'] })
      state = setupCityWithOffices(state, 'Hamburg', {
        tokens: [createToken(0), createToken(1)]
      })
      
      state.context = {
        phase: 'Actions',
        player: 0,
        actions: [],
        hand: [],
      }

      // Check: Should generate Swap phase with rewards
      const newContext = MarkerUseAction(state, { kind: 'Swap' })
      expect(newContext.phase).toBe('Swap')
      expect(newContext.rewards).toHaveLength(1)
    })
  })

  describe('Multiple marker interactions', () => {
    it('should not affect other markers when Swap is used', () => {
      // Setup: Player with multiple markers
      state.players[0] = createTestPlayer('red', { 
        readyMarkers: ['Swap', 'Office', 'Upgrade'],
        usedMarkers: ['3 Actions']
      })
      state = setupCityWithOffices(state, 'Hamburg', {
        tokens: [createToken(0), createToken(1)]
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

      // Action: Use swap
      MarkerSwapAction(state, { city: 'Hamburg', office1: 0, office2: 1 })

      // Assertions: Only Swap marker should be affected
      expect(state.players[0].readyMarkers).toEqual(['Office', 'Upgrade'])
      expect(state.players[0].usedMarkers).toEqual(['3 Actions', 'Swap'])
    })

    it('should work when player has no Swap marker (error handling)', () => {
      // Setup: Player without Swap marker tries to swap
      state.players[0] = createTestPlayer('red', { 
        readyMarkers: ['Office'],
        usedMarkers: ['Swap'] // Already used
      })
      state = setupCityWithOffices(state, 'Hamburg', {
        tokens: [createToken(0), createToken(1)]
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

      // Action: Try to swap (should handle gracefully)
      const newContext = MarkerSwapAction(state, { city: 'Hamburg', office1: 0, office2: 1 })

      // Assertions: Should still perform swap but not move marker
      expect(state.cities.Hamburg.tokens[0]).toEqual(createToken(1))
      expect(state.cities.Hamburg.tokens[1]).toEqual(createToken(0))
      expect(state.players[0].readyMarkers).toEqual(['Office'])
      expect(state.players[0].usedMarkers).toEqual(['Swap'])
      expect(newContext.phase).toBe('Actions')
    })
  })

  describe('Strategic scenarios', () => {
    it('should enable city control changes through strategic swapping', () => {
      // Setup: Strategic scenario where swap affects city control
      const cityName = 'Hamburg'
      state.players[0] = createTestPlayer('red', { readyMarkers: ['Swap'] })
      
      // City layout: Player 0 has position 0, Player 1 has positions 1-2
      // After swap: Player 1 could have better positioning
      state = setupCityWithOffices(state, cityName, {
        tokens: [
          createToken(0, false), // Player 0 tradesman (privilege 1 space)
          createToken(1, true),  // Player 1 merchant (privilege 2 space) 
          createToken(1, false)  // Player 1 tradesman (privilege 1 space)
        ]
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

      const originalLayout = [...state.cities[cityName].tokens]

      // Action: Player 0 swaps positions 0 and 1 (putting Player 1's merchant first)
      MarkerSwapAction(state, { city: cityName, office1: 0, office2: 1 })

      // Assertions: Layout should change
      expect(state.cities[cityName].tokens[0]).toEqual(originalLayout[1])
      expect(state.cities[cityName].tokens[1]).toEqual(originalLayout[0])
      expect(state.cities[cityName].tokens[2]).toEqual(originalLayout[2])
      
      // This could affect city control calculations depending on privilege requirements
    })

    it('should work with maximum city office capacity', () => {
      // Setup: City at maximum capacity
      const cityName = 'Hamburg'
      state.players[0] = createTestPlayer('red', { readyMarkers: ['Swap'] })
      
      // Assuming max capacity based on typical board game mechanics
      const maxOffices = Array(10).fill(null).map((_, i) => createToken(i % 3))
      state = setupCityWithOffices(state, cityName, {
        tokens: maxOffices
      })
      
      state.context = {
        phase: 'Actions',
        player: 0,
        actions: [],
        hand: [],
      }

      // Action: Use Swap marker
      const newContext = MarkerUseAction(state, { kind: 'Swap' })

      // Assertions: Should find all adjacent pairs (9 pairs for 10 offices)
      expect(newContext.phase).toBe('Swap')
      expect(newContext.rewards).toHaveLength(9)
    })
  })
})