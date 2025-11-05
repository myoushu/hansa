# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Hansa Teutonica is an online implementation of the board game Hansa Teutonica, built with Next.js, TypeScript, and React. The game features:
- **Frontend-only game logic**: All game mechanics execute client-side
- **Real-time multiplayer**: Powered by Supabase for state synchronization
- **Immutable state management**: Using Immer.js for predictable state updates
- **SVG-based graphics**: Clean, scalable board visualization
- **Comprehensive test coverage**: Extensive test suites for game mechanics

## Development Commands

```bash
# Install dependencies
yarn

# Start development server
yarn dev

# Build for production
yarn build

# Start production server
yarn start

# Run linter
yarn lint

# Run TypeScript type checking
yarn type-check

# Run tests (watch mode)
yarn test

# Run tests with UI
yarn test:ui

# Run tests once
yarn test:run

# Run tests with coverage
yarn test:coverage
```

## Architecture

### Core File Structure

```
src/
├── game/
│   ├── model.ts         # Type definitions and game state structure
│   ├── actions.ts       # Game action implementations
│   ├── helpers.ts       # Game logic helper functions
│   ├── controller.ts    # React hooks for game state management
│   ├── components.tsx   # React components for game UI
│   ├── maps.ts          # Board layout and city/route definitions
│   └── styles.scss      # Game styling
├── test/
│   ├── setup.ts         # Vitest configuration
│   └── utils.ts         # Test utilities and factories
└── __tests__/           # Comprehensive test suites
    ├── move3/           # Tests for Move 3 bonus marker
    ├── swapOffice/      # Tests for office swapping
    └── extraOffice/     # Tests for extra office placement

pages/
├── index.tsx            # Landing page
├── lobby/[gameId].tsx   # Game lobby (pre-start)
├── join/[gameId].tsx    # Join game page
└── play/[gameId]/[playerId].tsx  # Main game interface
```

### Game State Architecture

**Core State Object (`src/game/model.ts`)**

The game state is a single immutable object containing:
- `players[]`: Array of player states (tokens, upgrades, markers)
- `board`: 2D array of trading post states
- `cities[]`: City states with offices
- `routes[]`: Route definitions and completion states
- `context`: Current phase context (stack-based)
- `turn`: Current turn number
- `log[]`: Game event log

**Phase-Driven Gameplay**

The game uses a phase context stack to manage multi-step operations:

- `Actions`: Main turn phase where players can perform actions
- `Displacement`: Player must place displaced tokens
- `Markers`: Player places bonus markers at turn end
- `Collection`: Player collects tokens for movement (Move 3 marker)
- `Movement`: Player places collected tokens (Move 3 marker)
- `Route`: Player selects route completion reward
- `Upgrade`: Player selects an upgrade (from Upgrade marker)
- `Swap`: Player swaps offices (from Swap marker)
- `Office`: Player places extra office (from Office marker)

Each phase restricts available actions. Phases can create new sub-phases (via `prev` pointer), creating a stack that unwinds as actions complete.

### Key Game Mechanics

**Token Placement System**
- Players place merchants (cubes) and tradesmen (discs) on trading posts
- Trading posts connect cities via routes
- Filling a route grants rewards (offices, upgrades, bonus markers)

**Bonus Markers**
- `Move 3`: Move up to 3 tokens from trading posts (two-phase: Collection → Movement)
- `Office`: Place an extra office in a controlled city
- `Swap`: Swap two offices within a city
- `Upgrade`: Gain an upgrade (privilege, book, actions, keys, bank)
- `3 Actions` / `4 Actions`: Extra actions on future turns

**City Control**
- Players place offices in cities
- Office colors (privilege levels 0-3) determine city control
- City control affects certain game mechanics and scoring

**Displacement**
- Players can displace opponent tokens from trading posts
- Displaced tokens must be immediately re-placed
- Creates tactical depth and interaction

### Action System (`src/game/actions.ts`)

Actions are pure functions: `(state, params) => newPhaseContext`

Key action types:
- `income`: Draw tokens from general supply
- `place`: Place merchant/tradesman on trading post
- `displace`: Displace opponent's token
- `displace-place`: Re-place displaced tokens
- `move-collect` / `move-place`: Two-phase movement action
- `route`: Complete a route (triggers reward selection)
- `route-*`: Various route completion rewards
- `marker-use`: Activate a bonus marker
- `marker-*`: Various marker-specific actions
- `done`: End turn

Each action validates preconditions and mutates state via Immer draft.

### Controller System (`src/game/controller.ts`)

**`useController` Hook**

Provides game state and action dispatcher to React components:
- Loads game state from Supabase
- Subscribes to real-time state updates
- Validates and dispatches actions
- Handles undo functionality
- Manages error states

**State Synchronization**

1. Player executes action locally (optimistic update)
2. New state written to Supabase
3. All clients receive update via subscription
4. UI re-renders with new state

**Debug Access**

Game state exposed to browser console via `window.hansa` for debugging.

### Real-time Multiplayer (Supabase)

**Game Creation Flow**
1. Player creates game → receives game UUID
2. System generates unique player UUIDs for each slot
3. Share links: `hansa-teutonica.com/play/<player-uuid>`
4. Players join via unique links

**State Persistence**
- Game state serialized to JSON
- Stored in Supabase table
- Real-time subscriptions notify all players of changes
- No server-side validation (trust-based system)

