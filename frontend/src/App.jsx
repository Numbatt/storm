import { useSelector } from 'react-redux'
import { selectRainfall, selectDuration, selectLoading, selectError, selectResults, selectStatistics } from './store/slices/simulationSlice'
import FloodMap from './components/Map/FloodMap'
import RainfallSlider from './components/Controls/RainfallSlider'
import DurationSlider from './components/Controls/DurationSlider'
import SimulationButton from './components/Controls/SimulationButton'

function App() {
  const rainfall = useSelector(selectRainfall)
  const duration = useSelector(selectDuration)
  const loading = useSelector(selectLoading)
  const error = useSelector(selectError)
  const results = useSelector(selectResults)
  const statistics = useSelector(selectStatistics)

  return (
    <div className="h-screen w-screen flex flex-col">
      <header className="bg-blue-600 text-white p-4">
        <h1 className="text-2xl font-bold">Fifth Ward Flood Simulation</h1>
        <p className="text-blue-100">Houston, Texas - Interactive Flood Risk Assessment</p>
      </header>

      <main className="flex-1 flex">
        <div className="flex-1">
          <FloodMap />
        </div>

        <aside className="w-80 bg-gray-50 p-6 border-l overflow-y-auto">
          <h2 className="text-lg font-semibold mb-6">Simulation Controls</h2>

          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          <RainfallSlider />
          <DurationSlider />
          <SimulationButton />

          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h3 className="text-sm font-medium text-blue-800 mb-2">Current Parameters</h3>
            <p className="text-sm text-blue-600">
              {rainfall.toFixed(1)}" of rain over {duration} hour{duration === 1 ? '' : 's'}
            </p>
          </div>

          {results && statistics && (
            <div className="mt-6 p-4 bg-green-50 rounded-lg">
              <h3 className="text-sm font-medium text-green-800 mb-2">Simulation Results</h3>
              <div className="text-sm text-green-600 space-y-1">
                <p>Risk Markers: {results.length}</p>
                <p>High Risk: {statistics.highRisk}</p>
                <p>Moderate Risk: {statistics.moderateRisk}</p>
                <p>Low Risk: {statistics.lowRisk}</p>
              </div>
            </div>
          )}
        </aside>
      </main>
    </div>
  )
}

export default App
