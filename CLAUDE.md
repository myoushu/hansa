# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Hansa Teutonica is an online board game implementation built with Next.js and TypeScript. The game runs entirely on the frontend with state management handled by Immer.js and real-time multiplayer synchronization through Supabase.

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

# Run tests
yarn test

# Run tests with UI
yarn test:ui

# Run tests with coverage
yarn test:coverage
```

## Architecture

### Frontend-Only Game Logic
- All game logic executes on the client side
- No server-side validation or processing
- Players can potentially "hack" the game state since moves directly overwrite the shared state

### State Management
- **Immer.js** for immutable state updates
- Game state is stored as a single object with nested contexts for different game phases
- State changes are applied through action functions that mutate draft state

### Real-time Multiplayer
- **Supabase** handles backend persistence and real-time updates
- Game state is serialized to JSON and stored in Supabase
- Players subscribe to game state changes via Supabase subscriptions
- Each player gets a unique UUID-based link to join games

### Key Components

**Game State Structure (`src/game/model.ts`)**
- `GameState`: Root state object containing players, board state, and phase context
- `PhaseContext`: Stack-like structure managing game phases (Actions, Displacement, Route completion, etc.)
- `PlayerState`: Individual player data (tokens, upgrades, markers)
- `Action`: Typed action system with strict parameter validation

**Game Controller (`src/game/controller.ts`)**
- `useController`: React hook that provides game state and action dispatcher
- Handles Supabase synchronization and real-time updates
- Validates actions before execution
- Manages error states and undo functionality

**Action System (`src/game/actions.ts`)**
- Pure functions that transform game state
- Each action type has specific parameter requirements
- Actions can create new phase contexts for multi-step operations

### Game Flow
1. Player creates game, gets shareable UUID links
2. Players join via unique player links
3. Game state changes broadcast to all players in real-time
4. Turn-based gameplay with phase-driven action restrictions
5. Players can open console to debug game state (`window.hansa`)

## Important Notes

- Game IDs are UUIDs - if lost, create a new game
- Player moves overwrite shared state without validation
- Console debugging is expected (`window.hansa` exposes game state)
- Graphics are implemented using React SVG components
- **Testing**: Vitest with jsdom environment and Testing Library
- Test files located in `src/__tests__/` with comprehensive game mechanics coverage