**Important Constraints**
- Lost game UUID = lost game (no recovery)
- Player moves directly overwrite shared state
- No server-side validation or anti-cheat
- Console debugging expected and encouraged

## Testing Strategy

### Test Organization (`src/__tests__/`)

Tests organized by feature with consistent structure:

**Test Categories per Feature**
- `basic-functionality.test.ts`: Core feature behavior
- `validation-rules.test.ts`: Input validation and constraints
- `token-management.test.ts`: Token state changes
- `opponent-interaction.test.ts`: Multi-player scenarios
- `integration.test.ts`: End-to-end feature tests
- `edge-cases-integration.test.ts`: Corner cases and complex scenarios
- `state-management.test.ts`: State consistency and phase transitions

**Test Utilities (`src/test/utils.ts`)**
- `createTestGameState()`: Factory for initial game state
- `createTestPlayer()`: Factory for player states with overrides
- `createToken()`: Factory for board tokens
- Helper functions for common test scenarios

**Testing Framework**
- **Vitest**: Fast, Vite-native test runner
- **jsdom**: Browser environment simulation
- **@testing-library/react**: Component testing utilities
- **@testing-library/user-event**: User interaction simulation

### Writing Tests

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { GameState } from '../../game/model'
import { SomeAction } from '../../game/actions'
import { createTestGameState, createTestPlayer } from '../../test/utils'

describe('Feature Name', () => {
  let state: GameState

  beforeEach(() => {
    state = createTestGameState()
    // Setup common test state
  })

  it('should do something specific', () => {
    // Arrange: Setup test conditions
    state.players[0] = createTestPlayer('red', { /* overrides */ })

    // Act: Execute action
    const newContext = SomeAction(state, { /* params */ })

    // Assert: Verify results
    expect(newContext.phase).toBe('ExpectedPhase')
    expect(state.players[0].someProperty).toBe(expectedValue)
  })
})
```

## Game-Specific Domain Knowledge

**Hansa Teutonica Board Game**

This is a digital implementation of the physical board game. Key concepts:

- **Trading Posts**: Spaces on routes between cities where tokens are placed
- **Routes**: Connections between cities, completed by filling all trading posts
- **Offices**: Player presence markers in cities (privilege levels 0-3)
- **Privilege**: Level of office (higher = more powerful), affects city control
- **Bonus Markers**: Special abilities earned by completing routes
- **Actions per Turn**: Players typically have 2-5 actions per turn (upgradeable)
- **City Networks**: Connected cities where a player has offices
- **Route Completion**: Primary way to gain offices and upgrades

**Game Flow**
1. Players take turns performing actions
2. Actions include: place tokens, displace opponents, complete routes, use markers
3. Completing routes grants rewards (offices, upgrades, markers)
4. Game ends when certain conditions are met (office supply exhausted, etc.)
5. Players score points based on networks, upgrades, and achievements

## Development Tips

### Working with Game State

Always use Immer's draft state when modifying state in actions:
```typescript
// Good - mutates draft state
export const SomeAction = (state: GameState, params: Params) => {
  state.players[0].supply += 1  // Immer tracks this
  return newPhaseContext
}

// Bad - creating new objects unnecessarily
export const SomeAction = (state: GameState, params: Params) => {
  return { ...state, players: [...state.players] }  // Don't do this
}
```

### Working with Phase Contexts

Phase contexts form a stack via the `prev` pointer:
```typescript
// Creating a new sub-phase
const newContext: PhaseContext = {
  phase: 'Route',
  player: currentPlayer,
  actions: [],
  hand: [],
  prev: state.context  // Link to previous phase
}

// Returning to previous phase
if (shouldExitPhase) {
  return state.context.prev!
}
```

### Adding New Actions

1. Add action name to `ActionName` type in `model.ts`
2. Define parameters in `ActionParams<T>` type
3. Implement action function in `actions.ts`
4. Add case to `executeAction` switch statement
5. Update helper functions in `helpers.ts` for validation
6. Add tests for new action behavior

### Debugging

- Open browser console when playing
- Access game state via `window.hansa`
- Check phase context stack: `window.hansa.state.context`
- View action history: `window.hansa.state.log`
- Test actions directly: `window.hansa.action('actionName', params)`

## Common Pitfalls

1. **Forgetting Phase Validation**: Always check current phase before executing actions
2. **Not Handling Displacement**: When placing displacing tokens, must handle displacement phase
3. **Marker State Management**: Track ready/used/unplaced markers separately
4. **City Control Calculation**: Office privilege levels determine control (complex rules)
5. **Route Completion Edge Cases**: Some routes have special rules (Coellen, east-west links)
6. **Token Counting**: Track tokens in supply, hand, board, and displaced separately

## Future Enhancements (TODO)

- Turn notifications (alert when it's your turn)
- Move validation on server side
- Game state recovery/history
- Spectator mode
- Game replays
- Mobile-responsive UI improvements

## Resources

- **Repository**: Online implementation of Hansa Teutonica
- **Game Rules**: Understanding the board game rules is essential for development
- **Testing**: Run tests before committing (`yarn test:run`)
- **Type Safety**: Always run `yarn type-check` to catch TypeScript errors
- **Console**: Play with console open to understand game state flow
