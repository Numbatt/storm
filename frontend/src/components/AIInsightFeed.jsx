import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

// Insights Board Component (formerly AI Insight Feed)
function AIInsightFeed({ results, isAnalyzing, rainfallValue, onRainfallChange }) {
  const [currentRainfall, setCurrentRainfall] = useState(rainfallValue || 25)

  // Handle rainfall slider change
  const handleRainfallChange = (newRainfall) => {
    setCurrentRainfall(newRainfall)
    if (onRainfallChange) {
      onRainfallChange(newRainfall)
    }
  }

  // Generate structured insights from numeric data
  const generateStructuredInsights = () => {
    if (!results) return null

    const insights = {
      terrain: null,
      surfaceImpact: null,
      recommendations: null,
      community: null
    }

    // Terrain & Risk Summary
    if (results.elevation_m !== undefined && results.slope_pct !== undefined && results.risk) {
      const elevation = results.elevation_m
      const slope = results.slope_pct
      const riskScore = results.risk.score
      const riskLevel = results.risk.level

      insights.terrain = `${riskLevel} flood risk (${riskScore.toFixed(1)}/100) with ${elevation.toFixed(1)}m elevation and ${slope.toFixed(2)}% slope. ${
        slope > 5 ? 'Good natural drainage potential' : slope > 2 ? 'Moderate drainage conditions' : 'Poor drainage - water pooling likely'
      }. ${
        elevation > 100 ? 'High ground advantage reduces flooding risk' : elevation > 50 ? 'Moderate elevation provides some protection' : 'Low-lying area increases flood vulnerability'
      }.`
    }

    // Surface Coverage Impact
    if (results.surfaces) {
      const asphalt = results.surfaces.asphalt
      const greenery = results.surfaces.greenery
      const other = results.surfaces.other

      insights.surfaceImpact = `Surface analysis shows ${asphalt.toFixed(1)}% impermeable asphalt, ${greenery.toFixed(1)}% vegetation, and ${other.toFixed(1)}% other structures. ${
        asphalt > 60 ? 'High impermeable coverage significantly increases runoff and flood risk' :
        asphalt > 40 ? 'Moderate impermeable coverage contributes to flooding concerns' :
        'Lower impermeable coverage helps with natural drainage'
      }. ${
        greenery > 30 ? 'Good vegetation coverage provides natural flood mitigation' :
        greenery > 15 ? 'Moderate vegetation helps with water absorption' :
        'Limited vegetation reduces natural drainage capacity'
      }.`
    }

    // Infrastructure Recommendations
    if (results.recommendation?.interventions) {
      const topIntervention = results.recommendation.interventions[0]
      const totalCost = results.recommendation.total_cost?.mid
      const totalReduction = results.recommendation.total_flood_reduction_pct

      if (topIntervention) {
        const interventionType = topIntervention.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
        insights.recommendations = `Most cost-effective intervention: ${interventionType} providing ${topIntervention.flood_reduction_pct}% flood reduction for $${Math.round(topIntervention.cost_mid / 1000)}K over ${topIntervention.construction_time}. Total project cost: $${Math.round(totalCost / 1000)}K for ${totalReduction}% overall flood reduction across ${results.recommendation.interventions.length} interventions.`
      }
    }

    // Community Safety Guidance
    if (results.coords && results.risk) {
      const riskLevel = results.risk.level
      insights.community = `${
        riskLevel === 'HIGH' ? 'IMMEDIATE ACTION: Prepare evacuation plans and monitor weather alerts constantly' :
        riskLevel === 'MEDIUM' ? 'ELEVATED PRECAUTIONS: Maintain emergency supplies and evacuation awareness' :
        'STANDARD PREPAREDNESS: Stay informed and help neighbors in higher-risk areas'
      }. Avoid driving through standing water. ${
        results.elevation_m < 50 ? 'Consider moving to higher floors during severe weather' : 'Monitor flood warnings and be ready to assist others'
      }. Emergency contact: 911. Weather alerts: local emergency management.`
    }

    return insights
  }

  const structuredInsights = generateStructuredInsights()
  const hasResults = results && (results.risk || results.surfaces || results.recommendation)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[#7dd3ff] mb-2">📊 Insights Board</h2>
        <p className="text-gray-300">Dynamic scenario planning and flood resilience insights</p>
      </div>

      {/* Rainfall Slider */}
      <div className="bg-white/5 rounded-xl border border-white/10 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white flex items-center">
            <svg className="w-5 h-5 mr-2 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
            </svg>
            🌧️ Rainfall Scenario Planning
          </h3>
          <div className="text-right">
            <div className="text-2xl font-bold text-blue-400">{currentRainfall}mm</div>
            <div className="text-xs text-gray-400">24-hour rainfall</div>
          </div>
        </div>
        
        <div className="space-y-4">
          <div className="relative">
            <input
              type="range"
              min="5"
              max="200"
              step="5"
              value={currentRainfall}
              onChange={(e) => handleRainfallChange(Number(e.target.value))}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer rainfall-slider"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-2">
              <span>5mm (Light)</span>
              <span>50mm (Moderate)</span>
              <span>100mm (Heavy)</span>
              <span>200mm (Extreme)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Insights Display */}
      <AnimatePresence mode="wait">
        {isAnalyzing && !hasResults ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white/5 rounded-xl border border-white/10 p-6">
                <div className="animate-pulse">
                  <div className="h-6 bg-gray-700 rounded w-1/3 mb-3"></div>
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-700 rounded"></div>
                    <div className="h-4 bg-gray-700 rounded w-5/6"></div>
                    <div className="h-4 bg-gray-700 rounded w-3/4"></div>
                  </div>
                </div>
              </div>
            ))}
          </motion.div>
        ) : hasResults ? (
          <motion.div
            key="structured-insights"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
            className="space-y-4"
          >
            {/* Terrain & Risk Summary */}
            {structuredInsights?.terrain && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/30 rounded-xl p-6"
              >
                <h3 className="text-lg font-semibold text-yellow-400 mb-3 flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                  </svg>
                  🏔️ Terrain & Risk Summary
                  {results?.risk && (
                    <span className={`ml-2 px-2 py-1 rounded-full text-xs font-bold ${
                      results.risk.level === 'HIGH' ? 'bg-red-500/20 text-red-300' :
                      results.risk.level === 'MEDIUM' ? 'bg-orange-500/20 text-orange-300' :
                      'bg-green-500/20 text-green-300'
                    }`}>
                      {results.risk.score.toFixed(0)}/100
                    </span>
                  )}
                </h3>
                <p className="text-gray-300 leading-relaxed">{structuredInsights.terrain}</p>
              </motion.div>
            )}

            {/* Surface Coverage Impact */}
            {structuredInsights?.surfaceImpact && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-gradient-to-r from-gray-500/10 to-gray-600/10 border border-gray-500/30 rounded-xl p-6"
              >
                <h3 className="text-lg font-semibold text-gray-300 mb-3 flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                  </svg>
                  🏠 Surface Coverage Impact
                  {results?.surfaces && (
                    <span className="ml-2 text-xs text-gray-400">
                      {results.surfaces.asphalt.toFixed(0)}% asphalt • {results.surfaces.greenery.toFixed(0)}% vegetation
                    </span>
                  )}
                </h3>
                <p className="text-gray-300 leading-relaxed">{structuredInsights.surfaceImpact}</p>
              </motion.div>
            )}

            {/* Infrastructure Recommendations */}
            {structuredInsights?.recommendations && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border border-blue-500/30 rounded-xl p-6"
              >
                <h3 className="text-lg font-semibold text-blue-400 mb-3 flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  🏗️ Infrastructure Recommendations
                  {results?.recommendation && (
                    <span className="ml-2 text-xs text-blue-300">
                      ${Math.round(results.recommendation.total_cost?.mid / 1000)}K total • {results.recommendation.total_flood_reduction_pct}% reduction
                    </span>
                  )}
                </h3>
                <p className="text-gray-300 leading-relaxed">{structuredInsights.recommendations}</p>
              </motion.div>
            )}

            {/* Community Safety Guidance */}
            {structuredInsights?.community && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/30 rounded-xl p-6"
              >
                <h3 className="text-lg font-semibold text-green-400 mb-3 flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 515.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 919.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  👥 Community Safety Guidance
                  {results?.risk && (
                    <span className={`ml-2 px-2 py-1 rounded-full text-xs font-bold ${
                      results.risk.level === 'HIGH' ? 'bg-red-500/20 text-red-300' :
                      results.risk.level === 'MEDIUM' ? 'bg-orange-500/20 text-orange-300' :
                      'bg-green-500/20 text-green-300'
                    }`}>
                      {results.risk.level}
                    </span>
                  )}
                </h3>
                <p className="text-gray-300 leading-relaxed">{structuredInsights.community}</p>
                
                {/* Add Google Maps link for evacuation routes */}
                <div className="mt-4 pt-4 border-t border-green-500/20">
                  <a
                    href={`https://www.google.com/maps/search/evacuation+routes+near+${results?.coords?.lat},${results?.coords?.lon}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-4 py-2 bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 rounded-lg text-green-300 text-sm font-medium transition-colors"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 4m0 13V4m-6 3l6-3" />
                    </svg>
                    View Evacuation Routes
                  </a>
                </div>
              </motion.div>
            )}
          </motion.div>
        ) : (
          /* No results available yet */
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-6 text-center"
          >
            <svg className="w-12 h-12 text-blue-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <h3 className="text-blue-400 font-semibold mb-2">Insights Board Ready</h3>
            <p className="text-blue-300 text-sm">
              Run analysis to populate the board with terrain analysis, surface coverage impact, infrastructure recommendations, and community safety guidance.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default AIInsightFeed