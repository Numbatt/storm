#!/usr/bin/env python3
"""
Mask2Former Segmentation for Flood Risk AI
Uses Mask2Former with Swin-Large backbone trained on Mapillary Vistas dataset
for semantic segmentation of street view images.
"""

import os
import yaml
import numpy as np
from PIL import Image
import torch
from typing import Dict, List, Tuple, Optional
import matplotlib.pyplot as plt
import warnings

try:
    from transformers import Mask2FormerImageProcessor, Mask2FormerForUniversalSegmentation
    TRANSFORMERS_AVAILABLE = True
except ImportError:
    TRANSFORMERS_AVAILABLE = False


class Mask2FormerDetector:
    """
    Mask2Former-based surface detector for flood risk analysis.
    
    Uses the facebook/mask2former-swin-large-mapillary-vistas-semantic model
    to segment street view images into asphalt, greenery, and other categories.
    """
    
    # Mapillary Vistas class mappings to our flood-relevant categories
    CATEGORY_MAP = {
        # Roads and transportation infrastructure (impermeable surfaces)
        "Road": "asphalt",
        "Lane Marking - General": "asphalt", 
        "Lane Marking - Crosswalk": "asphalt",
        "Sidewalk": "asphalt",
        "Parking": "asphalt",
        "Rail Track": "asphalt",
        "Bridge": "asphalt",
        "Tunnel": "asphalt",
        
        # Vehicles (impermeable when parked)
        "Car": "asphalt",
        "Truck": "asphalt", 
        "Bus": "asphalt",
        "Motorcycle": "asphalt",
        "Bicycle": "asphalt",
        "Trailer": "asphalt",
        
        # Vegetation (permeable surfaces)
        "Vegetation": "greenery",
        "Tree": "greenery", 
        "Terrain": "greenery",
        "vegetation": "greenery",
        "tree": "greenery",
        "terrain": "greenery",
        "grass": "greenery",
        "Grass": "greenery",
        "plants": "greenery",
        "Plants": "greenery",
        "Nature": "greenery",
        "nature": "greenery",
        
        # Everything else (buildings, sky, etc.)
        "Building": "other",
        "Wall": "other",
        "Fence": "other",
        "Guard Rail": "other",
        "Utility Pole": "other",
        "Traffic Sign": "other",
        "Traffic Light": "other",
        "Fire Hydrant": "other",
        "Stop Sign": "other",
        "Parking Meter": "other",
        "Bench": "other",
        "Trash Can": "other",
        "Mailbox": "other",
        "Phone Booth": "other",
        "Street Light": "other",
        "Sky": "other",
        "Cloud": "other",
        "Person": "other",
        "Rider": "other",
        "Animal": "other",
        "Water": "other",
        "Snow": "other",
        "Manhole": "other",
        "Curb": "other",
        "Curb Cut": "other",
        "Pole": "other",
        "Dynamic": "other",
        "Ground": "other",
        "Static": "other",
        "Ego Vehicle": "other",
        
        # Additional classes found in debug run
        "Billboard": "other",
        "Pedestrian Area": "asphalt",  # Typically paved/impermeable
        "Catch Basin": "other",        # Drainage infrastructure
        "Bird": "other",
        "Traffic Sign (Front)": "other"
    }
    
    def __init__(self, config_path: str, debug: bool = False):
        """Initialize the Mask2Former detector."""
        if not TRANSFORMERS_AVAILABLE:
            raise ImportError(
                "transformers library not available. "
                "Install with: pip install transformers timm"
            )
        
        self.config_path = config_path
        self.config = self._load_config()
        self.debug = debug
        
        # Initialize model and processor
        self.model_name = "facebook/mask2former-swin-large-mapillary-vistas-semantic"
        print(f"🤖 Loading Mask2Former model: {self.model_name}")
        
        try:
            # Suppress specific warnings about deprecated parameters during model loading
            with warnings.catch_warnings():
                warnings.filterwarnings("ignore", message=".*named arguments are not valid.*", category=UserWarning)
                warnings.filterwarnings("ignore", message=".*_max_size.*", category=UserWarning) 
                warnings.filterwarnings("ignore", message=".*reduce_labels.*", category=UserWarning)
                
                # Initialize processor and model
                self.processor = Mask2FormerImageProcessor.from_pretrained(self.model_name)
                self.model = Mask2FormerForUniversalSegmentation.from_pretrained(self.model_name)
            
            self.model.eval()
            
            # Move to GPU if available
            self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
            self.model.to(self.device)
            print(f"✅ Model loaded successfully on {self.device}")
            
        except Exception as e:
            print(f"❌ Failed to load model: {e}")
            raise
    
    def _load_config(self) -> dict:
        """Load configuration from YAML file."""
        try:
            with open(self.config_path, 'r') as f:
                config = yaml.safe_load(f)
            return config
        except FileNotFoundError:
            print(f"⚠️  Config file not found: {self.config_path}")
            return {}
        except Exception as e:
            print(f"⚠️  Error loading config: {e}")
            return {}
    
    def analyze_local_images(self, image_paths: List[str]) -> Dict[str, float]:
        """
        Analyze multiple local street view images and aggregate results.
        
        Args:
            image_paths: List of paths to street view images
            
        Returns:
            Dictionary with aggregated surface percentages
        """
        if not image_paths:
            raise ValueError("No image paths provided")
        
        print(f"📸 Analyzing {len(image_paths)} street view images...")
        
        all_results = []
        successful_analyses = 0
        
        for i, image_path in enumerate(image_paths):
            try:
                print(f"   Processing image {i+1}/{len(image_paths)}: {os.path.basename(image_path)}")
                result = self._analyze_single_image(image_path)
                all_results.append(result)
                successful_analyses += 1
                
                # Save debug overlay for first image only to avoid too much output
                if self.debug and i == 0:
                    output_dir = "api/data/outputs"
                    self.save_debug_overlay(image_path, output_dir)
                
            except Exception as e:
                print(f"   ⚠️  Failed to analyze {os.path.basename(image_path)}: {e}")
                continue
        
        if successful_analyses == 0:
            raise RuntimeError("Failed to analyze any images")
        
        # Aggregate results across all images
        aggregated = self._aggregate_results(all_results)
        
        print(f"✅ Successfully analyzed {successful_analyses}/{len(image_paths)} images")
        return aggregated
    
    def _analyze_single_image(self, image_path: str) -> Dict[str, float]:
        """Analyze a single image and return surface percentages."""
        if not os.path.exists(image_path):
            raise FileNotFoundError(f"Image not found: {image_path}")
        
        # Load and preprocess image
        image = Image.open(image_path).convert("RGB")
        inputs = self.processor(images=image, return_tensors="pt")
        
        # Move inputs to device
        inputs = {k: v.to(self.device) for k, v in inputs.items()}
        
        # Run inference
        with torch.no_grad():
            outputs = self.model(**inputs)
        
        # Post-process to get segmentation map
        segmentation_map = self.processor.post_process_semantic_segmentation(
            outputs, target_sizes=[image.size[::-1]]
        )[0]
        
        # Convert to numpy array
        seg_array = segmentation_map.cpu().numpy()
        
        # Debug: Show detected classes
        if self.debug:
            self._debug_detected_classes(seg_array, image_path)
        
        # Map class indices to our categories and count pixels
        return self._count_pixels_by_category(seg_array, image_path if self.debug else None)
    
    def _count_pixels_by_category(self, segmentation_map: np.ndarray, image_path: str = None) -> Dict[str, float]:
        """Count pixels by our flood-relevant categories."""
        total_pixels = segmentation_map.size
        category_counts = {"asphalt": 0, "greenery": 0, "other": 0}
        unmapped_classes = {}
        
        # Get unique class IDs and their counts
        unique_ids, counts = np.unique(segmentation_map, return_counts=True)
        
        for class_id, pixel_count in zip(unique_ids, counts):
            # Map Mapillary class ID to category name
            category = self._map_class_id_to_category(class_id)
            category_counts[category] += pixel_count
            
            # Track unmapped classes for debugging
            if self.debug:
                class_name = self._get_class_name(class_id)
                if class_name not in self.CATEGORY_MAP:
                    unmapped_classes[class_name] = unmapped_classes.get(class_name, 0) + pixel_count
        
        # Convert to percentages
        percentages = {
            category: (count / total_pixels) * 100 
            for category, count in category_counts.items()
        }
        
        # Debug output
        if self.debug and image_path:
            print(f"      Category breakdown for {os.path.basename(image_path)}:")
            for category, percentage in percentages.items():
                print(f"        {category}: {percentage:.1f}%")
            if unmapped_classes:
                print(f"      Unmapped classes:")
                for class_name, pixel_count in unmapped_classes.items():
                    pct = (pixel_count / total_pixels) * 100
                    print(f"        {class_name}: {pct:.1f}%")
        
        return percentages
    
    def _map_class_id_to_category(self, class_id: int) -> str:
        """Map Mapillary Vistas class ID to our flood-relevant category."""
        class_name = self._get_class_name(class_id)
        return self.CATEGORY_MAP.get(class_name, "other")
    
    def _get_class_name(self, class_id: int) -> str:
        """Get class name from class ID using model's label mapping."""
        try:
            # Use the model's built-in id2label mapping
            return self.model.config.id2label.get(class_id, f"Unknown_{class_id}")
        except:
            # Fallback to simplified mapping if model config is not available
            class_mappings = {
                0: "Road",           # Road
                1: "Sidewalk",       # Sidewalk  
                2: "Building",       # Building
                3: "Wall",           # Wall
                4: "Fence",          # Fence
                5: "Utility Pole",   # Pole
                6: "Traffic Light",  # Traffic Light
                7: "Traffic Sign",   # Traffic Sign
                8: "Vegetation",     # Vegetation
                9: "Terrain",        # Terrain
                10: "Sky",           # Sky
                11: "Person",        # Person
                12: "Rider",         # Rider
                13: "Car",           # Car
                14: "Truck",         # Truck
                15: "Bus",           # Bus
                16: "Motorcycle",    # Motorcycle
                17: "Bicycle",       # Bicycle
                18: "Tree",          # Tree
                # Add more mappings as needed
            }
            return class_mappings.get(class_id, f"Unknown_{class_id}")
    
    def _debug_detected_classes(self, segmentation_map: np.ndarray, image_path: str):
        """Debug method to show all detected classes in an image."""
        unique_ids, counts = np.unique(segmentation_map, return_counts=True)
        total_pixels = segmentation_map.size
        
        print(f"      🔍 Debug: Detected classes in {os.path.basename(image_path)}:")
        
        # Sort by pixel count (descending)
        sorted_data = sorted(zip(unique_ids, counts), key=lambda x: x[1], reverse=True)
        
        for class_id, pixel_count in sorted_data:
            class_name = self._get_class_name(class_id)
            percentage = (pixel_count / total_pixels) * 100
            
            # Skip classes with 0.0% coverage
            if percentage < 0.05:  # Less than 0.05% rounds to 0.0%
                continue
                
            mapped_category = self.CATEGORY_MAP.get(class_name, "unmapped→other")
            print(f"        {class_name} (ID:{class_id}): {percentage:.1f}% → {mapped_category}")
        print()
    
    def _aggregate_results(self, results: List[Dict[str, float]]) -> Dict[str, float]:
        """Aggregate surface percentages across multiple images."""
        if not results:
            return {"asphalt": 0.0, "greenery": 0.0, "other": 0.0}
        
        # Calculate mean percentages
        aggregated = {}
        for category in ["asphalt", "greenery", "other"]:
            values = [result[category] for result in results]
            aggregated[category] = np.mean(values)
        
        return aggregated
    
    def save_overlay_masks(self, image_paths: List[str], output_dir: str):
        """
        Save segmentation overlay masks for visualization.
        
        Args:
            image_paths: List of input image paths
            output_dir: Directory to save overlay masks
        """
        os.makedirs(output_dir, exist_ok=True)
        
        for image_path in image_paths:
            try:
                # Load image
                image = Image.open(image_path).convert("RGB")
                inputs = self.processor(images=image, return_tensors="pt")
                inputs = {k: v.to(self.device) for k, v in inputs.items()}
                
                # Run inference
                with torch.no_grad():
                    outputs = self.model(**inputs)
                
                # Get segmentation map
                segmentation_map = self.processor.post_process_semantic_segmentation(
                    outputs, target_sizes=[image.size[::-1]]
                )[0]
                
                # Create colored overlay
                overlay = self._create_colored_overlay(segmentation_map.cpu().numpy())
                
                # Save overlay
                base_name = os.path.splitext(os.path.basename(image_path))[0]
                output_path = os.path.join(output_dir, f"{base_name}_segmentation.jpg")
                
                plt.figure(figsize=(12, 8))
                plt.subplot(1, 2, 1)
                plt.imshow(image)
                plt.title("Original Image")
                plt.axis('off')
                
                plt.subplot(1, 2, 2)
                plt.imshow(overlay)
                plt.title("Segmentation Overlay")
                plt.axis('off')
                
                plt.tight_layout()
                plt.savefig(output_path, dpi=150, bbox_inches='tight')
                plt.close()
                
                print(f"   Saved overlay: {output_path}")
                
            except Exception as e:
                print(f"   Failed to save overlay for {os.path.basename(image_path)}: {e}")
    
    def _create_colored_overlay(self, segmentation_map: np.ndarray) -> np.ndarray:
        """Create a colored overlay for visualization."""
        height, width = segmentation_map.shape
        overlay = np.zeros((height, width, 3), dtype=np.uint8)
        
        # Define colors for each category
        colors = {
            "asphalt": [128, 128, 128],   # Gray
            "greenery": [0, 255, 0],      # Bright Green  
            "other": [200, 200, 200]      # Light Gray
        }
        
        # Color pixels based on category
        for class_id in np.unique(segmentation_map):
            category = self._map_class_id_to_category(class_id)
            color = colors[category]
            mask = segmentation_map == class_id
            overlay[mask] = color
            
            # Special highlighting for vegetation classes in debug mode
            if self.debug and category == "greenery":
                class_name = self._get_class_name(class_id)
                print(f"        🌿 Found vegetation class: {class_name} (ID:{class_id})")
        
        return overlay
    
    def save_debug_overlay(self, image_path: str, output_dir: str):
        """
        Save a detailed debug overlay for a single image highlighting vegetation.
        
        Args:
            image_path: Path to input image
            output_dir: Directory to save debug overlay
        """
        if not self.debug:
            return
            
        try:
            # Load image
            image = Image.open(image_path).convert("RGB")
            inputs = self.processor(images=image, return_tensors="pt")
            inputs = {k: v.to(self.device) for k, v in inputs.items()}
            
            # Run inference
            with torch.no_grad():
                outputs = self.model(**inputs)
            
            # Get segmentation map
            segmentation_map = self.processor.post_process_semantic_segmentation(
                outputs, target_sizes=[image.size[::-1]]
            )[0]
            
            # Create detailed overlay with class labels
            seg_array = segmentation_map.cpu().numpy()
            overlay = self._create_debug_overlay_with_labels(seg_array)
            
            # Save detailed overlay
            base_name = os.path.splitext(os.path.basename(image_path))[0]
            output_path = os.path.join(output_dir, f"debug_{base_name}_detailed.png")
            
            plt.figure(figsize=(16, 8))
            plt.subplot(1, 3, 1)
            plt.imshow(image)
            plt.title("Original Image")
            plt.axis('off')
            
            plt.subplot(1, 3, 2)
            plt.imshow(overlay)
            plt.title("Segmentation (Vegetation Highlighted)")
            plt.axis('off')
            
            # Create category pie chart
            plt.subplot(1, 3, 3)
            categories = self._count_pixels_by_category(seg_array)
            labels = list(categories.keys())
            sizes = list(categories.values())
            colors_pie = ['gray', 'green', 'lightgray']
            
            plt.pie(sizes, labels=labels, colors=colors_pie, autopct='%1.1f%%', startangle=90)
            plt.title("Surface Coverage")
            
            plt.tight_layout()
            plt.savefig(output_path, dpi=150, bbox_inches='tight')
            plt.close()
            
            print(f"   🔍 Saved debug overlay: {output_path}")
            
        except Exception as e:
            print(f"   Failed to save debug overlay for {os.path.basename(image_path)}: {e}")
    
    def _create_debug_overlay_with_labels(self, segmentation_map: np.ndarray) -> np.ndarray:
        """Create a debug overlay with distinct colors for each class."""
        height, width = segmentation_map.shape
        overlay = np.zeros((height, width, 3), dtype=np.uint8)
        
        # Get unique class IDs
        unique_ids = np.unique(segmentation_map)
        
        # Generate distinct colors for each class
        import colorsys
        colors = []
        for i, class_id in enumerate(unique_ids):
            hue = i / len(unique_ids)
            rgb = colorsys.hsv_to_rgb(hue, 0.8, 0.9)
            colors.append([int(c * 255) for c in rgb])
        
        # Apply colors
        for i, class_id in enumerate(unique_ids):
            mask = segmentation_map == class_id
            overlay[mask] = colors[i]
            
            # Highlight vegetation classes with bright green border
            category = self._map_class_id_to_category(class_id)
            if category == "greenery":
                # Add bright green border to vegetation areas
                import cv2
                mask_uint8 = mask.astype(np.uint8) * 255
                contours, _ = cv2.findContours(mask_uint8, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
                cv2.drawContours(overlay, contours, -1, (0, 255, 0), 2)
        
        return overlay


def main(lat: float = None, lon: float = None):
    """Test the Mask2Former detector on local images."""
    import argparse
    
    # Parse command line arguments if not provided as parameters
    if lat is None or lon is None:
        parser = argparse.ArgumentParser(description='Run Mask2Former detector on images')
        parser.add_argument('--lat', type=float, default=29.715820777907464,
                           help='Latitude coordinate (default: Houston)')
        parser.add_argument('--lon', type=float, default=-95.40178894546409,
                           help='Longitude coordinate (default: Houston)')
        args = parser.parse_args()
        lat = args.lat
        lon = args.lon
    
    # Generate image paths based on coordinates
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))  # Go up to api/ directory
    data_dir = os.path.join(base_dir, "data", "processed")
    
    test_images = [
        os.path.join(data_dir, f"{lat}_{lon}_0.jpg"),
        os.path.join(data_dir, f"{lat}_{lon}_90.jpg"), 
        os.path.join(data_dir, f"{lat}_{lon}_180.jpg"),
        os.path.join(data_dir, f"{lat}_{lon}_270.jpg")
    ]
    
    # Filter existing images
    existing_images = [img for img in test_images if os.path.exists(img)]
    
    if not existing_images:
        print(f"❌ No images found for coordinates {lat}, {lon}")
        print(f"   Looking for images in: {data_dir}")
        print(f"   Expected files: {[os.path.basename(img) for img in test_images]}")
        return
    
    config_path = os.path.join(base_dir, "config.yaml")
    
    try:
        detector = Mask2FormerDetector(config_path, debug=True)
        results = detector.analyze_local_images(existing_images)
        
        print("\n📸 Segmentation summary (Mask2Former, 4 views):")
        print(f"  🛣️ Asphalt: {results['asphalt']:.1f}%")
        print(f"  🌿 Greenery: {results['greenery']:.1f}%") 
        print(f"  📦 Other: {results['other']:.1f}%")
        
        # Save overlay masks
        output_dir = os.path.join(base_dir, "data", "outputs")
        detector.save_overlay_masks(existing_images, output_dir)
        
    except Exception as e:
        print(f"❌ Error: {e}")


if __name__ == "__main__":
    main()
