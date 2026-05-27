"""
DeepFilterNet Model Implementation

This module contains the DeepFilterNet model loading and inference logic.
Uses the deepfilternet library for real-time speech enhancement.
"""

from typing import Optional
import numpy as np
import torch
import torchaudio


class DeepFilterNetModel:
    """
    DeepFilterNet model wrapper for audio enhancement.
    
    DeepFilterNet is a neural network-based speech enhancement model
    that removes noise while preserving speech quality.
    """
    
    def __init__(self, model_path: Optional[str] = None):
        """
        Initialize DeepFilterNet model.
        
        Args:
            model_path: Path to model weights (optional, uses default if None)
        """
        self.model_path = model_path
        self.model = None
        self.is_loaded = False
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    
    def load(self) -> bool:
        """
        Load the DeepFilterNet model.
        
        Returns:
            True if model loaded successfully
        """
        if self.is_loaded:
            return True
        
        try:
            # Try to import deepfilternet
            try:
                from deepfilternet import DeepFilterNet
                self.model = DeepFilterNet(load_weights=True)
                self.model.to(self.device)
                self.model.eval()
                self.is_loaded = True
                print(f"DeepFilterNet model loaded on {self.device}")
                return True
            except ImportError:
                # Fallback: Use a simpler noise reduction approach
                print("Warning: deepfilternet not installed, using fallback noise reduction")
                self.is_loaded = True  # Mark as loaded to allow processing
                return True
        except Exception as e:
            print(f"Error loading DeepFilterNet model: {e}")
            # Fallback: Use basic processing
            self.is_loaded = True
            return True
    
    def enhance(self, audio: np.ndarray, sample_rate: int = 16000) -> np.ndarray:
        """
        Enhance audio using DeepFilterNet (or fallback method).
        
        Args:
            audio: Input audio as numpy array (mono, float32, [-1, 1])
            sample_rate: Sample rate of audio (must be 16000 for DeepFilterNet)
            
        Returns:
            Enhanced audio as numpy array
        """
        if not self.is_loaded:
            self.load()
        
        # Ensure audio is in correct format
        if audio.dtype != np.float32:
            audio = audio.astype(np.float32)
        
        # Normalize to [-1, 1] range
        max_val = np.abs(audio).max()
        if max_val > 1.0:
            audio = audio / max_val
        
        try:
            # Try using deepfilternet if available
            if hasattr(self, 'model') and self.model is not None and hasattr(self.model, '__call__'):
                # Convert to tensor
                audio_tensor = torch.from_numpy(audio).unsqueeze(0).to(self.device)
                
                # Process
                with torch.no_grad():
                    enhanced_tensor = self.model(audio_tensor, sample_rate)
                
                # Convert back to numpy
                enhanced = enhanced_tensor.squeeze(0).cpu().numpy()
                return enhanced
        except Exception as e:
            print(f"DeepFilterNet processing failed, using fallback: {e}")
        
        # Fallback: Simple spectral subtraction-based noise reduction
        return self._fallback_denoise(audio, sample_rate)
    
    def _fallback_denoise(self, audio: np.ndarray, sample_rate: int) -> np.ndarray:
        """
        Fallback noise reduction using spectral subtraction.
        
        Args:
            audio: Input audio array
            sample_rate: Sample rate
            
        Returns:
            Denoised audio array
        """
        try:
            import scipy.signal
            
            # Use a simple high-pass filter to remove low-frequency noise
            nyquist = sample_rate / 2
            cutoff = 80  # Hz
            b, a = scipy.signal.butter(4, cutoff / nyquist, btype='high')
            filtered = scipy.signal.filtfilt(b, a, audio)
            
            # Apply spectral gating (simple noise gate)
            threshold = np.percentile(np.abs(audio), 10)
            mask = np.abs(filtered) > threshold
            gated = filtered * (0.3 + 0.7 * mask)
            
            return gated.astype(np.float32)
        except ImportError:
            # If scipy not available, return original
            print("Warning: scipy not available, returning original audio")
            return audio
    
    def process_file(self, input_path: str, output_path: str) -> bool:
        """
        Process an audio file and save enhanced version.
        
        Args:
            input_path: Path to input audio file
            output_path: Path to save enhanced audio file
            
        Returns:
            True if processing successful
        """
        try:
            import librosa
            import soundfile as sf
            
            # Load audio
            audio, sr = librosa.load(input_path, sr=16000, mono=True)
            
            # Enhance
            enhanced = self.enhance(audio, sr)
            
            # Save
            sf.write(output_path, enhanced, sr)
            return True
        except Exception as e:
            print(f"Error processing file: {e}")
            return False

