const { spawn } = require('child_process');
const path = require('path');

class FloodAnalysisService {
  constructor() {
    this.apiPath = path.join(__dirname, '../api');
    this.mainScript = path.join(this.apiPath, 'main.py');
  }

  /**
   * Analyze flood risk for given coordinates using the Python API
   * @param {number} lat - Latitude
   * @param {number} lon - Longitude  
   * @param {Object} options - Additional parameters
   * @returns {Promise<Object>} Analysis results
   */
  async analyzeCoordinates(lat, lon, options = {}) {
    return new Promise((resolve, reject) => {
      // Validate coordinates
      if (typeof lat !== 'number' || typeof lon !== 'number') {
        return reject(new Error('Invalid coordinates: lat and lon must be numbers'));
      }

      if (lat < -90 || lat > 90) {
        return reject(new Error('Invalid latitude: must be between -90 and 90'));
      }

      if (lon < -180 || lon > 180) {
        return reject(new Error('Invalid longitude: must be between -180 and 180'));
      }

      // Prepare command arguments
      const args = [
        this.mainScript,
        '--lat', lat.toString(),
        '--lon', lon.toString(),
        '--json'
      ];

      // Add environment variables for Python
      const env = { 
        ...process.env,
        PYTHONUNBUFFERED: '1',  // Ensure Python output is not buffered
        PYTHONWARNINGS: 'ignore'  // Suppress Python warnings
      };

      // Add optional parameters
      if (options.rainfall) {
        args.push('--rainfall', options.rainfall.toString());
      }

      if (options.drains) {
        args.push('--drains', options.drains);
      }

      if (options.road_type) {
        args.push('--road-type', options.road_type);
      }

      if (options.debug) {
        args.push('--debug');
      }

      console.log(`Executing flood analysis for coordinates: ${lat}, ${lon}`);
      // Execute Python script using the virtual environment
      const pythonPath = path.join(this.apiPath, 'venv', 'bin', 'python3')
      console.log(`Command: ${pythonPath} ${args.join(' ')}`);
      
      const python = spawn(pythonPath, args, {
        cwd: this.apiPath,
        stdio: ['ignore', 'pipe', 'pipe'],
        env: env
      });

      let stdout = '';
      let stderr = '';

      python.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      python.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      python.on('close', (code) => {
        if (code !== 0) {
          console.error(`Python script exited with code ${code}`);
          console.error('STDERR:', stderr);
          return reject(new Error(`Analysis failed: ${stderr || 'Unknown error'}`));
        }

        try {
          // Clean stdout - find the JSON part
          let cleanOutput = stdout;
          
          // Look for the opening brace of JSON
          const jsonStart = stdout.indexOf('{');
          if (jsonStart > 0) {
            cleanOutput = stdout.substring(jsonStart);
          }
          
          // Look for the closing brace and remove anything after
          const lastBrace = cleanOutput.lastIndexOf('}');
          if (lastBrace > 0) {
            cleanOutput = cleanOutput.substring(0, lastBrace + 1);
          }
          
          // Parse JSON output
          const result = JSON.parse(cleanOutput);
          
          // Add additional metadata
          result.analysisMetadata = {
            timestamp: new Date().toISOString(),
            processingTime: result.timestamp ? 
              new Date() - new Date(result.timestamp) : null,
            coordinates: { lat, lon },
            parameters: options
          };

          console.log(`Analysis completed successfully for ${lat}, ${lon}`);
          resolve(result);
        } catch (parseError) {
          console.error('Failed to parse JSON output:', parseError);
          console.error('Raw output length:', stdout.length);
          console.error('Raw output preview:', stdout.substring(0, 200));
          reject(new Error(`Failed to parse analysis results: ${parseError.message}`));
        }
      });

      python.on('error', (error) => {
        console.error('Failed to start Python process:', error);
        reject(new Error(`Failed to execute analysis: ${error.message}`));
      });

      // Set timeout for long-running processes
      setTimeout(() => {
        python.kill();
        reject(new Error('Analysis timeout: Process took too long to complete'));
      }, 60000); // 60 second timeout
    });
  }

  /**
   * Check if the Python API dependencies are available
   * @returns {Promise<Object>} Health check results
   */
  async healthCheck() {
    return new Promise((resolve) => {
      const pythonPath = path.join(this.apiPath, 'venv', 'bin', 'python3')
      const python = spawn(pythonPath, ['-c', 'import sys; print(sys.version)'], {
        cwd: this.apiPath,
        stdio: ['ignore', 'pipe', 'pipe']
      });

      let pythonAvailable = false;
      let pythonVersion = '';

      python.stdout.on('data', (data) => {
        pythonAvailable = true;
        pythonVersion = data.toString().trim();
      });

      python.on('close', (code) => {
        // Check if main script exists
        const fs = require('fs');
        const mainExists = fs.existsSync(this.mainScript);
        
        // Check if config exists
        const configPath = path.join(this.apiPath, 'config.yaml');
        const configExists = fs.existsSync(configPath);

        resolve({
          status: pythonAvailable && mainExists && configExists ? 'healthy' : 'unhealthy',
          python: {
            available: pythonAvailable,
            version: pythonVersion,
            exitCode: code
          },
          files: {
            mainScript: mainExists,
            config: configExists
          },
          apiPath: this.apiPath
        });
      });

      python.on('error', () => {
        resolve({
          status: 'unhealthy',
          python: {
            available: false,
            error: 'Python not found or not executable'
          },
          files: {
            mainScript: false,
            config: false
          },
          apiPath: this.apiPath
        });
      });
    });
  }

  /**
   * Get available test coordinates (from processed images)
   * @returns {Array} Array of available coordinate sets
   */
  getAvailableCoordinates() {
    const fs = require('fs');
    const dataDir = path.join(this.apiPath, 'data', 'processed');
    
    if (!fs.existsSync(dataDir)) {
      return [];
    }

    try {
      const files = fs.readdirSync(dataDir);
      const coordinates = new Set();

      files.forEach(file => {
        // Match pattern: lat_lon_angle.jpg
        const match = file.match(/^([-\d.]+)_([-\d.]+)_\d+\.jpg$/);
        if (match) {
          const lat = parseFloat(match[1]);
          const lon = parseFloat(match[2]);
          coordinates.add(`${lat},${lon}`);
        }
      });

      return Array.from(coordinates).map(coord => {
        const [lat, lon] = coord.split(',').map(parseFloat);
        return { lat, lon };
      });
    } catch (error) {
      console.error('Error reading processed images directory:', error);
      return [];
    }
  }

  /**
   * Validate if coordinates have processed images available
   * @param {number} lat - Latitude
   * @param {number} lon - Longitude
   * @returns {boolean} True if images are available
   */
  hasProcessedImages(lat, lon) {
    const fs = require('fs');
    const dataDir = path.join(this.apiPath, 'data', 'processed');
    
    if (!fs.existsSync(dataDir)) {
      return false;
    }

    // Check for all 4 angle images
    const angles = [0, 90, 180, 270];
    return angles.every(angle => {
      const imagePath = path.join(dataDir, `${lat}_${lon}_${angle}.jpg`);
      return fs.existsSync(imagePath);
    });
  }
}

module.exports = FloodAnalysisService;
