const DurationSlider = ({ value = 2, onChange, min = 0.5, max = 8, step = 0.5 }) => {
  const handleChange = (e) => {
    const newValue = parseFloat(e.target.value)
    onChange(newValue)
  }

  const formatDuration = (hours) => {
    if (hours === 1) return '1 hour'
    if (hours < 1) return `${(hours * 60)} minutes`
    return `${hours} hours`
  }

  return (
    <div className="mb-6">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Storm Duration
      </label>

      <div className="mb-2">
        <span className="text-lg font-semibold text-green-600">
          {formatDuration(value)}
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
                   [&::-webkit-slider-thumb]:bg-green-600
                   [&::-webkit-slider-thumb]:cursor-pointer
                   [&::-webkit-slider-thumb]:shadow-md
                   [&::-moz-range-thumb]:h-5
                   [&::-moz-range-thumb]:w-5
                   [&::-moz-range-thumb]:rounded-full
                   [&::-moz-range-thumb]:bg-green-600
                   [&::-moz-range-thumb]:cursor-pointer
                   [&::-moz-range-thumb]:border-none"
      />

      <div className="flex justify-between text-xs text-gray-500 mt-1">
        <span>30min</span>
        <span>8hrs</span>
      </div>
    </div>
  )
}

export default DurationSlider