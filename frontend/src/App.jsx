import { useState } from 'react'
import FloodMap from './components/Map/FloodMap'
import RainfallSlider from './components/Controls/RainfallSlider'
import DurationSlider from './components/Controls/DurationSlider'
import SimulationButton from './components/Controls/SimulationButton'

function App() {
  const [rainfall, setRainfall] = useState(5.0)
  const [duration, setDuration] = useState(2.0)
  const [loading, setLoading] = useState(false)

  const handleRunSimulation = async () => {
    setLoading(true)

    try {
      const response = await fetch('/api/simulation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ rainfall, duration }),
      })

      const data = await response.json()
      console.log('Simulation results:', data)
    } catch (error) {
      console.error('Simulation failed:', error)
    } finally {
      setLoading(false)
    }
  }

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

          <RainfallSlider
            value={rainfall}
            onChange={setRainfall}
          />

          <DurationSlider
            value={duration}
            onChange={setDuration}
          />

          <SimulationButton
            onClick={handleRunSimulation}
            loading={loading}
          />

          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h3 className="text-sm font-medium text-blue-800 mb-2">Current Parameters</h3>
            <p className="text-sm text-blue-600">
              {rainfall.toFixed(1)}" of rain over {duration} hour{duration === 1 ? '' : 's'}
            </p>
          </div>
        </aside>
      </main>
    </div>
  )
}

export default App
