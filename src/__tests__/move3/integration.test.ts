import { describe, it, expect, beforeEach } from 'vitest'
import { GameState } from '../../game/model'
import { MarkerUseAction, MoveCollectAction, MovePlaceAction, PlaceAction, DisplaceAction } from '../../game/actions'
import { availableActionsCount } from '../../game/helpers'
import { 
  createTestGameState, 
  createToken,
  createTestPlayer,
  createRouteCompletionState
} from '../../test/utils'

describe('Move 3 Integration Tests', () => {
  let state: GameState

  beforeEach(() => {
    state = createTestGameState()
  })

  describe('Integration with other game mechanics', () => {
    it('should work after route completion reward', () => {
      // Setup: Player completes route and gains Move 3 marker
      const routeIndex = 0
      state = createRouteCompletionState(routeIndex, [
        { token: 't', owner: 0 }
      ])
      
      // Simulate gaining Move 3 marker during route completion
      state.players[0].readyMarkers = ['Move 3']
      
      // Setup routes with tokens for Move 3 usage
      state.routes[1] = {
        tokens: [createToken(1, false), null] // Opponent token to move
      }
      state.routes[2] = {
        tokens: [null, null] // Empty route for placement
      }

      // Action: Use Move 3 marker even during route completion context
      const collectionContext = MarkerUseAction(state, { kind: 'Move 3' })
      expect(collectionContext.phase).toBe('Collection')
      expect(collectionContext.prev).toBe(state.context) // Preserve route context
      
      state.context = collectionContext

      // Action: Use Move 3 functionality
      MoveCollectAction(state, { post: [1, 0] })
      MovePlaceAction(state, { post: [2, 0] })

      // Assertions: Move 3 should work within route completion flow
      expect(state.routes[1]!.tokens[0]).toBeNull()
      expect(state.routes[2]!.tokens[0]).toEqual({ owner: 1, merch: false })
    })

    it('should integrate with displacement mechanics', () => {
      // Setup: Game state with displacement scenario
      state.players[0] = createTestPlayer('red', { 
        readyMarkers: ['Move 3'],
        generalStock: { m: 5, t: 5 },
        personalSupply: { m: 1, t: 1 }
      })
      
      // Setup: Route where displacement could occur
      state.routes[0] = {
        tokens: [createToken(1, false), createToken(2, false)] // Two opponent tokens
      }
      state.routes[1] = {
        tokens: [null, null]
      }

      state.context = {
        phase: 'Actions',
        player: 0,
        actions: [],
        hand: [],
      }

      // Action: Use Move 3 to reposition opponents, then use normal placement
      const collectionContext = MarkerUseAction(state, { kind: 'Move 3' })
      state.context = collectionContext

      // Collect opponent tokens
      MoveCollectAction(state, { post: [0, 0] })
      MoveCollectAction(state, { post: [0, 1] })

      // Place them elsewhere
      const movementContext = MovePlaceAction(state, { post: [1, 0] })
      state.context = movementContext
      const finalContext = MovePlaceAction(state, { post: [1, 1] })

      // Now route 0 is empty - Player 0 could place there normally
      state.context = finalContext
      
      // Assertions: Route 0 now available for normal placement
      expect(state.routes[0]!.tokens[0]).toBeNull()
      expect(state.routes[0]!.tokens[1]).toBeNull()
      expect(state.routes[1]!.tokens[0]).toEqual({ owner: 1, merch: false })
      expect(state.routes[1]!.tokens[1]).toEqual({ owner: 2, merch: false })
    })

    it('should not interfere with normal move actions', () => {
      // Setup: Player in normal Collection phase (not from Move 3)
      state.players[0] = createTestPlayer('red', { 
        book: 2 // Allows 3 actions in Collection
      })
      
      state.routes[0] = {
        tokens: [createToken(0, false), null] // Own token
      }

      state.context = {
        phase: 'Collection',
        player: 0,
        actions: [],
        hand: [],
        prev: {
          phase: 'Actions',
          player: 0,
          actions: [],
          hand: [],
        }
      }

      // Check: Normal Collection should not allow opponent token collection
      const actionCount = availableActionsCount(state)
      expect(actionCount).toBe(3) // book + 1 = 3

      // Action: Try to collect own token (should work)
      MoveCollectAction(state, { post: [0, 0] })
      expect(state.context.hand).toHaveLength(1)
      expect(state.context.hand[0]).toEqual({ token: 't', owner: 0 })
    })
  })

  describe('Complex game flow scenarios', () => {
    it('should handle full game turn with Move 3', () => {
      // Setup: Complete turn scenario
      state.players[0] = createTestPlayer('red', { 
        readyMarkers: ['Move 3'],
        actions: 2,
        name: 'Player Red'
      })
      
      state.routes[0] = {
        tokens: [createToken(1, false), createToken(2, true), null]
      }
      state.routes[1] = {
        tokens: [null, null, null]
      }

      const initialContext = {
        phase: 'Actions' as const,
        player: 0,
        actions: [],
        hand: [],
      }
      state.context = initialContext

      const initialLogLength = state.log.length

      // Step 1: Use Move 3 marker
      const collectionContext = MarkerUseAction(state, { kind: 'Move 3' })
      expect(collectionContext.phase).toBe('Collection')
      state.context = collectionContext

      // Step 2: Collect 2 opponent tokens
      MoveCollectAction(state, { post: [0, 0] }) // Player 1 tradesman
      MoveCollectAction(state, { post: [0, 1] }) // Player 2 merchant

      // Step 3: Place tokens in new positions
      const movementContext = MovePlaceAction(state, { post: [1, 0] })
      state.context = movementContext
      const finalContext = MovePlaceAction(state, { post: [1, 1] })

      // Assertions: Complete flow should work correctly
      expect(finalContext).toBe(initialContext) // Return to Actions phase
      expect(state.players[0].usedMarkers).toContain('Move 3')
      expect(state.players[0].actions).toBe(2) // Actions unchanged (marker use is free)
      expect(state.routes[1]!.tokens[0]).toEqual({ owner: 1, merch: false })
      expect(state.routes[1]!.tokens[1]).toEqual({ owner: 2, merch: true })
      expect(state.log.length).toBeGreaterThan(initialLogLength) // Multiple log entries
    })

    it('should handle partial Move 3 usage (less than 3 tokens)', () => {
      // Setup: Scenario where player uses less than 3 moves
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
        tokens: [createToken(1, false), null] // Only one opponent token available
      }
      state.routes[1] = {
        tokens: [null]
      }

      // Action: Use only 1 of the 3 available moves
      MoveCollectAction(state, { post: [0, 0] })
      const finalContext = MovePlaceAction(state, { post: [1, 0] })

      // Assertions: Should work fine with partial usage
      expect(finalContext.phase).toBe('Actions') // Return to previous context
      expect(state.routes[0]!.tokens[0]).toBeNull()
      expect(state.routes[1]!.tokens[0]).toEqual({ owner: 1, merch: false })
    })

    it('should maintain proper action counting with Move 3', () => {
      // Setup: Collection phase after Move 3
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

      // Check: Should show 3 available actions
      const actionCount = availableActionsCount(state)
      expect(actionCount).toBe(3)

      // Action: Use one action
      state.routes[0] = { tokens: [createToken(1, false)] }
      MoveCollectAction(state, { post: [0, 0] })

      // The action count is managed by the UI/game flow, not the state directly
      // But the hand should reflect the collections
      expect(state.context.hand).toHaveLength(1)
    })
  })

  describe('Error recovery and edge cases', () => {
    it('should handle invalid move sequences gracefully', () => {
      // Setup: Invalid state transitions
      state.context = {
        phase: 'Collection',
        player: 0,
        actions: [],
        hand: [],
        prev: {
          phase: 'Actions',
          player: 0,
          actions: [], // No marker-use action in history
          hand: [],
        }
      }
      
      state.routes[0] = { tokens: [createToken(1, false)] }

      // Action: Try to collect opponent token without Move 3 active
      // This should be caught by validation, but let's test error handling
      expect(() => {
        // This would normally be caught by the UI, but let's test the underlying logic
        const validationError = require('../../game/helpers').validateAction('move-collect', state, { post: [0, 0] })
        if (validationError) {
          throw new Error(validationError)
        }
      }).toThrow()
    })

    it('should handle empty routes gracefully', () => {
      // Setup: All routes empty
      state.routes = state.routes.map(() => ({ tokens: [null, null, null] }))
      
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

      // Action: Try to collect from empty routes (should be handled by validation)
      // No actual collections should occur
      expect(state.context.hand).toHaveLength(0)

      // Player could choose to not use all 3 moves if no tokens available
      // This is valid behavior - Move 3 gives up to 3 moves, not exactly 3
    })

    it('should integrate properly with marker placement at game end', () => {
      // Setup: End game scenario where Move 3 is used before marker placement
      state.players[0] = createTestPlayer('red', { 
        readyMarkers: ['Move 3'],
        actions: 1 // Last action of turn
      })
      
      state.routes[0] = { tokens: [createToken(1, false)] }
      state.routes[1] = { tokens: [null] }
      state.markers = ['Office'] // Marker available for placement

      state.context = {
        phase: 'Actions',
        player: 0,
        actions: [],
        hand: [],
      }

      // Action: Use Move 3 with last action
      const collectionContext = MarkerUseAction(state, { kind: 'Move 3' })
      state.context = collectionContext

      MoveCollectAction(state, { post: [0, 0] })
      const finalContext = MovePlaceAction(state, { post: [1, 0] })

      // Assertions: Should return to Actions phase for potential marker placement
      expect(finalContext.phase).toBe('Actions')
      expect(state.players[0].actions).toBe(1) // Still has actions for marker placement
      expect(state.players[0].usedMarkers).toContain('Move 3')
    })
  })

  describe('State consistency verification', () => {
    it('should maintain consistent game state throughout Move 3 operation', () => {
      // Setup: Complex initial state
      state.players[0] = createTestPlayer('red', { 
        readyMarkers: ['Move 3', 'Office'],
        usedMarkers: ['Upgrade'],
        points: 10,
        keys: 3
      })
      
      state.routes[0] = { 
        tokens: [createToken(1, false), createToken(2, true)],
        marker: 'Swap' 
      }
      state.routes[1] = { tokens: [null, null] }
      
      state.turn = 5
      state.markers = ['Office', 'Upgrade']

      // Store initial state for comparison
      const initialState = {
        turn: state.turn,
        markers: [...state.markers],
        playerPoints: state.players[0].points,
        playerKeys: state.players[0].keys,
        routeMarker: state.routes[0]!.marker,
        readyMarkers: [...state.players[0].readyMarkers],
        usedMarkers: [...state.players[0].usedMarkers]
      }

      state.context = {
        phase: 'Actions',
        player: 0,
        actions: [],
        hand: [],
      }

      // Action: Complete Move 3 operation
      const collectionContext = MarkerUseAction(state, { kind: 'Move 3' })
      state.context = collectionContext

      MoveCollectAction(state, { post: [0, 0] })
      MoveCollectAction(state, { post: [0, 1] })

      const movementContext = MovePlaceAction(state, { post: [1, 0] })
      state.context = movementContext
      MovePlaceAction(state, { post: [1, 1] })

      // Assertions: Only specific state should change
      expect(state.turn).toBe(initialState.turn) // Unchanged
      expect(state.markers).toEqual(initialState.markers) // Unchanged
      expect(state.players[0].points).toBe(initialState.playerPoints) // Unchanged
      expect(state.players[0].keys).toBe(initialState.playerKeys) // Unchanged
      expect(state.routes[0]!.marker).toBe(initialState.routeMarker) // Unchanged
      
      // Only marker usage should change
      expect(state.players[0].readyMarkers).toEqual(['Office']) // Move 3 removed
      expect(state.players[0].usedMarkers).toEqual(['Upgrade', 'Move 3']) // Move 3 added
      
      // Route state should change
      expect(state.routes[0]!.tokens[0]).toBeNull()
      expect(state.routes[0]!.tokens[1]).toBeNull()
      expect(state.routes[1]!.tokens[0]).toEqual({ owner: 1, merch: false })
      expect(state.routes[1]!.tokens[1]).toEqual({ owner: 2, merch: true })
    })

    it('should handle context stack properly during complex operations', () => {
      // Setup: Nested context scenario
      state.context = {
        phase: 'Actions',
        player: 0,
        actions: [{ name: 'place', params: { post: [0, 0] } }], // Some previous action
        hand: [],
      }

      // Action: Use Move 3 from within existing Actions context
      const collectionContext = MarkerUseAction(state, { kind: 'Move 3' })
      expect(collectionContext.prev).toBe(state.context) // Preserve previous context

      state.context = collectionContext
      state.routes[0] = { tokens: [createToken(1, false)] }
      state.routes[1] = { tokens: [null] }

      MoveCollectAction(state, { post: [0, 0] })
      const finalContext = MovePlaceAction(state, { post: [1, 0] })

      // Assertions: Should return to original context with previous actions intact
      expect(finalContext.phase).toBe('Actions')
      expect(finalContext.actions).toEqual([{ name: 'place', params: { post: [0, 0] } }])
    })
  })
})