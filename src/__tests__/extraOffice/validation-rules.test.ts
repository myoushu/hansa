import { describe, it, expect, beforeEach } from 'vitest'
import { GameState } from '../../game/model'
import { validExtraOfficeLocations, validOfficeMarkerLocationsForRoute } from '../../game/helpers'
import { 
  createTestGameState, 
  createRouteCompletionState, 
  setupCityWithOffices, 
  createToken,
  findRoute 
} from '../../test/utils'

describe('Extra Office Validation Rules', () => {
  let state: GameState

  beforeEach(() => {
    state = createTestGameState()
  })

  describe('validExtraOfficeLocations', () => {
    it('should return cities adjacent to completed routes where office was established', () => {
      // Find a route and establish office in one of its cities
      const routeIndex = 0
      const route = state.map.routes[routeIndex]
      
      state = createRouteCompletionState(routeIndex, [{ token: 't', owner: 0 }])
      
      // Setup both cities with existing offices (requirement for extra office)
      state = setupCityWithOffices(state, route.from, {
        tokens: [createToken(1), createToken(0)] // Office established by current player
      })
      state = setupCityWithOffices(state, route.to, {
        tokens: [createToken(1)] // Existing office by another player
      })

      const validCities = validExtraOfficeLocations(state)
      
      // Should include the city where office wasn't just established
      expect(validCities).toContain(route.to)
      // Should also include the from city since it has more than 1 office
      expect(validCities).toContain(route.from)
    })

    it('should exclude cities with only the just-established office', () => {
      const routeIndex = 0
      const route = state.map.routes[routeIndex]
      
      state = createRouteCompletionState(routeIndex, [{ token: 't', owner: 0 }])
      
      // Setup from city with only the just-established office
      state = setupCityWithOffices(state, route.from, {
        tokens: [createToken(0)] // Only the office just established
      })
      // Setup to city with no offices
      state = setupCityWithOffices(state, route.to, {
        tokens: []
      })

      const validCities = validExtraOfficeLocations(state)
      
      expect(validCities).not.toContain(route.from)
      expect(validCities).not.toContain(route.to)
    })

    it('should return empty array when no routes have been completed', () => {
      state.context.actions = [] // No actions taken
      
      const validCities = validExtraOfficeLocations(state)
      
      expect(validCities).toEqual([])
    })
  })

  describe('validOfficeMarkerLocationsForRoute', () => {
    it('should return adjacent cities with at least one existing office', () => {
      const routeIndex = 0
      const route = state.map.routes[routeIndex]
      
      // Setup cities with existing offices
      state = setupCityWithOffices(state, route.from, {
        tokens: [createToken(1)] // One office
      })
      state = setupCityWithOffices(state, route.to, {
        tokens: [createToken(1), createToken(2)] // Two offices
      })

      const validCities = validOfficeMarkerLocationsForRoute(state, routeIndex)
      
      expect(validCities).toContain(route.from)
      expect(validCities).toContain(route.to)
    })

    it('should exclude cities with no existing offices', () => {
      const routeIndex = 0
      const route = state.map.routes[routeIndex]
      
      // Setup cities with no offices
      state = setupCityWithOffices(state, route.from, {
        tokens: []
      })
      state = setupCityWithOffices(state, route.to, {
        tokens: []
      })

      const validCities = validOfficeMarkerLocationsForRoute(state, routeIndex)
      
      expect(validCities).not.toContain(route.from)
      expect(validCities).not.toContain(route.to)
    })

    it('should exclude cities at maximum left office capacity', () => {
      const routeIndex = 0
      const route = state.map.routes[routeIndex]
      
      // Setup city with existing office but at max left office capacity
      state = setupCityWithOffices(state, route.from, {
        tokens: [createToken(1)], // Regular office
        leftOffices: Array(5).fill(null).map((_, i) => createToken(i % 3)) // 5 left offices (max)
      })
      state = setupCityWithOffices(state, route.to, {
        tokens: [createToken(1)], // Regular office
        leftOffices: Array(3).fill(null).map((_, i) => createToken(i % 3)) // 3 left offices (under max)
      })

      const validCities = validOfficeMarkerLocationsForRoute(state, routeIndex)
      
      expect(validCities).not.toContain(route.from) // At capacity
      expect(validCities).toContain(route.to) // Under capacity
    })

    it('should handle mixed scenarios correctly', () => {
      const routeIndex = 0
      const route = state.map.routes[routeIndex]
      
      // From city: has offices and room for left offices
      state = setupCityWithOffices(state, route.from, {
        tokens: [createToken(1), createToken(2)],
        leftOffices: [createToken(0)]
      })
      
      // To city: no offices
      state = setupCityWithOffices(state, route.to, {
        tokens: []
      })

      const validCities = validOfficeMarkerLocationsForRoute(state, routeIndex)
      
      expect(validCities).toContain(route.from)
      expect(validCities).not.toContain(route.to)
    })
  })

  describe('City requirements', () => {
    it('should require at least one existing office in target city', () => {
      const routeIndex = 0
      const route = state.map.routes[routeIndex]
      
      // Empty city
      state = setupCityWithOffices(state, route.from, {
        tokens: [],
        extras: [],
        leftOffices: []
      })

      const validCities = validOfficeMarkerLocationsForRoute(state, routeIndex)
      
      expect(validCities).not.toContain(route.from)
    })

    it('should accept cities with regular offices', () => {
      const routeIndex = 0
      const route = state.map.routes[routeIndex]
      
      state = setupCityWithOffices(state, route.from, {
        tokens: [createToken(1)]
      })

      const validCities = validOfficeMarkerLocationsForRoute(state, routeIndex)
      
      expect(validCities).toContain(route.from)
    })

    it('should not accept cities with only extra offices (only regular offices count)', () => {
      const routeIndex = 0
      const route = state.map.routes[routeIndex]
      
      state = setupCityWithOffices(state, route.from, {
        tokens: [],
        extras: [createToken(1)]
      })

      const validCities = validOfficeMarkerLocationsForRoute(state, routeIndex)
      
      expect(validCities).not.toContain(route.from)
    })

    it('should reject cities with only left offices', () => {
      const routeIndex = 0
      const route = state.map.routes[routeIndex]
      
      state = setupCityWithOffices(state, route.from, {
        tokens: [],
        extras: [],
        leftOffices: [createToken(1)]
      })

      const validCities = validOfficeMarkerLocationsForRoute(state, routeIndex)
      
      expect(validCities).not.toContain(route.from)
    })
  })

  describe('Left office capacity limits', () => {
    it('should enforce maximum of 5 left offices per city', () => {
      const routeIndex = 0
      const route = state.map.routes[routeIndex]
      
      // Test various left office counts
      for (let count = 0; count <= 6; count++) {
        state = setupCityWithOffices(state, route.from, {
          tokens: [createToken(1)], // Has regular office
          leftOffices: Array(count).fill(null).map(() => createToken(0))
        })

        const validCities = validOfficeMarkerLocationsForRoute(state, routeIndex)
        
        if (count < 5) {
          expect(validCities).toContain(route.from)
        } else {
          expect(validCities).not.toContain(route.from)
        }
      }
    })
  })
})