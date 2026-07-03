
export const FACE_DETECTION_CONFIG = {
  allowedFaces: 1, 
  
  minDetectionConfidence: 0.90, 
  minTrackingConfidence: 0.85,
  
  // Polling rate: Analyzing every frame crashes the browser. 
  // 1000ms (1 second) is the sweet spot for web-based proctoring.
  checkIntervalMs: 2000, 
  
  // Gaze and Head Pose tolerance
  maxHeadYawDegrees: 25, // Looking too far left/right
  maxHeadPitchDegrees: 15, // Looking too far up/down
};

export const AUDIO_DETECTION_CONFIG = {
  // @tensorflow-models/speech-commands settings
  vocabulary: '18w', // Standard 18-word vocabulary for background noise baseline
  probabilityThreshold: 0.85, // Only flag speech if the model is 85%+ sure someone is talking
  overlapFactor: 0.5, 
  invokeCallbackOnNoiseAndUnknown: true, // Trigger callback for any detected noise, even if it's not a known word
  // Custom audio anomaly settings
  ambientNoiseCalibrationMs: 7000, // Calibrate room silence for the first 5 seconds
  speechSpikeMultiplier: 2.5, // Flag if audio spikes 2.5x above the calibrated baseline
};

export const EXAM_RULES = [
  "No tab switching or minimizing the browser window.",
  "Your face must remain clearly visible in the camera frame at all times.",
  "No speaking, whispering, or background voices are permitted.",
  "No external devices, headphones, or secondary monitors.",
  "Copy/paste and right-click functionalities are strictly disabled.",
  "Any detected infractions are silently logged and flagged for instructor review."
];