import { GameState, PlayerState, initGameStateWithPlayers, Color, BonusMarkerKind, TokenState } from '../game/model'
import { Standard3P } from '../game/maps'

/**
 * Creates a test game state with sensible defaults
 */
export const createTestGameState = (overrides: Partial<GameState> = {}): GameState => {
  const baseState = initGameStateWithPlayers({ red: 'Player 1', blue: 'Player 2', green: 'Player 3' })
  return {
    ...baseState,
    ...overrides,
  }
}

/**
 * Creates a player with custom overrides
 */
export const createTestPlayer = (color: Color, overrides: Partial<PlayerState> = {}): PlayerState => {
  return {
    id: `test-${color}`,
    name: `Test ${color}`,
    color,
    joined: true,
    generalStock: { m: 5, t: 5 },
    personalSupply: { m: 2, t: 3 },
    keys: 2,
    privilege: 2,
    actions: 2,
    bank: 2,
    book: 2,
    points: 5,
    readyMarkers: ['Office'],
    usedMarkers: [],
    unplacedMarkers: [],
    ...overrides,
  }
}

/**
 * Sets up a game state where a route has just been completed with tokens in hand
 */
export const createRouteCompletionState = (
  routeIndex: number,
  tokensInHand: { token: 'm' | 't'; owner: number }[],
  overrides: Partial<GameState> = {}
): GameState => {
  const state = createTestGameState(overrides)
  
  // Set up route completion context
  state.context = {
    phase: 'Route',
    player: 0,
    actions: [
      {
        name: 'route',
        params: { route: routeIndex },
        contextActions: [
          {
            name: 'route-office',
            params: { city: state.map.routes[routeIndex].from }
          }
        ]
      }
    ],
    hand: tokensInHand,
    prev: {
      phase: 'Actions',
      player: 0,
      actions: [],
      hand: [],
    }
  }
  
  return state
}

/**
 * Sets up a city with specific office configurations
 */
export const setupCityWithOffices = (
  state: GameState,
  cityName: string,
  config: {
    tokens?: TokenState[]
    extras?: TokenState[]
    leftOffices?: TokenState[]
  }
): GameState => {
  state.cities[cityName] = {
    tokens: config.tokens || [],
    extras: config.extras || [],
    leftOffices: config.leftOffices || [],
  }
  return state
}

/**
 * Creates a token state for a specific player
 */
export const createToken = (owner: number, merch = false): TokenState => ({
  owner,
  merch,
})

/**
 * Sets up the Office phase context for testing marker-office actions
 */
export const createOfficePhaseState = (
  validCities: string[],
  tokensInHand: { token: 'm' | 't'; owner: number }[],
  overrides: Partial<GameState> = {}
): GameState => {
  const state = createTestGameState(overrides)
  
  // Ensure player has Office marker
  state.players[0].readyMarkers = ['Office']
  
  // Set up Office phase context
  state.context = {
    phase: 'Office',
    player: 0,
    actions: [],
    hand: tokensInHand,
    prev: {
      phase: 'Route',
      player: 0,
      actions: [
        {
          name: 'route',
          params: { route: 0 },
          contextActions: [
            {
              name: 'route-office',
              params: { city: validCities[0] }
            }
          ]
        }
      ],
      hand: [],
      prev: {
        phase: 'Actions',
        player: 0,
        actions: [],
        hand: [],
      }
    }
  }
  
  return state
}

/**
 * Creates a scenario for testing city control with mixed office types
 */
export const createCityControlScenario = (
  cityName: string,
  config: {
    player0Regular?: number
    player0Extra?: number 
    player0Left?: number
    player1Regular?: number
    player1Extra?: number
    player1Left?: number
    player2Regular?: number
    player2Extra?: number
    player2Left?: number
  }
): GameState => {
  const state = createTestGameState()
  
  const cityState = state.cities[cityName]
  cityState.tokens = []
  cityState.extras = []
  cityState.leftOffices = []
  
  // Add tokens for each player and type
  const addTokens = (count: number, player: number, array: TokenState[], merch = false) => {
    for (let i = 0; i < count; i++) {
      array.push(createToken(player, merch))
    }
  }
  
  if (config.player0Regular) addTokens(config.player0Regular, 0, cityState.tokens)
  if (config.player1Regular) addTokens(config.player1Regular, 1, cityState.tokens)  
  if (config.player2Regular) addTokens(config.player2Regular, 2, cityState.tokens)
  
  if (config.player0Extra) addTokens(config.player0Extra, 0, cityState.extras)
  if (config.player1Extra) addTokens(config.player1Extra, 1, cityState.extras)
  if (config.player2Extra) addTokens(config.player2Extra, 2, cityState.extras)
  
  if (config.player0Left) addTokens(config.player0Left, 0, cityState.leftOffices)
  if (config.player1Left) addTokens(config.player1Left, 1, cityState.leftOffices)
  if (config.player2Left) addTokens(config.player2Left, 2, cityState.leftOffices)
  
  return state
}

/**
 * Helper to get a route by its from/to cities
 */
export const findRoute = (state: GameState, from: string, to: string): number => {
  return state.map.routes.findIndex(r => 
    (r.from === from && r.to === to) || (r.from === to && r.to === from)
  )
}

/**
 * Creates a minimal game state for focused testing
 */
export const createMinimalGameState = (): GameState => {
  return {
    id: 'test-game',
    turn: 1,
    context: {
      phase: 'Actions',
      player: 0,
      actions: [],
      hand: [],
    },
    players: [
      createTestPlayer('red'),
      createTestPlayer('blue'), 
      createTestPlayer('green')
    ],
    cities: Object.fromEntries(
      Object.keys(Standard3P.cities).map(name => [name, { tokens: [], extras: [], leftOffices: [] }])
    ),
    routes: Standard3P.routes.map(r => ({
      tokens: Array(r.posts).fill(null),
      marker: undefined,
    })),
    markers: ['Office', 'Office', 'Swap', 'Upgrade'],
    coellen: [null, null, null, null],
    map: Standard3P,
    log: [],
    isOver: false,
  }
}