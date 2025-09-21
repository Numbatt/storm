import { createSlice } from '@reduxjs/toolkit'

const initialState = {
  // Rainfall parameters
  rainfall: 5.0,
  duration: 2.0,

  // Simulation state
  loading: false,
  error: null,
  progressStage: null,

  // Results
  results: null,
  lastSimulationTime: null,

  // Statistics
  statistics: null
}

const simulationSlice = createSlice({
  name: 'simulation',
  initialState,
  reducers: {
    setRainfall: (state, action) => {
      const value = parseFloat(action.payload)
      if (value >= 0 && value <= 20) {
        state.rainfall = value
        state.error = null
      } else {
        state.error = 'Rainfall must be between 0 and 20 inches'
      }
    },

    setDuration: (state, action) => {
      const value = parseFloat(action.payload)
      if (value >= 0.5 && value <= 8) {
        state.duration = value
        state.error = null
      } else {
        state.error = 'Duration must be between 0.5 and 8 hours'
      }
    },

    setLoading: (state, action) => {
      state.loading = action.payload
      if (action.payload) {
        state.error = null
      } else {
        state.progressStage = null
      }
    },

    setProgressStage: (state, action) => {
      state.progressStage = action.payload
    },

    setResults: (state, action) => {
      state.results = action.payload.riskMarkers
      state.statistics = action.payload.statistics
      state.lastSimulationTime = Date.now()
      state.loading = false
      state.error = null
    },

    setError: (state, action) => {
      state.error = action.payload
      state.loading = false
    },

    clearResults: (state) => {
      state.results = null
      state.statistics = null
      state.lastSimulationTime = null
      state.error = null
    },

    clearError: (state) => {
      state.error = null
    }
  }
})

export const {
  setRainfall,
  setDuration,
  setLoading,
  setProgressStage,
  setResults,
  setError,
  clearResults,
  clearError
} = simulationSlice.actions

// Selectors
export const selectRainfall = (state) => state.simulation.rainfall
export const selectDuration = (state) => state.simulation.duration
export const selectLoading = (state) => state.simulation.loading
export const selectProgressStage = (state) => state.simulation.progressStage
export const selectError = (state) => state.simulation.error
export const selectResults = (state) => state.simulation.results
export const selectStatistics = (state) => state.simulation.statistics
export const selectLastSimulationTime = (state) => state.simulation.lastSimulationTime

// Thunk for running simulation
export const runSimulation = () => async (dispatch, getState) => {
  const { rainfall, duration } = getState().simulation

  dispatch(setLoading(true))
  dispatch(setProgressStage('Initializing simulation...'))

  try {
    dispatch(setProgressStage('Loading elevation data...'))

    const response = await fetch('/api/simulation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ rainfall, duration }),
    })

    dispatch(setProgressStage('Processing risk calculations...'))

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Simulation failed')
    }

    dispatch(setProgressStage('Generating map markers...'))
    const data = await response.json()

    dispatch(setProgressStage('Finalizing results...'))
    dispatch(setResults(data))

  } catch (error) {
    dispatch(setError(error.message))
  }
}

export default simulationSlice.reducer