import { describe, it, expect, beforeEach } from 'vitest'
import { GameState } from '../../game/model'
import { MarkerUseAction, MoveCollectAction, MovePlaceAction } from '../../game/actions'
import { 
  createTestGameState, 
  createToken,
  createTestPlayer
} from '../../test/utils'

describe('Move 3 Opponent Interaction', () => {
  let state: GameState

  beforeEach(() => {
    state = createTestGameState()
    // Ensure we have 3 players for multi-player scenarios
    state.players[0] = createTestPlayer('red', { name: 'Player Red' })
    state.players[1] = createTestPlayer('blue', { name: 'Player Blue' }) 
    state.players[2] = createTestPlayer('green', { name: 'Player Green' })
  })

  describe('Single opponent token movement', () => {
    beforeEach(() => {
      // Setup: Move 3 activated by Player 0
      state.players[0].readyMarkers = ['Move 3']
      
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

    it('should move single opponent tradesman to new position', () => {
      // Setup: Player 1 has a tradesman on route 0
      state.routes[0] = {
        tokens: [createToken(1, false), null, null] // Player 1 tradesman at [0,0]
      }
      state.routes[1] = {
        tokens: [null, null] // Empty route for placement
      }

      // Action: Collect opponent token and move it
      MoveCollectAction(state, { post: [0, 0] })
      expect(state.context.hand[0]).toEqual({ token: 't', owner: 1 })
      
      const finalContext = MovePlaceAction(state, { post: [1, 0] })
      
      // Assertions: Opponent token moved with ownership preserved
      expect(state.routes[0]!.tokens[0]).toBeNull() // Original position empty
      expect(state.routes[1]!.tokens[0]).toEqual({ owner: 1, merch: false }) // New position filled
      expect(finalContext.phase).toBe('Actions') // Returns to previous context when hand empty
    })

    it('should move single opponent merchant to new position', () => {
      // Setup: Player 2 has a merchant on route 0
      state.routes[0] = {
        tokens: [createToken(2, true), null] // Player 2 merchant
      }
      state.routes[1] = {
        tokens: [null, null]
      }

      // Action: Collect and move merchant
      MoveCollectAction(state, { post: [0, 0] })
      expect(state.context.hand[0]).toEqual({ token: 'm', owner: 2 })
      
      MovePlaceAction(state, { post: [1, 1] })
      
      // Assertions: Merchant moved with properties preserved
      expect(state.routes[0]!.tokens[0]).toBeNull()
      expect(state.routes[1]!.tokens[1]).toEqual({ owner: 2, merch: true })
    })

    it('should generate appropriate log messages for opponent token moves', () => {
      // Setup: Route with opponent token
      state.routes[0] = {
        tokens: [createToken(1, false)]
      }
      state.routes[1] = {
        tokens: [null]
      }

      const initialLogLength = state.log.length

      // Action: Move opponent token
      MoveCollectAction(state, { post: [0, 0] })
      MovePlaceAction(state, { post: [1, 0] })

      // Assertions: Log should show Player 0 moving tokens (not the original owners)
      expect(state.log.length).toBe(initialLogLength + 1) // Only collection log (placement returns early when hand empty)
      
      const collectionLog = state.log[state.log.length - 1]
      
      expect(collectionLog.player).toBe(0) // Player 0 performed the action
      expect(collectionLog.message).toContain('Player Red moves a tradesman from')
    })
  })

  describe('Multiple opponent token movement', () => {
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

    it('should move tokens from 2 different opponents', () => {
      // Setup: Tokens from Player 1 and Player 2
      state.routes[0] = {
        tokens: [
          createToken(1, false), // Player 1 tradesman
          createToken(2, true),  // Player 2 merchant
          null
        ]
      }
      state.routes[1] = {
        tokens: [null, null]
      }

      // Action: Collect tokens from both opponents
      MoveCollectAction(state, { post: [0, 0] }) // Player 1's token
      MoveCollectAction(state, { post: [0, 1] }) // Player 2's token

      // Verify collection
      expect(state.context.hand).toEqual([
        { token: 't', owner: 1 },
        { token: 'm', owner: 2 }
      ])

      // Action: Place tokens in new positions
      const movementContext = MovePlaceAction(state, { post: [1, 0] }) // Player 1's token
      state.context = movementContext
      MovePlaceAction(state, { post: [1, 1] }) // Player 2's token

      // Assertions: Both opponents' tokens moved
      expect(state.routes[1]!.tokens[0]).toEqual({ owner: 1, merch: false })
      expect(state.routes[1]!.tokens[1]).toEqual({ owner: 2, merch: true })
      expect(state.routes[0]!.tokens[0]).toBeNull()
      expect(state.routes[0]!.tokens[1]).toBeNull()
    })

    it('should move tokens from 3 different opponents (using all 3 moves)', () => {
      // Setup: Tokens from all 3 players (including own token)
      state.routes[0] = {
        tokens: [
          createToken(0, false), // Own token
          createToken(1, true),  // Player 1 merchant
          createToken(2, false), // Player 2 tradesman
        ]
      }
      state.routes[1] = {
        tokens: [null, null, null]
      }

      // Action: Use all 3 moves on different players' tokens
      MoveCollectAction(state, { post: [0, 0] }) // Own token
      MoveCollectAction(state, { post: [0, 1] }) // Player 1's token
      MoveCollectAction(state, { post: [0, 2] }) // Player 2's token

      // Verify collection from 3 different players
      expect(state.context.hand).toEqual([
        { token: 't', owner: 0 },
        { token: 'm', owner: 1 },
        { token: 't', owner: 2 }
      ])

      // Action: Place all tokens
      const movementContext = MovePlaceAction(state, { post: [1, 0] })
      state.context = movementContext
      MovePlaceAction(state, { post: [1, 1] })
      MovePlaceAction(state, { post: [1, 2] })

      // Assertions: All 3 tokens repositioned with ownership preserved
      expect(state.routes[1]!.tokens[0]).toEqual({ owner: 0, merch: false })
      expect(state.routes[1]!.tokens[1]).toEqual({ owner: 1, merch: true })
      expect(state.routes[1]!.tokens[2]).toEqual({ owner: 2, merch: false })
    })

    it('should handle multiple tokens from same opponent', () => {
      // Setup: Multiple tokens from Player 1
      state.routes[0] = {
        tokens: [
          createToken(1, false), // Player 1 tradesman
          createToken(1, true),  // Player 1 merchant
          createToken(1, false), // Player 1 tradesman
        ]
      }
      state.routes[1] = {
        tokens: [null, null, null]
      }

      // Action: Collect all tokens from same opponent
      MoveCollectAction(state, { post: [0, 0] })
      MoveCollectAction(state, { post: [0, 1] })
      MoveCollectAction(state, { post: [0, 2] })

      // Verify all tokens from same player
      expect(state.context.hand).toEqual([
        { token: 't', owner: 1 },
        { token: 'm', owner: 1 },
        { token: 't', owner: 1 }
      ])

      // Action: Redistribute Player 1's tokens
      const movementContext = MovePlaceAction(state, { post: [1, 0] })
      state.context = movementContext
      MovePlaceAction(state, { post: [1, 1] })
      MovePlaceAction(state, { post: [1, 2] })

      // Assertions: All tokens still belong to Player 1
      expect(state.routes[1]!.tokens[0]).toEqual({ owner: 1, merch: false })
      expect(state.routes[1]!.tokens[1]).toEqual({ owner: 1, merch: true })
      expect(state.routes[1]!.tokens[2]).toEqual({ owner: 1, merch: false })
    })
  })

  describe('Strategic repositioning scenarios', () => {
    it('should enable blocking opponent routes by repositioning', () => {
      // Setup: Strategic scenario where moving tokens could block routes
      state.routes[0] = {
        tokens: [createToken(1, false), null, createToken(1, false)] // Player 1 controls ends
      }
      state.routes[1] = {
        tokens: [null, createToken(2, false), null] // Player 2 in middle
      }
      state.routes[2] = {
        tokens: [null, null, null] // Empty route
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

      // Action: Move Player 2's token to disrupt their position
      MoveCollectAction(state, { post: [1, 1] }) // Collect Player 2's token
      const movementContext = MovePlaceAction(state, { post: [2, 0] }) // Place it elsewhere

      // Assertions: Player 2's strategic position disrupted
      expect(state.routes[1]!.tokens[1]).toBeNull() // Original position empty
      expect(state.routes[2]!.tokens[0]).toEqual({ owner: 2, merch: false }) // Moved away
    })

    it('should enable helping opponents by repositioning their tokens', () => {
      // Setup: Scenario where moving opponent tokens could help them
      state.routes[0] = {
        tokens: [null, createToken(1, false), null] // Player 1 token not optimally placed
      }
      state.routes[1] = {
        tokens: [null, null] // Better route for Player 1
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

      // Action: Move Player 1's token to a better position
      MoveCollectAction(state, { post: [0, 1] })
      MovePlaceAction(state, { post: [1, 0] }) // Better strategic position

      // Assertions: Player 1's token moved to potentially better position
      expect(state.routes[0]!.tokens[1]).toBeNull()
      expect(state.routes[1]!.tokens[0]).toEqual({ owner: 1, merch: false })
    })

    it('should preserve ownership during complex multi-route repositioning', () => {
      // Setup: Complex scenario with tokens across multiple routes
      state.routes[0] = { tokens: [createToken(1, false), createToken(2, true)] }
      state.routes[1] = { tokens: [createToken(1, true), null] }
      state.routes[2] = { tokens: [null, null, null] } // Destination route

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

      // Action: Collect tokens from multiple routes and redistribute
      MoveCollectAction(state, { post: [0, 0] }) // Player 1 tradesman from route 0
      MoveCollectAction(state, { post: [1, 0] }) // Player 1 merchant from route 1  
      MoveCollectAction(state, { post: [0, 1] }) // Player 2 merchant from route 0

      // Action: Place all on route 2
      const movementContext = MovePlaceAction(state, { post: [2, 0] })
      state.context = movementContext
      MovePlaceAction(state, { post: [2, 1] })
      MovePlaceAction(state, { post: [2, 2] })

      // Assertions: All tokens moved to route 2 with ownership preserved
      expect(state.routes[2]!.tokens[0]).toEqual({ owner: 1, merch: false }) // Player 1 tradesman
      expect(state.routes[2]!.tokens[1]).toEqual({ owner: 1, merch: true })  // Player 1 merchant
      expect(state.routes[2]!.tokens[2]).toEqual({ owner: 2, merch: true })  // Player 2 merchant

      // Original routes should be affected
      expect(state.routes[0]!.tokens[0]).toBeNull()
      expect(state.routes[0]!.tokens[1]).toBeNull()
      expect(state.routes[1]!.tokens[0]).toBeNull()
    })
  })

  describe('Opponent token interaction edge cases', () => {
    it('should handle case where opponent has no tokens to move', () => {
      // Setup: Routes with only current player's tokens
      state.routes[0] = {
        tokens: [createToken(0, false), createToken(0, true)] // Only own tokens
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

      // Action: Can only collect own tokens (no opponents available)
      MoveCollectAction(state, { post: [0, 0] })
      MoveCollectAction(state, { post: [0, 1] })

      // Assertions: Should work fine with only own tokens
      expect(state.context.hand).toEqual([
        { token: 't', owner: 0 },
        { token: 'm', owner: 0 }
      ])
    })

    it('should handle mixed scenarios with some empty positions', () => {
      // Setup: Sparse token placement
      state.routes[0] = {
        tokens: [createToken(1, false), null, createToken(2, true)] // Gaps between tokens
      }
      state.routes[1] = {
        tokens: [null, null]
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

      // Action: Collect only the occupied positions
      MoveCollectAction(state, { post: [0, 0] }) // Player 1's token
      MoveCollectAction(state, { post: [0, 2] }) // Player 2's token

      // Action: Place tokens together
      const movementContext = MovePlaceAction(state, { post: [1, 0] })
      state.context = movementContext
      MovePlaceAction(state, { post: [1, 1] })

      // Assertions: Tokens moved from sparse to dense arrangement
      expect(state.routes[0]!.tokens[0]).toBeNull()
      expect(state.routes[0]!.tokens[1]).toBeNull() // Was already null
      expect(state.routes[0]!.tokens[2]).toBeNull()
      expect(state.routes[1]!.tokens[0]).toEqual({ owner: 1, merch: false })
      expect(state.routes[1]!.tokens[1]).toEqual({ owner: 2, merch: true })
    })

    it('should maintain game state consistency during opponent token moves', () => {
      // Setup: Complex game state with various elements
      state.routes[0] = { tokens: [createToken(1, false), createToken(2, true)] }
      state.routes[1] = { tokens: [null, null] }
      
      // Preserve other game state elements
      const originalTurn = state.turn
      const originalMarkers = [...state.markers]
      const originalPlayers = state.players.map(p => ({ ...p }))

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

      // Action: Perform Move 3 operations
      MoveCollectAction(state, { post: [0, 0] })
      MoveCollectAction(state, { post: [0, 1] })
      const movementContext = MovePlaceAction(state, { post: [1, 0] })
      state.context = movementContext
      MovePlaceAction(state, { post: [1, 1] })

      // Assertions: Other game state should be unchanged
      expect(state.turn).toBe(originalTurn)
      expect(state.markers).toEqual(originalMarkers)
      expect(state.players[1].points).toBe(originalPlayers[1].points) // Player 1 stats unchanged
      expect(state.players[2].keys).toBe(originalPlayers[2].keys) // Player 2 stats unchanged
      
      // Only route state and logs should change
      expect(state.routes[1]!.tokens[0]).toEqual({ owner: 1, merch: false })
      expect(state.routes[1]!.tokens[1]).toEqual({ owner: 2, merch: true })
    })
  })
})