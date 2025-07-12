import { describe, it, expect, beforeEach } from 'vitest'
import { GameState, TokenState } from '../../game/model'
import { MarkerUseAction, MoveCollectAction, MovePlaceAction } from '../../game/actions'
import { canMoveOponnentMarkers } from '../../game/helpers'
import { 
  createTestGameState, 
  createToken,
  createTestPlayer
} from '../../test/utils'

describe('Move 3 Basic Functionality', () => {
  let state: GameState

  beforeEach(() => {
    state = createTestGameState()
  })

  describe('Move 3 marker activation', () => {
    it('should activate Move 3 marker and create Collection phase context', () => {
      // Setup: Player has Move 3 marker
      state.players[0] = createTestPlayer('red', { readyMarkers: ['Move 3'] })
      
      state.context = {
        phase: 'Actions',
        player: 0,
        actions: [],
        hand: [],
      }

      // Action: Use Move 3 marker
      const newContext = MarkerUseAction(state, { kind: 'Move 3' })

      // Assertions
      expect(newContext.phase).toBe('Collection')
      expect(newContext.player).toBe(0)
      expect(newContext.prev).toBe(state.context)
      expect(newContext.hand).toEqual([])
      expect(newContext.actions).toEqual([])
    })

    it('should consume Move 3 marker from ready markers', () => {
      // Setup
      state.players[0] = createTestPlayer('red', { 
        readyMarkers: ['Move 3', 'Office'],
        usedMarkers: []
      })
      
      state.context = {
        phase: 'Actions',
        player: 0,
        actions: [],
        hand: [],
      }

      expect(state.players[0].readyMarkers).toContain('Move 3')
      expect(state.players[0].usedMarkers).not.toContain('Move 3')

      // Action: Use Move 3 marker
      MarkerUseAction(state, { kind: 'Move 3' })

      // Assertions: Move 3 marker should be moved to used markers
      expect(state.players[0].readyMarkers).not.toContain('Move 3')
      expect(state.players[0].usedMarkers).toContain('Move 3')
      expect(state.players[0].readyMarkers).toContain('Office') // Other markers unaffected
    })

    it('should add log entry for Move 3 marker usage', () => {
      // Setup
      state.players[0] = createTestPlayer('red', { 
        readyMarkers: ['Move 3'],
        name: 'Test Player'
      })
      
      state.context = {
        phase: 'Actions',
        player: 0,
        actions: [],
        hand: [],
      }

      const initialLogLength = state.log.length

      // Action: Use Move 3 marker
      MarkerUseAction(state, { kind: 'Move 3' })

      // Assertions: Log entry should be added
      expect(state.log.length).toBeGreaterThan(initialLogLength)
      expect(state.log[state.log.length - 1]).toEqual({
        player: 0,
        message: 'Test Player uses their "Move 3" marker'
      })
    })

    it('should enable opponent token collection in Collection phase', () => {
      // Setup: Use Move 3 marker to enter Collection phase
      state.players[0] = createTestPlayer('red', { readyMarkers: ['Move 3'] })
      
      state.context = {
        phase: 'Actions',
        player: 0,
        actions: [],
        hand: [],
      }

      // Action: Use Move 3 marker
      const newContext = MarkerUseAction(state, { kind: 'Move 3' })
      
      // Need to set up the context with marker-use in previous actions for canMoveOponnentMarkers to work
      state.context = {
        ...newContext,
        prev: {
          phase: 'Actions',
          player: 0,
          actions: [{ name: 'marker-use', params: { kind: 'Move 3' } }],
          hand: [],
        }
      }

      // Assertions: Should be able to move opponent markers
      expect(canMoveOponnentMarkers(state)).toBe(true)
    })
  })

  describe('Token collection in Collection phase', () => {
    beforeEach(() => {
      // Setup: Player in Collection phase after using Move 3
      state.players[0] = createTestPlayer('red', { readyMarkers: ['Move 3'] })
      
      // Set up routes with tokens
      state.routes[0] = {
        tokens: [
          createToken(0, false), // Player 0 tradesman at [0,0]
          createToken(1, false), // Player 1 tradesman at [0,1] 
          null                   // Empty at [0,2]
        ]
      }
      
      state.context = {
        phase: 'Collection',
        player: 0,
        actions: [{ name: 'marker-use', params: { kind: 'Move 3' } }],
        hand: [],
        prev: {
          phase: 'Actions',
          player: 0,
          actions: [],
          hand: [],
        }
      }
    })

    it('should collect own tokens from routes', () => {
      // Action: Collect own token from route [0,0]
      const newContext = MoveCollectAction(state, { post: [0, 0] })

      // Assertions
      expect(state.routes[0]!.tokens[0]).toBeNull() // Token removed from route
      expect(state.context.hand).toHaveLength(1)
      expect(state.context.hand[0]).toEqual({ token: 't', owner: 0 })
      expect(newContext).toBe(state.context) // Still in Collection phase
    })

    it('should collect opponent tokens when Move 3 is active', () => {
      // Action: Collect opponent token from route [0,1]
      const newContext = MoveCollectAction(state, { post: [0, 1] })

      // Assertions
      expect(state.routes[0]!.tokens[1]).toBeNull() // Token removed from route
      expect(state.context.hand).toHaveLength(1)
      expect(state.context.hand[0]).toEqual({ token: 't', owner: 1 }) // Maintains original owner
      expect(newContext).toBe(state.context) // Still in Collection phase
    })

    it('should accumulate multiple collected tokens in hand', () => {
      // Action: Collect two tokens
      MoveCollectAction(state, { post: [0, 0] }) // Own token
      MoveCollectAction(state, { post: [0, 1] }) // Opponent token

      // Assertions
      expect(state.context.hand).toHaveLength(2)
      expect(state.context.hand[0]).toEqual({ token: 't', owner: 0 })
      expect(state.context.hand[1]).toEqual({ token: 't', owner: 1 })
      expect(state.routes[0]!.tokens[0]).toBeNull()
      expect(state.routes[0]!.tokens[1]).toBeNull()
    })

    it('should handle merchant tokens correctly', () => {
      // Setup: Route with merchant
      state.routes[0]!.tokens[0] = createToken(1, true) // Player 1 merchant

      // Action: Collect merchant token
      MoveCollectAction(state, { post: [0, 0] })

      // Assertions
      expect(state.context.hand[0]).toEqual({ token: 'm', owner: 1 })
      expect(state.routes[0]!.tokens[0]).toBeNull()
    })

    it('should add log entries for token collection', () => {
      // Setup: Give route cities names for logging
      const routeInfo = state.map.routes[0]
      const initialLogLength = state.log.length

      // Action: Collect token
      MoveCollectAction(state, { post: [0, 0] })

      // Assertions
      expect(state.log.length).toBeGreaterThan(initialLogLength)
      expect(state.log[state.log.length - 1]).toEqual({
        player: 0,
        message: expect.stringContaining('moves a tradesman from')
      })
    })
  })

  describe('Token placement in Movement phase', () => {
    beforeEach(() => {
      // Setup: Player in Collection phase with tokens in hand
      state.players[0] = createTestPlayer('red', { name: 'Test Player' })
      
      state.routes[0] = {
        tokens: [null, null, null] // Empty route for placement
      }
      
      state.context = {
        phase: 'Collection',
        player: 0,
        actions: [],
        hand: [
          { token: 't', owner: 0 },
          { token: 'm', owner: 1 }
        ],
        prev: {
          phase: 'Actions',
          player: 0,
          actions: [],
          hand: [],
        }
      }
    })

    it('should place tokens on empty trading posts', () => {
      // Action: Place first token
      const newContext = MovePlaceAction(state, { post: [0, 0] })

      // Assertions
      expect(state.routes[0]!.tokens[0]).toEqual({ owner: 0, merch: false })
      expect(state.context.hand).toHaveLength(1) // One token removed from hand
      expect(newContext.phase).toBe('Movement') // Transition to Movement phase
    })

    it('should transition from Collection to Movement phase on first placement', () => {
      // Action: Place first token
      const newContext = MovePlaceAction(state, { post: [0, 0] })

      // Assertions
      expect(newContext.phase).toBe('Movement')
      expect(newContext.hand).toHaveLength(1)
      expect(newContext.actions).toEqual([{ name: 'move-place', params: { post: [0, 0] } }])
      expect(newContext.prev).toBe(state.context.prev) // Skips Collection in prev
    })

    it('should maintain token ownership during placement', () => {
      // Action: Place opponent token that was collected
      state.context.hand = [{ token: 'm', owner: 1 }] // Only opponent merchant
      
      MovePlaceAction(state, { post: [0, 0] })

      // Assertions: Token should retain original owner
      expect(state.routes[0]!.tokens[0]).toEqual({ owner: 1, merch: true })
    })

    it('should return to previous context when all tokens are placed', () => {
      // Setup: Only one token in hand
      state.context.hand = [{ token: 't', owner: 0 }]

      // Action: Place the last token
      const newContext = MovePlaceAction(state, { post: [0, 0] })

      // Assertions: Should return to previous context (Actions phase)
      expect(newContext).toBe(state.context.prev)
      expect(state.context.hand).toHaveLength(0)
      expect(state.routes[0]!.tokens[0]).toEqual({ owner: 0, merch: false })
    })

    it('should continue in Movement phase with remaining tokens', () => {
      // Setup: Movement phase with multiple tokens
      state.context = {
        phase: 'Movement',
        player: 0,
        actions: [{ name: 'move-place', params: { post: [0, 0] } }],
        hand: [
          { token: 't', owner: 0 },
          { token: 'm', owner: 1 }
        ],
        prev: {
          phase: 'Actions',
          player: 0,
          actions: [],
          hand: [],
        }
      }

      // Action: Place token in Movement phase
      const newContext = MovePlaceAction(state, { post: [0, 1] })

      // Assertions: Should stay in Movement phase
      expect(newContext.phase).toBe('Movement')
      expect(newContext.hand).toHaveLength(1)
      expect(state.routes[0]!.tokens[1]).toEqual({ owner: 0, merch: false })
    })

    it('should add log entries for token placement', () => {
      const initialLogLength = state.log.length

      // Action: Place token
      MovePlaceAction(state, { post: [0, 0] })

      // Assertions
      expect(state.log.length).toBeGreaterThan(initialLogLength)
      expect(state.log[state.log.length - 1]).toEqual({
        player: 0,
        message: expect.stringContaining('moves a tradesman to')
      })
    })
  })

  describe('Complete Move 3 flow integration', () => {
    it('should complete full Move 3 cycle: activate → collect → place → return', () => {
      // Setup: Initial state with tokens on routes
      state.players[0] = createTestPlayer('red', { 
        readyMarkers: ['Move 3'],
        name: 'Player Red'
      })
      
      state.routes[0] = {
        tokens: [createToken(1, false), null, null] // Opponent token at [0,0]
      }
      state.routes[1] = {
        tokens: [null, null] // Empty route for placement
      }
      
      const initialContext = {
        phase: 'Actions' as const,
        player: 0,
        actions: [],
        hand: [],
      }
      state.context = initialContext

      // Step 1: Activate Move 3 marker
      const collectionContext = MarkerUseAction(state, { kind: 'Move 3' })
      expect(collectionContext.phase).toBe('Collection')
      state.context = collectionContext

      // Step 2: Collect opponent token
      MoveCollectAction(state, { post: [0, 0] })
      expect(state.context.hand).toHaveLength(1)
      expect(state.context.hand[0]).toEqual({ token: 't', owner: 1 })

      // Step 3: Place token on empty route (since only 1 token, should return to Actions)
      const finalContext = MovePlaceAction(state, { post: [1, 0] })
      expect(finalContext.phase).toBe('Actions') // Returns to original context when hand is empty

      // Verify final state
      expect(state.routes[0]!.tokens[0]).toBeNull() // Original position empty
      expect(state.routes[1]!.tokens[0]).toEqual({ owner: 1, merch: false }) // New position filled
      expect(state.players[0].usedMarkers).toContain('Move 3') // Marker consumed
      expect(state.context.hand).toHaveLength(0) // Hand empty after placement
    })
  })
})