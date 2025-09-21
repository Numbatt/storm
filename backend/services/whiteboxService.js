const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

/**
 * WhiteboxService - Advanced hydrological analysis using WhiteboxTools
 * Provides flow accumulation, slope, watershed, and flow length calculations
 */
class WhiteboxService {
  constructor(demPath) {
    this.demPath = demPath;
    this.tempDir = path.join(os.tmpdir(), 'whitebox_storm_' + Date.now());
    this.cache = new Map(); // Simple in-memory cache for results
    this.ensureTempDir();
  }

  ensureTempDir() {
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  /**
   * Execute WhiteboxTools command via Python
   */
  async executeWhiteboxCommand(toolName, parameters) {
    console.log(`🔧 WhiteboxTools: Executing ${toolName} with parameters: ${parameters}`);

    return new Promise((resolve, reject) => {
      const pythonScript = `
import sys
import whitebox
import os

wbt = whitebox.WhiteboxTools()
wbt.set_verbose_mode(True)  # Enable verbose for debugging
wbt.set_max_procs(1)

print(f"WhiteboxTools version: {wbt.version()}")
print(f"Working directory: {os.getcwd()}")
print(f"Executing tool: ${toolName}")
print(f"Parameters: ${parameters}")

try:
    result = wbt.${toolName}(${parameters})
    print(f"Tool execution result code: {result}")
    if result == 0:
        print("SUCCESS: Tool completed successfully")
    else:
        print(f"ERROR: Tool execution failed with code {result}")
        sys.exit(1)
except Exception as e:
    print(f"ERROR: Exception during tool execution: {str(e)}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
`;

      const pythonProcess = spawn('python3', ['-c', pythonScript]);

      let stdout = '';
      let stderr = '';

      pythonProcess.stdout.on('data', (data) => {
        const output = data.toString();
        stdout += output;
        console.log(`📊 WhiteboxTools stdout: ${output.trim()}`);
      });

      pythonProcess.stderr.on('data', (data) => {
        const output = data.toString();
        stderr += output;
        console.log(`⚠️ WhiteboxTools stderr: ${output.trim()}`);
      });

      pythonProcess.on('close', (code) => {
        console.log(`✅ WhiteboxTools process closed with code: ${code}`);
        if (code === 0 && stdout.includes('SUCCESS')) {
          console.log(`✅ WhiteboxTools ${toolName} completed successfully`);
          resolve(stdout);
        } else {
          const errorMsg = `WhiteboxTools ${toolName} failed: ${stderr || stdout || 'Unknown error'}`;
          console.error(`❌ ${errorMsg}`);
          reject(new Error(errorMsg));
        }
      });

      pythonProcess.on('error', (error) => {
        const errorMsg = `Python process error for ${toolName}: ${error.message}`;
        console.error(`❌ ${errorMsg}`);
        reject(new Error(errorMsg));
      });
    });
  }

  /**
   * Calculate flow accumulation from DEM
   * Essential for understanding water flow patterns
   */
  async calculateFlowAccumulation() {
    const cacheKey = 'flow_accumulation_' + path.basename(this.demPath);

    if (this.cache.has(cacheKey)) {
      console.log('Using cached flow accumulation data');
      return this.cache.get(cacheKey);
    }

    try {
      const outputPath = path.join(this.tempDir, 'flow_accumulation.tif');

      console.log('Calculating flow accumulation with WhiteboxTools...');

      // First, calculate flow direction (D8 algorithm)
      const flowDirPath = path.join(this.tempDir, 'flow_direction.tif');
      const flowDirParams = `i="${this.demPath}", output="${flowDirPath}"`;
      await this.executeWhiteboxCommand('d8_pointer', flowDirParams);

      // Then calculate flow accumulation
      const flowAccParams = `i="${flowDirPath}", output="${outputPath}"`;
      await this.executeWhiteboxCommand('d8_flow_accumulation', flowAccParams);

      // Cache the result path
      this.cache.set(cacheKey, outputPath);
      console.log('Flow accumulation calculation completed');

      return outputPath;
    } catch (error) {
      console.error('Error calculating flow accumulation:', error.message);
      throw error;
    }
  }

  /**
   * Calculate slope from DEM
   * More accurate than simplified approximation
   */
  async calculateSlope() {
    const cacheKey = 'slope_' + path.basename(this.demPath);

    if (this.cache.has(cacheKey)) {
      console.log('Using cached slope data');
      return this.cache.get(cacheKey);
    }

    try {
      const outputPath = path.join(this.tempDir, 'slope.tif');

      console.log('Calculating slope with WhiteboxTools...');

      const slopeParams = `dem="${this.demPath}", output="${outputPath}", units="degrees"`;
      await this.executeWhiteboxCommand('slope', slopeParams);

      this.cache.set(cacheKey, outputPath);
      console.log('Slope calculation completed');

      return outputPath;
    } catch (error) {
      console.error('Error calculating slope:', error.message);
      throw error;
    }
  }

  /**
   * Perform watershed analysis
   * Identifies drainage basins and catchment areas
   */
  async calculateWatersheds() {
    const cacheKey = 'watersheds_' + path.basename(this.demPath);

    if (this.cache.has(cacheKey)) {
      console.log('Using cached watershed data');
      return this.cache.get(cacheKey);
    }

    try {
      const outputPath = path.join(this.tempDir, 'watersheds.tif');

      console.log('Calculating watersheds with WhiteboxTools...');

      // First get flow direction if not already calculated
      const flowDirPath = path.join(this.tempDir, 'flow_direction.tif');
      if (!fs.existsSync(flowDirPath)) {
        const flowDirParams = `i="${this.demPath}", output="${flowDirPath}"`;
        await this.executeWhiteboxCommand('d8_pointer', flowDirParams);
      }

      // Calculate watersheds
      const watershedParams = `d8_pntr="${flowDirPath}", output="${outputPath}"`;
      await this.executeWhiteboxCommand('watershed', watershedParams);

      this.cache.set(cacheKey, outputPath);
      console.log('Watershed calculation completed');

      return outputPath;
    } catch (error) {
      console.error('Error calculating watersheds:', error.message);
      throw error;
    }
  }

  /**
   * Calculate flow length
   * Distance that water travels to reach outlet
   */
  async calculateFlowLength() {
    const cacheKey = 'flow_length_' + path.basename(this.demPath);

    if (this.cache.has(cacheKey)) {
      console.log('Using cached flow length data');
      return this.cache.get(cacheKey);
    }

    try {
      const outputPath = path.join(this.tempDir, 'flow_length.tif');

      console.log('Calculating flow length with WhiteboxTools...');

      // Get flow direction if not already calculated
      const flowDirPath = path.join(this.tempDir, 'flow_direction.tif');
      if (!fs.existsSync(flowDirPath)) {
        const flowDirParams = `i="${this.demPath}", output="${flowDirPath}"`;
        await this.executeWhiteboxCommand('d8_pointer', flowDirParams);
      }

      // Calculate flow length
      const flowLengthParams = `d8_pntr="${flowDirPath}", output="${outputPath}"`;
      await this.executeWhiteboxCommand('d8_flow_length', flowLengthParams);

      this.cache.set(cacheKey, outputPath);
      console.log('Flow length calculation completed');

      return outputPath;
    } catch (error) {
      console.error('Error calculating flow length:', error.message);
      throw error;
    }
  }

  /**
   * Get value from raster at specific coordinates
   * Uses gdallocationinfo for precise coordinate lookup
   */
  async getValueAtCoordinate(rasterPath, longitude, latitude) {
    try {
      // Convert WGS84 to UTM coordinates first
      const { execSync } = require('child_process');
      const utmCommand = `echo "${longitude} ${latitude}" | gdaltransform -s_srs EPSG:4326 -t_srs EPSG:26915`;
      const utmResult = execSync(utmCommand, { encoding: 'utf8' }).trim().split(' ');
      const utmX = parseFloat(utmResult[0]);
      const utmY = parseFloat(utmResult[1]);

      // Get value from raster
      const valueCommand = `gdallocationinfo -valonly -geoloc "${rasterPath}" ${utmX} ${utmY}`;
      const value = execSync(valueCommand, { encoding: 'utf8' }).trim();

      const numValue = parseFloat(value);
      return isNaN(numValue) ? null : numValue;
    } catch (error) {
      console.error(`Error getting value at ${longitude}, ${latitude}:`, error.message);
      return null;
    }
  }

  /**
   * Process all hydrological data for a point
   * Returns comprehensive hydrological analysis
   */
  async processPointHydrology(longitude, latitude) {
    console.log(`🌊 Processing hydrology for point: ${longitude}, ${latitude}`);

    try {
      console.log(`📍 Starting parallel raster calculations...`);

      // Calculate all raster layers in parallel for efficiency
      const [flowAccPath, slopePath, flowLengthPath] = await Promise.all([
        this.calculateFlowAccumulation(),
        this.calculateSlope(),
        this.calculateFlowLength()
      ]);

      console.log(`📊 Raster files generated:
        - Flow Accumulation: ${flowAccPath}
        - Slope: ${slopePath}
        - Flow Length: ${flowLengthPath}`);

      // Verify files exist
      const fs = require('fs');
      const filesExist = {
        flowAcc: fs.existsSync(flowAccPath),
        slope: fs.existsSync(slopePath),
        flowLength: fs.existsSync(flowLengthPath)
      };
      console.log(`📁 File existence check:`, filesExist);

      // Get values at the specific coordinate
      console.log(`📐 Extracting values at coordinates...`);
      const [flowAccumulation, slope, flowLength] = await Promise.all([
        this.getValueAtCoordinate(flowAccPath, longitude, latitude),
        this.getValueAtCoordinate(slopePath, longitude, latitude),
        this.getValueAtCoordinate(flowLengthPath, longitude, latitude)
      ]);

      const result = {
        flowAccumulation: flowAccumulation || 0,
        slope: slope || 0,
        flowLength: flowLength || 0,
        drainageArea: flowAccumulation ? Math.sqrt(flowAccumulation) : 0
      };

      console.log(`✅ Hydrology processed:`, result);
      return result;

    } catch (error) {
      console.error(`❌ Error processing point hydrology for ${longitude}, ${latitude}:`, error.message);
      console.error(`🔍 Error stack:`, error.stack);

      // Return default values if processing fails
      const defaultResult = {
        flowAccumulation: 0,
        slope: 0,
        flowLength: 0,
        drainageArea: 0
      };

      console.log(`🔄 Returning default values:`, defaultResult);
      return defaultResult;
    }
  }

  /**
   * Calculate enhanced drainage coefficient
   * Based on flow accumulation and slope
   */
  calculateDrainageCoefficient(flowAccumulation, slope) {
    // Higher flow accumulation = better drainage = lower coefficient
    // Higher slope = better drainage = lower coefficient

    const baseCoefficient = 0.5;
    const flowFactor = Math.max(0.1, 1 - (flowAccumulation / 1000)); // Normalize flow accumulation
    const slopeFactor = Math.max(0.1, 1 - (slope / 10)); // Normalize slope

    return baseCoefficient * flowFactor * slopeFactor;
  }

  /**
   * Cleanup temporary files
   */
  cleanup() {
    try {
      if (fs.existsSync(this.tempDir)) {
        fs.rmSync(this.tempDir, { recursive: true, force: true });
        console.log('WhiteboxService temporary files cleaned up');
      }
    } catch (error) {
      console.error('Error cleaning up temporary files:', error.message);
    }
  }

  /**
   * Get processing statistics
   */
  getStats() {
    return {
      cacheSize: this.cache.size,
      tempDir: this.tempDir,
      cacheKeys: Array.from(this.cache.keys())
    };
  }
}

module.exports = WhiteboxService;