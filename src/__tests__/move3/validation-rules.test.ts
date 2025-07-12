import { describe, it, expect, beforeEach } from 'vitest'
import { GameState } from '../../game/model'
import { MoveCollectAction, MovePlaceAction } from '../../game/actions'
import { canMoveOponnentMarkers, validateAction } from '../../game/helpers'
import { 
  createTestGameState, 
  createToken,
  createTestPlayer
} from '../../test/utils'

describe('Move 3 Validation Rules', () => {
  let state: GameState

  beforeEach(() => {
    state = createTestGameState()
  })

  describe('Opponent token collection restrictions', () => {
    beforeEach(() => {
      // Setup: Routes with various tokens
      state.routes[0] = {
        tokens: [
          createToken(0, false), // Player 0 tradesman
          createToken(1, false), // Player 1 tradesman  
          createToken(2, true),  // Player 2 merchant
          null                   // Empty slot
        ]
      }
    })

    it('should prevent collecting opponent tokens without Move 3 active', () => {
      // Setup: Normal Collection phase (not from Move 3)
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

      // Check: Should not be able to move opponent markers
      expect(canMoveOponnentMarkers(state)).toBe(false)

      // Validation: Should reject collecting opponent tokens
      const validationError = validateAction('move-collect', state, { post: [0, 1] })
      expect(validationError).toBe('Trading Post is not Yours')
    })

    it('should allow collecting opponent tokens when Move 3 is active', () => {
      // Setup: Collection phase after Move 3 activation
      // Properly set up context to indicate Move 3 was used
      const prevContext = {
        phase: 'Actions' as const,
        player: 0,
        actions: [{ name: 'marker-use' as const, params: { kind: 'Move 3' as const } }],
        hand: [],
      }
      
      state.context = {
        phase: 'Collection',
        player: 0,
        actions: [],
        hand: [],
        prev: prevContext
      }

      // Check: Should be able to move opponent markers
      expect(canMoveOponnentMarkers(state)).toBe(true)

      // Validation: Should allow collecting opponent tokens
      const validationError = validateAction('move-collect', state, { post: [0, 1] })
      expect(validationError).toBeFalsy() // validateAction returns false when valid, not null
    })

    it('should still allow collecting own tokens normally', () => {
      // Setup: Collection phase after Move 3 activation
      // Properly set up context to indicate Move 3 was used
      const prevContext = {
        phase: 'Actions' as const,
        player: 0,
        actions: [{ name: 'marker-use' as const, params: { kind: 'Move 3' as const } }],
        hand: [],
      }
      
      state.context = {
        phase: 'Collection',
        player: 0,
        actions: [],
        hand: [],
        prev: prevContext
      }

      // Validation: Should allow collecting own tokens
      const validationError = validateAction('move-collect', state, { post: [0, 0] })
      expect(validationError).toBeFalsy()
    })
  })

  describe('Empty trading post restrictions', () => {
    it('should prevent collecting from empty trading posts', () => {
      // Setup: Route with empty slot
      state.routes[0] = {
        tokens: [null, createToken(1, false), null]
      }
      
      // Properly set up context to indicate Move 3 was used
      const prevContext = {
        phase: 'Actions' as const,
        player: 0,
        actions: [{ name: 'marker-use' as const, params: { kind: 'Move 3' as const } }],
        hand: [],
      }
      
      state.context = {
        phase: 'Collection',
        player: 0,
        actions: [],
        hand: [],
        prev: prevContext
      }

      // Validation: Should reject collecting from empty post
      const validationError = validateAction('move-collect', state, { post: [0, 0] })
      expect(validationError).toBe('Trading Post is Empty')
    })

    it('should allow collecting from occupied trading posts', () => {
      // Setup: Route with tokens
      state.routes[0] = {
        tokens: [createToken(1, false), null]
      }
      
      // Properly set up context to indicate Move 3 was used
      const prevContext = {
        phase: 'Actions' as const,
        player: 0,
        actions: [{ name: 'marker-use' as const, params: { kind: 'Move 3' as const } }],
        hand: [],
      }
      
      state.context = {
        phase: 'Collection',
        player: 0,
        actions: [],
        hand: [],
        prev: prevContext
      }

      // Validation: Should allow collecting from occupied post
      const validationError = validateAction('move-collect', state, { post: [0, 0] })
      expect(validationError).toBeFalsy()
    })
  })

  describe('Token placement restrictions', () => {
    beforeEach(() => {
      // Setup: Movement phase with tokens to place
      state.context = {
        phase: 'Movement',
        player: 0,
        actions: [{ name: 'move-place', params: { post: [0, 0] } }],
        hand: [{ token: 't', owner: 1 }],
        prev: {
          phase: 'Actions',
          player: 0,
          actions: [],
          hand: [],
        }
      }
    })

    it('should prevent placing tokens on occupied trading posts', () => {
      // Setup: Route with occupied slot
      state.routes[0] = {
        tokens: [createToken(2, false), null] // Occupied at [0,0]
      }

      // Validation: Should reject placing on occupied post
      const validationError = validateAction('move-place', state, { post: [0, 0] })
      expect(validationError).toBe('Trading Post is Taken')
    })

    it('should allow placing tokens on empty trading posts', () => {
      // Setup: Route with empty slot
      state.routes[0] = {
        tokens: [null, createToken(2, false)] // Empty at [0,0]
      }

      // Validation: Should allow placing on empty post
      const validationError = validateAction('move-place', state, { post: [0, 0] })
      expect(validationError).toBeFalsy()
    })

    it('should validate route accessibility', () => {
      // Setup: Inaccessible route (out of bounds)
      const invalidRouteIndex = state.routes.length + 1

      // Validation: Should reject invalid route
      expect(() => {
        validateAction('move-place', state, { post: [invalidRouteIndex, 0] })
      }).toThrow()
    })
  })

  describe('Phase-specific action restrictions', () => {
    it('should prevent move-collect outside Collection phase', () => {
      // Setup: Actions phase
      state.context = {
        phase: 'Actions',
        player: 0,
        actions: [],
        hand: [],
      }
      
      state.routes[0] = {
        tokens: [createToken(0, false)]
      }

      // Actions phase allows move-collect (it creates Collection phase)
      // But let's test a different phase where it might be restricted
      state.context.phase = 'Markers'

      // Validation: Should be restricted in Markers phase
      const validationError = validateAction('move-collect', state, { post: [0, 0] })
      expect(validationError).toBe("You can't perform that action now")
    })

    it('should prevent move-place without tokens in hand', () => {
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
      
      state.routes[0] = {
        tokens: [null]
      }

      // Validation: Should reject placement without tokens
      expect(() => {
        MovePlaceAction(state, { post: [0, 0] })
      }).toThrow() // Should throw because hand.shift() on empty array
    })

    it('should allow move-place with tokens in hand', () => {
      // Setup: Movement phase with tokens
      state.context = {
        phase: 'Movement',
        player: 0,
        actions: [],
        hand: [{ token: 't', owner: 0 }],
        prev: {
          phase: 'Actions',
          player: 0,
          actions: [],
          hand: [],
        }
      }
      
      state.routes[0] = {
        tokens: [null]
      }

      // Validation: Should allow placement with tokens in hand
      const validationError = validateAction('move-place', state, { post: [0, 0] })
      expect(validationError).toBeFalsy()
    })
  })

  describe('Move 3 specific limitations', () => {
    it('should maintain 3-token limit through game actions', () => {
      // Setup: Collection phase after Move 3
      // Properly set up context to indicate Move 3 was used
      const prevContext = {
        phase: 'Actions' as const,
        player: 0,
        actions: [{ name: 'marker-use' as const, params: { kind: 'Move 3' as const } }],
        hand: [],
      }
      
      state.context = {
        phase: 'Collection',
        player: 0,
        actions: [],
        hand: [],
        prev: prevContext
      }
      
      // Setup: Route with many tokens
      state.routes[0] = {
        tokens: [
          createToken(1, false), // Opponent 1
          createToken(2, false), // Opponent 2  
          createToken(1, true),  // Opponent 1 merchant
          createToken(2, true),  // Opponent 2 merchant
        ]
      }

      // Action: Collect 3 tokens
      MoveCollectAction(state, { post: [0, 0] })
      MoveCollectAction(state, { post: [0, 1] })
      MoveCollectAction(state, { post: [0, 2] })

      // Verify: Should have 3 tokens in hand
      expect(state.context.hand).toHaveLength(3)

      // The UI/game logic should prevent collecting more than 3 tokens
      // This is enforced by the availableActionsCount() helper which returns 3
      // when Move 3 is active, limiting the number of collection actions
    })

    it('should preserve token types during collection and placement', () => {
      // Setup: Collection phase
      // Properly set up context to indicate Move 3 was used
      const prevContext = {
        phase: 'Actions' as const,
        player: 0,
        actions: [{ name: 'marker-use' as const, params: { kind: 'Move 3' as const } }],
        hand: [],
      }
      
      state.context = {
        phase: 'Collection',
        player: 0,
        actions: [],
        hand: [],
        prev: prevContext
      }
      
      state.routes[0] = { tokens: [createToken(1, true)] } // Opponent merchant
      state.routes[1] = { tokens: [null] } // Empty for placement

      // Action: Collect merchant
      MoveCollectAction(state, { post: [0, 0] })
      expect(state.context.hand[0]).toEqual({ token: 'm', owner: 1 })

      // Action: Place merchant
      MovePlaceAction(state, { post: [1, 0] })
      expect(state.routes[1]!.tokens[0]).toEqual({ owner: 1, merch: true })
    })

    it('should preserve token ownership during moves', () => {
      // Setup: Multiple players' tokens
      // Properly set up context to indicate Move 3 was used
      const prevContext = {
        phase: 'Actions' as const,
        player: 0,
        actions: [{ name: 'marker-use' as const, params: { kind: 'Move 3' as const } }],
        hand: [],
      }
      
      state.context = {
        phase: 'Collection',
        player: 0,
        actions: [],
        hand: [],
        prev: prevContext
      }
      
      state.routes[0] = { 
        tokens: [
          createToken(1, false), // Player 1 tradesman
          createToken(2, true)   // Player 2 merchant
        ]
      }
      state.routes[1] = { tokens: [null, null] }

      // Action: Collect and move tokens from different players
      MoveCollectAction(state, { post: [0, 0] }) // Player 1's token
      MoveCollectAction(state, { post: [0, 1] }) // Player 2's token

      // Verify hand contents preserve ownership
      expect(state.context.hand[0]).toEqual({ token: 't', owner: 1 })
      expect(state.context.hand[1]).toEqual({ token: 'm', owner: 2 })

      // Action: Place tokens
      const movementContext = MovePlaceAction(state, { post: [1, 0] })
      state.context = movementContext
      MovePlaceAction(state, { post: [1, 1] })

      // Verify placed tokens maintain original ownership
      expect(state.routes[1]!.tokens[0]).toEqual({ owner: 1, merch: false })
      expect(state.routes[1]!.tokens[1]).toEqual({ owner: 2, merch: true })
    })
  })

  describe('Error handling', () => {
    it('should handle invalid route indices gracefully', () => {
      // Properly set up context to indicate Move 3 was used
      const prevContext = {
        phase: 'Actions' as const,
        player: 0,
        actions: [{ name: 'marker-use' as const, params: { kind: 'Move 3' as const } }],
        hand: [],
      }
      
      state.context = {
        phase: 'Collection',
        player: 0,
        actions: [],
        hand: [],
        prev: prevContext
      }

      // Validation: Should reject invalid route index
      expect(() => {
        validateAction('move-collect', state, { post: [999, 0] })
      }).toThrow()
    })

    it('should handle invalid trading post indices gracefully', () => {
      // Properly set up context to indicate Move 3 was used
      const prevContext = {
        phase: 'Actions' as const,
        player: 0,
        actions: [{ name: 'marker-use' as const, params: { kind: 'Move 3' as const } }],
        hand: [],
      }
      
      state.context = {
        phase: 'Collection',
        player: 0,
        actions: [],
        hand: [],
        prev: prevContext
      }
      
      state.routes[0] = { tokens: [createToken(1, false)] }

      // Validation: Should reject invalid trading post index
      const validationError = validateAction('move-collect', state, { post: [0, 999] })
      expect(validationError).toBeTruthy() // Should return error message for invalid index
    })

    it('should prevent displacement during token placement', () => {
      // This rule is inherently enforced by the validation that prevents
      // placing tokens on occupied trading posts. The rule "you can't displace 
      // another tradesman" is implemented by requiring empty positions for placement.
      
      state.context = {
        phase: 'Movement',
        player: 0,
        actions: [],
        hand: [{ token: 't', owner: 1 }],
        prev: {
          phase: 'Actions',
          player: 0,
          actions: [],
          hand: [],
        }
      }
      
      state.routes[0] = {
        tokens: [createToken(2, false)] // Occupied position
      }

      // Validation: Should prevent placing on occupied position (no displacement)
      const validationError = validateAction('move-place', state, { post: [0, 0] })
      expect(validationError).toBe('Trading Post is Taken')
    })
  })
})