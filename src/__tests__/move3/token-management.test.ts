import { describe, it, expect, beforeEach } from 'vitest'
import { GameState } from '../../game/model'
import { MoveCollectAction, MovePlaceAction } from '../../game/actions'
import { availableActionsCount } from '../../game/helpers'
import { 
  createTestGameState, 
  createToken,
  createTestPlayer
} from '../../test/utils'

describe('Move 3 Token Management', () => {
  let state: GameState

  beforeEach(() => {
    state = createTestGameState()
  })

  describe('Collection capacity and limits', () => {
    beforeEach(() => {
      // Setup: Collection phase after Move 3 activation
      state.context = {
        phase: 'Collection',
        player: 0,
        actions: [],
        hand: [],
        prev: {
          phase: 'Actions',
          player: 0,
          actions: [{ name: 'marker-use', params: { kind: 'Move 3' } }],
          hand: [],
        }
      }
      
      // Setup: Multiple routes with tokens
      state.routes[0] = {
        tokens: [
          createToken(1, false), // Player 1 tradesman
          createToken(2, true),  // Player 2 merchant
          createToken(1, false), // Player 1 tradesman
        ]
      }
      state.routes[1] = {
        tokens: [
          createToken(0, false), // Own tradesman
          createToken(2, false), // Player 2 tradesman
        ]
      }
    })

    it('should provide exactly 3 actions in Collection phase with Move 3', () => {
      // Check: Available actions should be 3 when Move 3 is active
      const actionCount = availableActionsCount(state)
      expect(actionCount).toBe(3)
    })

    it('should collect up to 3 tokens from various routes', () => {
      // Action: Collect 3 tokens from different routes and positions
      MoveCollectAction(state, { post: [0, 0] }) // Route 0, position 0
      MoveCollectAction(state, { post: [1, 1] }) // Route 1, position 1  
      MoveCollectAction(state, { post: [0, 1] }) // Route 0, position 1

      // Assertions: Should have collected 3 tokens
      expect(state.context.hand).toHaveLength(3)
      expect(state.context.hand[0]).toEqual({ token: 't', owner: 1 })
      expect(state.context.hand[1]).toEqual({ token: 't', owner: 2 })
      expect(state.context.hand[2]).toEqual({ token: 'm', owner: 2 })

      // Verify tokens removed from routes
      expect(state.routes[0]!.tokens[0]).toBeNull()
      expect(state.routes[0]!.tokens[1]).toBeNull()
      expect(state.routes[1]!.tokens[1]).toBeNull()
    })

    it('should collect mixed own and opponent tokens', () => {
      // Action: Collect mix of own and opponent tokens
      MoveCollectAction(state, { post: [1, 0] }) // Own token
      MoveCollectAction(state, { post: [0, 0] }) // Opponent token

      // Assertions: Both types should be in hand
      expect(state.context.hand).toHaveLength(2)
      expect(state.context.hand[0]).toEqual({ token: 't', owner: 0 }) // Own
      expect(state.context.hand[1]).toEqual({ token: 't', owner: 1 }) // Opponent
    })

    it('should handle partial collections (less than 3 tokens)', () => {
      // Action: Collect only 2 tokens
      MoveCollectAction(state, { post: [0, 0] })
      MoveCollectAction(state, { post: [0, 1] })

      // Assertions: Should work fine with partial collection
      expect(state.context.hand).toHaveLength(2)
      expect(state.context.hand[0]).toEqual({ token: 't', owner: 1 })
      expect(state.context.hand[1]).toEqual({ token: 'm', owner: 2 })
    })

    it('should maintain token order in hand (FIFO)', () => {
      // Action: Collect tokens in specific order
      MoveCollectAction(state, { post: [0, 0] }) // First: P1 tradesman
      MoveCollectAction(state, { post: [0, 1] }) // Second: P2 merchant
      MoveCollectAction(state, { post: [1, 0] }) // Third: P0 tradesman

      // Assertions: Hand should maintain collection order
      expect(state.context.hand).toEqual([
        { token: 't', owner: 1 },
        { token: 'm', owner: 2 },
        { token: 't', owner: 0 }
      ])
    })
  })

  describe('Token type preservation', () => {
    beforeEach(() => {
      state.context = {
        phase: 'Collection',
        player: 0,
        actions: [],
        hand: [],
        prev: {
          phase: 'Actions',
          player: 0,
          actions: [{ name: 'marker-use', params: { kind: 'Move 3' } }],
          hand: [],
        }
      }
    })

    it('should correctly identify and preserve tradesman tokens', () => {
      // Setup: Route with tradesman
      state.routes[0] = {
        tokens: [createToken(1, false)] // Player 1 tradesman
      }

      // Action: Collect tradesman
      MoveCollectAction(state, { post: [0, 0] })

      // Assertions: Should be identified as tradesman
      expect(state.context.hand[0]).toEqual({ token: 't', owner: 1 })
    })

    it('should correctly identify and preserve merchant tokens', () => {
      // Setup: Route with merchant
      state.routes[0] = {
        tokens: [createToken(2, true)] // Player 2 merchant
      }

      // Action: Collect merchant
      MoveCollectAction(state, { post: [0, 0] })

      // Assertions: Should be identified as merchant
      expect(state.context.hand[0]).toEqual({ token: 'm', owner: 2 })
    })

    it('should handle mixed tradesman and merchant collection', () => {
      // Setup: Route with both types
      state.routes[0] = {
        tokens: [
          createToken(1, false), // Tradesman
          createToken(1, true),  // Merchant (same player)
          createToken(2, false), // Different player tradesman
        ]
      }

      // Action: Collect all three
      MoveCollectAction(state, { post: [0, 0] })
      MoveCollectAction(state, { post: [0, 1] })
      MoveCollectAction(state, { post: [0, 2] })

      // Assertions: Should preserve all token types
      expect(state.context.hand).toEqual([
        { token: 't', owner: 1 },
        { token: 'm', owner: 1 },
        { token: 't', owner: 2 }
      ])
    })
  })

  describe('Placement mechanics', () => {
    beforeEach(() => {
      // Setup: Movement phase with various tokens in hand
      state.context = {
        phase: 'Movement',
        player: 0,
        actions: [{ name: 'move-place', params: { post: [0, 0] } }],
        hand: [
          { token: 't', owner: 1 }, // Opponent tradesman
          { token: 'm', owner: 2 }, // Opponent merchant
          { token: 't', owner: 0 }  // Own tradesman
        ],
        prev: {
          phase: 'Actions',
          player: 0,
          actions: [],
          hand: [],
        }
      }
      
      // Setup: Empty routes for placement
      state.routes[0] = { tokens: [null, null, null] }
      state.routes[1] = { tokens: [null, null] }
    })

    it('should place tokens in FIFO order (first collected, first placed)', () => {
      // Action: Place first token
      MovePlaceAction(state, { post: [0, 0] })

      // Assertions: First token in hand should be placed first
      expect(state.routes[0]!.tokens[0]).toEqual({ owner: 1, merch: false })
      expect(state.context.hand).toHaveLength(2) // Remaining tokens in hand
      expect(state.context.hand[0]).toEqual({ token: 'm', owner: 2 }) // Next token ready
    })

    it('should place all tokens maintaining their properties', () => {
      // Action: Place all three tokens
      MovePlaceAction(state, { post: [0, 0] }) // First: P1 tradesman
      state.context.phase = 'Movement' // Stay in Movement for subsequent placements
      MovePlaceAction(state, { post: [0, 1] }) // Second: P2 merchant
      MovePlaceAction(state, { post: [0, 2] }) // Third: P0 tradesman

      // Assertions: All tokens placed with correct properties
      expect(state.routes[0]!.tokens[0]).toEqual({ owner: 1, merch: false })
      expect(state.routes[0]!.tokens[1]).toEqual({ owner: 2, merch: true })
      expect(state.routes[0]!.tokens[2]).toEqual({ owner: 0, merch: false })
      expect(state.context.hand).toHaveLength(0) // Hand should be empty
    })

    it('should allow placement across multiple routes', () => {
      // Action: Place tokens on different routes
      MovePlaceAction(state, { post: [0, 0] }) // Route 0
      state.context.phase = 'Movement'
      MovePlaceAction(state, { post: [1, 0] }) // Route 1
      MovePlaceAction(state, { post: [0, 1] }) // Back to Route 0

      // Assertions: Tokens placed on multiple routes
      expect(state.routes[0]!.tokens[0]).toEqual({ owner: 1, merch: false })
      expect(state.routes[1]!.tokens[0]).toEqual({ owner: 2, merch: true })
      expect(state.routes[0]!.tokens[1]).toEqual({ owner: 0, merch: false })
    })

    it('should transition properly between Collection and Movement phases', () => {
      // Setup: Start in Collection phase with multiple tokens
      state.context = {
        phase: 'Collection',
        player: 0,
        actions: [],
        hand: [
          { token: 't', owner: 1 },
          { token: 'm', owner: 2 }  // Multiple tokens so hand won't be empty
        ],
        prev: {
          phase: 'Actions',
          player: 0,
          actions: [],
          hand: [],
        }
      }

      // Action: Place first token (should transition to Movement)
      const movementContext = MovePlaceAction(state, { post: [0, 0] })

      // Assertions: Should transition to Movement phase
      expect(movementContext.phase).toBe('Movement')
      expect(movementContext.actions).toEqual([{ name: 'move-place', params: { post: [0, 0] } }])
      expect(movementContext.prev).toBe(state.context.prev) // Skip Collection in prev
    })
  })

  describe('Route state management', () => {
    it('should correctly update route state after token removal', () => {
      // Setup: Populated route
      const originalTokens = [
        createToken(1, false),
        createToken(2, true),
        createToken(0, false)
      ]
      state.routes[0] = { tokens: [...originalTokens] }
      
      state.context = {
        phase: 'Collection',
        player: 0,
        actions: [],
        hand: [],
        prev: {
          phase: 'Actions',
          player: 0,
          actions: [{ name: 'marker-use', params: { kind: 'Move 3' } }],
          hand: [],
        }
      }

      // Action: Remove middle token
      MoveCollectAction(state, { post: [0, 1] })

      // Assertions: Route should have null in removed position
      expect(state.routes[0]!.tokens[0]).toEqual(originalTokens[0]) // Unchanged
      expect(state.routes[0]!.tokens[1]).toBeNull() // Removed
      expect(state.routes[0]!.tokens[2]).toEqual(originalTokens[2]) // Unchanged
    })

    it('should correctly update route state after token placement', () => {
      // Setup: Empty route and token to place
      state.routes[0] = { tokens: [null, null, null] }
      state.context = {
        phase: 'Movement',
        player: 0,
        actions: [],
        hand: [{ token: 'm', owner: 2 }],
        prev: {
          phase: 'Actions',
          player: 0,
          actions: [],
          hand: [],
        }
      }

      // Action: Place token
      MovePlaceAction(state, { post: [0, 1] }) // Middle position

      // Assertions: Token should be placed in correct position
      expect(state.routes[0]!.tokens[0]).toBeNull() // Still empty
      expect(state.routes[0]!.tokens[1]).toEqual({ owner: 2, merch: true }) // Placed
      expect(state.routes[0]!.tokens[2]).toBeNull() // Still empty
    })

    it('should handle multiple token movements on same route', () => {
      // Setup: Route with tokens
      state.routes[0] = {
        tokens: [createToken(1, false), createToken(2, true), null]
      }
      
      state.context = {
        phase: 'Collection',
        player: 0,
        actions: [],
        hand: [],
        prev: {
          phase: 'Actions',
          player: 0,
          actions: [{ name: 'marker-use', params: { kind: 'Move 3' } }],
          hand: [],
        }
      }

      // Action: Collect both tokens from route
      MoveCollectAction(state, { post: [0, 0] })
      MoveCollectAction(state, { post: [0, 1] })

      // Verify collection
      expect(state.routes[0]!.tokens[0]).toBeNull()
      expect(state.routes[0]!.tokens[1]).toBeNull()
      expect(state.context.hand).toHaveLength(2)

      // Action: Place them back in different positions
      const movementContext = MovePlaceAction(state, { post: [0, 2] }) // Place first token at end
      state.context = movementContext
      MovePlaceAction(state, { post: [0, 0] }) // Place second token at start

      // Assertions: Tokens should be rearranged
      expect(state.routes[0]!.tokens[0]).toEqual({ owner: 2, merch: true }) // Second collected, second placed
      expect(state.routes[0]!.tokens[1]).toBeNull() // Empty
      expect(state.routes[0]!.tokens[2]).toEqual({ owner: 1, merch: false }) // First collected, first placed
    })
  })

  describe('Hand management edge cases', () => {
    it('should handle empty hand gracefully', () => {
      // Setup: Movement phase with empty hand
      state.context = {
        phase: 'Movement',
        player: 0,
        actions: [],
        hand: [], // Empty hand
        prev: {
          phase: 'Actions',
          player: 0,
          actions: [],
          hand: [],
        }
      }

      // Action: Try to place token from empty hand (should throw)
      expect(() => {
        MovePlaceAction(state, { post: [0, 0] })
      }).toThrow()
    })

    it('should return to previous context when hand becomes empty', () => {
      // Setup: Movement phase with one token
      const previousContext = {
        phase: 'Actions' as const,
        player: 0,
        actions: [],
        hand: [],
      }
      
      state.context = {
        phase: 'Movement',
        player: 0,
        actions: [{ name: 'move-place', params: { post: [0, 0] } }],
        hand: [{ token: 't', owner: 1 }], // Only one token
        prev: previousContext
      }
      
      state.routes[0] = { tokens: [null] }

      // Action: Place the last token
      const returnedContext = MovePlaceAction(state, { post: [0, 0] })

      // Assertions: Should return to previous context
      expect(returnedContext).toBe(previousContext)
      expect(state.context.hand).toHaveLength(0)
      expect(state.routes[0]!.tokens[0]).toEqual({ owner: 1, merch: false })
    })

    it('should preserve hand state during multiple collections', () => {
      // Setup: Collection phase
      state.context = {
        phase: 'Collection',
        player: 0,
        actions: [],
        hand: [],
        prev: {
          phase: 'Actions',
          player: 0,
          actions: [{ name: 'marker-use', params: { kind: 'Move 3' } }],
          hand: [],
        }
      }
      
      state.routes[0] = {
        tokens: [createToken(1, false), createToken(2, true)]
      }

      // Action: Collect tokens one by one, checking hand state
      MoveCollectAction(state, { post: [0, 0] })
      expect(state.context.hand).toEqual([{ token: 't', owner: 1 }])

      MoveCollectAction(state, { post: [0, 1] })
      expect(state.context.hand).toEqual([
        { token: 't', owner: 1 },
        { token: 'm', owner: 2 }
      ])

      // Verify tokens were properly removed from route
      expect(state.routes[0]!.tokens[0]).toBeNull()
      expect(state.routes[0]!.tokens[1]).toBeNull()
    })
  })
})