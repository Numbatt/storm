#!/usr/bin/env python3
"""
Utility functions for I/O operations and data integrity checks.
"""

import os
import json
from pathlib import Path
from typing import Dict, List, Any, Optional
import numpy as np


def check_data_integrity(data_dir: str) -> Dict[str, Any]:
    """
    Check the integrity and availability of required data files.
    
    Args:
        data_dir: Directory containing processed data files
        
    Returns:
        Dictionary with integrity check results
    """
    data_path = Path(data_dir)
    
    # Required files for the application
    required_files = {
        'elevation': 'Z.npy',
        'flow_accumulation': 'ACC.npy', 
        'georeference': 'georef.json',
        'dem_tif': 'dem_quarter.tif'
    }
    
    # Check file existence and basic properties
    file_status = {}
    files_missing = []
    files_present = []
    
    for file_type, filename in required_files.items():
        file_path = data_path / filename
        
        if file_path.exists():
            files_present.append(filename)
            
            # Get file size
            file_size = file_path.stat().st_size
            
            # Additional checks for specific file types
            file_info = {
                'name': filename,
                'size_bytes': file_size,
                'size_mb': round(file_size / (1024 * 1024), 2),
                'exists': True
            }
            
            # Check numpy arrays
            if filename.endswith('.npy'):
                try:
                    arr = np.load(file_path)
                    file_info.update({
                        'shape': arr.shape,
                        'dtype': str(arr.dtype),
                        'has_nan': bool(np.isnan(arr).any()),
                        'min_val': float(np.nanmin(arr)),
                        'max_val': float(np.nanmax(arr))
                    })
                except Exception as e:
                    file_info['load_error'] = str(e)
            
            # Check JSON files
            elif filename.endswith('.json'):
                try:
                    with open(file_path, 'r') as f:
                        json_data = json.load(f)
                    file_info['keys'] = list(json_data.keys())
                except Exception as e:
                    file_info['parse_error'] = str(e)
            
            file_status[file_type] = file_info
        else:
            files_missing.append(filename)
            file_status[file_type] = {
                'name': filename,
                'exists': False
            }
    
    return {
        'data_directory': str(data_path),
        'directory_exists': data_path.exists(),
        'files_present': files_present,
        'files_missing': files_missing,
        'file_details': file_status,
        'total_files_required': len(required_files),
        'total_files_present': len(files_present),
        'integrity_status': 'complete' if not files_missing else 'incomplete'
    }


def list_data_files(data_dir: str) -> Dict[str, List[Dict[str, Any]]]:
    """
    List all data files in the specified directory with metadata.
    
    Args:
        data_dir: Directory to scan for data files
        
    Returns:
        Dictionary with categorized file lists
    """
    data_path = Path(data_dir)
    
    if not data_path.exists():
        return {
            'error': f'Directory {data_dir} does not exist',
            'numpy_files': [],
            'json_files': [],
            'tif_files': [],
            'other_files': []
        }
    
    # Categorize files by type
    numpy_files = []
    json_files = []
    tif_files = []
    other_files = []
    
    for file_path in data_path.iterdir():
        if file_path.is_file():
            file_info = {
                'name': file_path.name,
                'size_bytes': file_path.stat().st_size,
                'size_mb': round(file_path.stat().st_size / (1024 * 1024), 2),
                'modified': file_path.stat().st_mtime
            }
            
            if file_path.suffix == '.npy':
                numpy_files.append(file_info)
            elif file_path.suffix == '.json':
                json_files.append(file_info)
            elif file_path.suffix in ['.tif', '.tiff']:
                tif_files.append(file_info)
            else:
                other_files.append(file_info)
    
    return {
        'numpy_files': numpy_files,
        'json_files': json_files,
        'tif_files': tif_files,
        'other_files': other_files,
        'total_files': len(numpy_files) + len(json_files) + len(tif_files) + len(other_files)
    }


def get_file_info(file_path: str) -> Dict[str, Any]:
    """
    Get detailed information about a specific file.
    
    Args:
        file_path: Path to the file
        
    Returns:
        Dictionary with file information
    """
    path = Path(file_path)
    
    if not path.exists():
        return {'error': f'File {file_path} does not exist'}
    
    file_info = {
        'name': path.name,
        'path': str(path.absolute()),
        'size_bytes': path.stat().st_size,
        'size_mb': round(path.stat().st_size / (1024 * 1024), 2),
        'modified': path.stat().st_mtime,
        'extension': path.suffix
    }
    
    # Add type-specific information
    if path.suffix == '.npy':
        try:
            arr = np.load(path)
            file_info.update({
                'array_shape': arr.shape,
                'array_dtype': str(arr.dtype),
                'has_nan': bool(np.isnan(arr).any()),
                'min_value': float(np.nanmin(arr)),
                'max_value': float(np.nanmax(arr)),
                'mean_value': float(np.nanmean(arr)),
                'std_value': float(np.nanstd(arr))
            })
        except Exception as e:
            file_info['load_error'] = str(e)
    
    elif path.suffix == '.json':
        try:
            with open(path, 'r') as f:
                data = json.load(f)
            file_info['json_keys'] = list(data.keys())
            file_info['json_size'] = len(json.dumps(data))
        except Exception as e:
            file_info['parse_error'] = str(e)
    
    return file_info


def validate_georeference(georef_path: str) -> Dict[str, Any]:
    """
    Validate georeference information.
    
    Args:
        georef_path: Path to georeference JSON file
        
    Returns:
        Dictionary with validation results
    """
    try:
        with open(georef_path, 'r') as f:
            georef = json.load(f)
        
        required_keys = ['pixel_size_x', 'pixel_size_y', 'origin_x', 'origin_y']
        missing_keys = [key for key in required_keys if key not in georef]
        
        validation_result = {
            'valid': len(missing_keys) == 0,
            'missing_keys': missing_keys,
            'pixel_size': {
                'x': georef.get('pixel_size_x'),
                'y': georef.get('pixel_size_y')
            },
            'origin': {
                'x': georef.get('origin_x'),
                'y': georef.get('origin_y')
            },
            'coordinate_system': georef.get('coordinate_system'),
            'all_keys': list(georef.keys())
        }
        
        # Check if pixel sizes are reasonable (in meters)
        pixel_x = georef.get('pixel_size_x', 0)
        pixel_y = georef.get('pixel_size_y', 0)
        
        if 0.1 < pixel_x < 1000 and 0.1 < pixel_y < 1000:
            validation_result['pixel_size_reasonable'] = True
        else:
            validation_result['pixel_size_reasonable'] = False
            validation_result['warning'] = 'Pixel sizes seem unreasonable'
        
        return validation_result
        
    except Exception as e:
        return {
            'valid': False,
            'error': str(e)
        }


def get_system_info() -> Dict[str, Any]:
    """
    Get system information relevant to the application.
    
    Returns:
        Dictionary with system information
    """
    import sys
    import platform
    
    return {
        'python_version': sys.version,
        'platform': platform.platform(),
        'architecture': platform.architecture(),
        'processor': platform.processor(),
        'working_directory': os.getcwd(),
        'available_memory_gb': _get_available_memory(),
        'numpy_version': np.__version__
    }


def _get_available_memory() -> Optional[float]:
    """Get available system memory in GB."""
    try:
        import psutil
        return round(psutil.virtual_memory().available / (1024**3), 2)
    except ImportError:
        return None
