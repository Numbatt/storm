import { configureStore } from '@reduxjs/toolkit'
import { persistStore, persistReducer } from 'redux-persist'
import storage from 'redux-persist/lib/storage'
import { combineReducers } from '@reduxjs/toolkit'

import simulationReducer from './slices/simulationSlice'

// Redux persist configuration
const persistConfig = {
  key: 'root',
  storage,
  whitelist: ['simulation'], // Only persist simulation slice
  transforms: [
    // Don't persist loading, error, or results - only user preferences
    {
      in: (state) => ({
        ...state,
        loading: false,
        error: null,
        results: null,
        statistics: null,
        lastSimulationTime: null
      }),
      out: (state) => state
    }
  ]
}

const rootReducer = combineReducers({
  simulation: simulationReducer
})

const persistedReducer = persistReducer(persistConfig, rootReducer)

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE']
      }
    })
})

export const persistor = persistStore(store)