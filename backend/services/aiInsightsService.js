const OpenAI = require('openai');
const dotenv = require('dotenv');

dotenv.config();

class AIInsightsService {
  constructor() {
    this.client = null;
    
    if (process.env.OPENAI_API_KEY) {
      try {
        this.client = new OpenAI({
          apiKey: process.env.OPENAI_API_KEY
        });
      } catch (error) {
        console.warn('Failed to initialize OpenAI client:', error.message);
      }
    } else {
      console.warn('OPENAI_API_KEY not found in environment variables');
    }
  }

  /**
   * Generate AI insights from flood analysis data
   * @param {Object} analysisData - Complete flood analysis results
   * @returns {Promise<string|null>} - AI-generated insights or null if unavailable
   */
  async generateAIInsights(analysisData) {
    if (!this.client) {
      return null;
    }

    try {
      const coords = analysisData.coords || {};
      const lat = coords.lat || 'Unknown';
      const lon = coords.lon || 'Unknown';
      
      const risk = analysisData.risk || {};
      const riskScore = risk.score || 0;
      const riskLevel = risk.level || 'Unknown';
      
      const surfaces = analysisData.surfaces || {};
      const asphaltPct = surfaces.asphalt || 0;
      const greeneryPct = surfaces.greenery || 0;
      
      const elevationM = analysisData.elevation_m || 0;
      const slopePct = analysisData.slope_pct || 0;
      const rainfallMm = analysisData.rainfall_mm || 0;
      
      const recommendation = analysisData.recommendation || {};
      const interventions = recommendation.interventions || [];
      
      const prompt = `You are a flood risk assessment expert analyzing street-level conditions. Provide clear, actionable insights in exactly 4 sections:

**ANALYSIS DATA:**
- Location: ${lat}, ${lon}
- Elevation: ${elevationM}m
- Terrain slope: ${slopePct}%
- Expected rainfall: ${rainfallMm}mm
- Surface coverage: ${asphaltPct}% asphalt, ${greeneryPct}% greenery
- Current flood risk: ${riskScore}/100 (${riskLevel})
- Available interventions: ${interventions.length} recommended actions

**REQUIRED OUTPUT FORMAT:**

### Terrain & Risk Summary
[2-3 sentences about the elevation, slope, and surface conditions. Explain why this creates the current risk level.]

### Infrastructure Actions
[List the top 3 most cost-effective interventions with format: "• Action Name - Cost range: $X-$Y - Reduces flood risk by Z%"]

### Community Safety
[2-3 sentences about immediate safety actions residents can take, including evacuation routes, shelter-in-place recommendations, or emergency preparedness specific to this risk level.]

### Combined Impact
[1-2 sentences stating the total flood reduction percentage if all interventions are applied, and whether this brings the area to LOW, MEDIUM, or HIGH risk.]

Keep each section concise and actionable. Use specific numbers from the data provided.`;

      const response = await this.client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a flood risk assessment expert who provides clear, actionable insights for urban planning and community safety.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 800,
        temperature: 0.3,
        timeout: 30000
      });

      return response.choices[0].message.content.trim();
      
    } catch (error) {
      console.error('Error generating AI insights:', error);
      return null;
    }
  }

  /**
   * Generate AI insights for dynamic rainfall scenarios
   * @param {Object} baseAnalysis - Original flood analysis results
   * @param {number} newRainfallMm - New rainfall amount from slider
   * @returns {Promise<string|null>} - Updated AI insights or null if unavailable
   */
  async generateDynamicInsights(baseAnalysis, newRainfallMm) {
    if (!this.client) {
      return null;
    }

    try {
      // Update the analysis with new rainfall
      const updatedAnalysis = { ...baseAnalysis };
      updatedAnalysis.rainfall_mm = newRainfallMm;
      
      // Recalculate approximate risk score based on rainfall change
      const originalRainfall = baseAnalysis.rainfall_mm || 25;
      const originalScore = baseAnalysis.risk?.score || 50;
      
      // Simple linear adjustment - in production, this should call the full scoring pipeline
      const rainfallFactor = newRainfallMm / Math.max(originalRainfall, 1);
      const adjustedScore = Math.min(100, originalScore * rainfallFactor);
      
      // Determine new risk level
      let newRiskLevel;
      if (adjustedScore <= 33) {
        newRiskLevel = 'LOW';
      } else if (adjustedScore <= 66) {
        newRiskLevel = 'MEDIUM';
      } else {
        newRiskLevel = 'HIGH';
      }
      
      updatedAnalysis.risk = {
        score: adjustedScore,
        level: newRiskLevel
      };
      
      // Generate insights for the updated scenario
      return await this.generateAIInsights(updatedAnalysis);
      
    } catch (error) {
      console.error('Error generating dynamic AI insights:', error);
      return null;
    }
  }

  /**
   * Check if AI insights service is available
   * @returns {boolean} - True if OpenAI client is initialized
   */
  isAvailable() {
    return this.client !== null;
  }
}

module.exports = AIInsightsService;
