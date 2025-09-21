import { useSelector, useDispatch } from 'react-redux'
import { selectRainfall, setRainfall } from '../../store/slices/simulationSlice'

const RainfallSlider = ({ min = 0, max = 20, step = 0.1 }) => {
  const dispatch = useDispatch()
  const value = useSelector(selectRainfall)

  const handleChange = (e) => {
    const newValue = parseFloat(e.target.value)
    dispatch(setRainfall(newValue))
  }

  return (
    <div className="mb-6">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Rainfall Amount
      </label>

      <div className="mb-2">
        <span className="text-lg font-semibold text-blue-600">
          {value.toFixed(1)} inches
        </span>
      </div>

      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={handleChange}
        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer
                   [&::-webkit-slider-thumb]:appearance-none
                   [&::-webkit-slider-thumb]:h-5
                   [&::-webkit-slider-thumb]:w-5
                   [&::-webkit-slider-thumb]:rounded-full
                   [&::-webkit-slider-thumb]:bg-blue-600
                   [&::-webkit-slider-thumb]:cursor-pointer
                   [&::-webkit-slider-thumb]:shadow-md
                   [&::-moz-range-thumb]:h-5
                   [&::-moz-range-thumb]:w-5
                   [&::-moz-range-thumb]:rounded-full
                   [&::-moz-range-thumb]:bg-blue-600
                   [&::-moz-range-thumb]:cursor-pointer
                   [&::-moz-range-thumb]:border-none"
      />

      <div className="flex justify-between text-xs text-gray-500 mt-1">
        <span>{min}"</span>
        <span>{max}"</span>
      </div>
    </div>
  )
}

export default RainfallSlider