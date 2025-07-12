import { describe, it, expect, beforeEach } from 'vitest'
import { GameState } from '../../game/model'
import { MarkerUseAction, MarkerSwapAction } from '../../game/actions'
import { 
  createTestGameState, 
  setupCityWithOffices, 
  createToken,
  createTestPlayer
} from '../../test/utils'

describe('Swap Office Basic Functionality', () => {
  let state: GameState

  beforeEach(() => {
    state = createTestGameState()
  })

  describe('Swap marker activation', () => {
    it('should activate Swap marker and create Swap phase context', () => {
      // Setup: Player has Swap marker and city with adjacent offices
      const cityName = 'Hamburg'
      state.players[0] = createTestPlayer('red', { readyMarkers: ['Swap'] })
      state = setupCityWithOffices(state, cityName, {
        tokens: [createToken(0), createToken(1)] // Two adjacent offices
      })
      
      state.context = {
        phase: 'Actions',
        player: 0,
        actions: [],
        hand: [],
      }

      // Action: Use Swap marker
      const newContext = MarkerUseAction(state, { kind: 'Swap' })

      // Assertions
      expect(newContext.phase).toBe('Swap')
      expect(newContext.player).toBe(0)
      expect(newContext.prev).toBe(state.context)
      expect(newContext.rewards).toHaveLength(1)
      expect(newContext.rewards![0]!.title).toBe('Swap offices in Hamburg')
      expect(newContext.rewards![0]!.action).toEqual({
        name: 'marker-swap',
        params: { city: cityName, office1: 0, office2: 1 }
      })
    })

    it('should generate rewards for all valid swap pairs across multiple cities', () => {
      // Setup: Multiple cities with adjacent offices
      state.players[0] = createTestPlayer('red', { readyMarkers: ['Swap'] })
      
      state = setupCityWithOffices(state, 'Hamburg', {
        tokens: [createToken(0), createToken(1)] // One pair
      })
      state = setupCityWithOffices(state, 'Bremen', {
        tokens: [createToken(0), createToken(1), createToken(2)] // Two pairs
      })
      
      state.context = {
        phase: 'Actions',
        player: 0,
        actions: [],
        hand: [],
      }

      // Action: Use Swap marker
      const newContext = MarkerUseAction(state, { kind: 'Swap' })

      // Assertions: Should have 3 total rewards (1 from Hamburg, 2 from Bremen)
      expect(newContext.rewards).toHaveLength(3)
      
      const hamburgReward = newContext.rewards!.find(r => r.title.includes('Hamburg'))
      const bremenRewards = newContext.rewards!.filter(r => r.title.includes('Bremen'))
      
      expect(hamburgReward).toBeDefined()
      expect(bremenRewards).toHaveLength(2)
    })

    it('should handle no valid swap pairs gracefully', () => {
      // Setup: Player has Swap marker but no adjacent offices
      state.players[0] = createTestPlayer('red', { readyMarkers: ['Swap'] })
      state = setupCityWithOffices(state, 'Hamburg', {
        tokens: [createToken(0)] // Only one office
      })
      
      state.context = {
        phase: 'Actions',
        player: 0,
        actions: [],
        hand: [],
      }

      const initialLogLength = state.log.length

      // Action: Use Swap marker
      const newContext = MarkerUseAction(state, { kind: 'Swap' })

      // Assertions: Should return same context and log message
      expect(newContext).toBe(state.context)
      expect(state.log.length).toBeGreaterThan(initialLogLength)
      expect(state.log[state.log.length - 1]).toEqual({
        player: 0,
        message: expect.stringContaining('cannot use Swap marker - no valid office pairs available')
      })
    })
  })

  describe('Office swapping execution', () => {
    it('should successfully swap two adjacent offices', () => {
      // Setup: Swap phase context with valid pair
      const cityName = 'Hamburg'
      state.players[0] = createTestPlayer('red', { readyMarkers: ['Swap'] })
      state = setupCityWithOffices(state, cityName, {
        tokens: [createToken(0), createToken(1)] // Player 0 and Player 1 offices
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

      const originalOffice1 = state.cities[cityName].tokens[0]
      const originalOffice2 = state.cities[cityName].tokens[1]

      // Action: Execute swap
      const newContext = MarkerSwapAction(state, { 
        city: cityName, 
        office1: 0, 
        office2: 1 
      })

      // Assertions: Offices should be swapped
      expect(state.cities[cityName].tokens[0]).toEqual(originalOffice2)
      expect(state.cities[cityName].tokens[1]).toEqual(originalOffice1)
      expect(newContext).toBe(state.context.prev)
    })

    it('should consume Swap marker from ready markers', () => {
      // Setup
      const cityName = 'Hamburg'
      state.players[0] = createTestPlayer('red', { readyMarkers: ['Swap', 'Office'] })
      state = setupCityWithOffices(state, cityName, {
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

      expect(state.players[0].readyMarkers).toContain('Swap')
      expect(state.players[0].usedMarkers).not.toContain('Swap')

      // Action: Execute swap
      MarkerSwapAction(state, { city: cityName, office1: 0, office2: 1 })

      // Assertions: Swap marker should be moved to used markers
      expect(state.players[0].readyMarkers).not.toContain('Swap')
      expect(state.players[0].usedMarkers).toContain('Swap')
      expect(state.players[0].readyMarkers).toContain('Office') // Other markers unaffected
    })

    it('should add log entry for swap action', () => {
      // Setup
      const cityName = 'Hamburg'
      state.players[0] = createTestPlayer('red', { 
        readyMarkers: ['Swap'],
        name: 'Test Player'
      })
      state = setupCityWithOffices(state, cityName, {
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

      const initialLogLength = state.log.length

      // Action: Execute swap
      MarkerSwapAction(state, { city: cityName, office1: 0, office2: 1 })

      // Assertions: Log entry should be added
      expect(state.log).toHaveLength(initialLogLength + 1)
      expect(state.log[state.log.length - 1]).toEqual({
        player: 0,
        message: `Test Player uses Swap marker to switch two offices in ${cityName}`
      })
    })

    it('should return to previous context after swap', () => {
      // Setup
      const cityName = 'Hamburg'
      state.players[0] = createTestPlayer('red', { readyMarkers: ['Swap'] })
      state = setupCityWithOffices(state, cityName, {
        tokens: [createToken(0), createToken(1)]
      })
      
      const prevContext = {
        phase: 'Actions' as const,
        player: 0,
        actions: [],
        hand: [],
      }
      
      state.context = {
        phase: 'Swap',
        player: 0,
        actions: [],
        hand: [],
        rewards: [],
        prev: prevContext
      }

      // Action: Execute swap
      const newContext = MarkerSwapAction(state, { city: cityName, office1: 0, office2: 1 })

      // Assertions: Should return to previous context
      expect(newContext).toBe(prevContext)
    })
  })

  describe('Integration with complex office layouts', () => {
    it('should handle swapping with left offices and extras present', () => {
      // Setup: City with left offices, extras, and regular offices
      const cityName = 'Hamburg'
      state.players[0] = createTestPlayer('red', { readyMarkers: ['Swap'] })
      state = setupCityWithOffices(state, cityName, {
        leftOffices: [createToken(2), createToken(1)], // 2 left offices (indices 0-1)
        extras: [createToken(0)], // 1 extra office (index 2)
        tokens: [createToken(0), createToken(1)] // 2 regular offices (indices 3-4)
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

      const originalRegularOffice1 = state.cities[cityName].tokens[0]
      const originalRegularOffice2 = state.cities[cityName].tokens[1]

      // Action: Swap the regular offices (indices 3 and 4 in the full layout)
      MarkerSwapAction(state, { city: cityName, office1: 3, office2: 4 })

      // Assertions: Only regular offices should be swapped
      expect(state.cities[cityName].leftOffices).toHaveLength(2) // Unchanged
      expect(state.cities[cityName].extras).toHaveLength(1) // Unchanged
      expect(state.cities[cityName].tokens[0]).toEqual(originalRegularOffice2)
      expect(state.cities[cityName].tokens[1]).toEqual(originalRegularOffice1)
    })
  })
})