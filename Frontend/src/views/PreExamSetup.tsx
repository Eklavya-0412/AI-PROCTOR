import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { EXAM_RULES } from '../lib/proctorConfig';

type SetupStage = 'hardware' | 'rules';

export default function PreExamSetup() {
  const { id } = useParams(); // Get the exam ID from the URL
  const navigate = useNavigate();
  
  const [stage, setStage] = useState<SetupStage>('hardware');
  const [hardwareStatus, setHardwareStatus] = useState<'testing' | 'success' | 'error'>('testing');
  const [errorMessage, setErrorMessage] = useState('');
  const [agreedToRules, setAgreedToRules] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Initialize Hardware (Camera & Mic)
  useEffect(() => {
    if (stage !== 'hardware') return;

    let stream: MediaStream;

    const initializeMedia = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: { width: 600, height: 420, facingMode: 'user' }, 
          audio: true 
        });

        // Attach video to UI
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }

        // Quick Mic Test (Ensure AudioContext can connect)
        audioContextRef.current = new window.AudioContext();
        const source = audioContextRef.current.createMediaStreamSource(stream);
        const analyzer = audioContextRef.current.createAnalyser();
        source.connect(analyzer); // Verify data is flowing

        setHardwareStatus('success');
      } catch (err: any) {
        setHardwareStatus('error');
        if (err.name === 'NotAllowedError') {
          setErrorMessage('Permission denied. You must allow camera and microphone access in your browser settings.');
        } else if (err.name === 'NotFoundError') {
          setErrorMessage('No camera or microphone found on this device.');
        } else {
          setErrorMessage('An unexpected hardware error occurred: ' + err.message);
        }
      }
    };

    initializeMedia();

    // Cleanup media streams when moving to the next stage or unmounting
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (audioContextRef.current?.state !== 'closed') {
        audioContextRef.current?.close();
      }
    };
  }, [stage]);

  const handleContinueToRules = () => {
    if (hardwareStatus === 'success') {
      setStage('rules');
    }
  };

  const handleStartExam = () => {
    if (agreedToRules) {
      // Route to the actual exam arena
      navigate(`/exam-arena/${id}`);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6 font-sans text-zinc-300">
      <div className="max-w-3xl w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-2xl">
        
        {/* Stage 1: Hardware Testing */}
        {stage === 'hardware' && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-zinc-100 mb-2">System Diagnostics</h2>
              <p className="text-zinc-400">We need to verify your hardware before you can proceed.</p>
            </div>

            <div className="flex flex-col items-center gap-4">
              <div className={`relative w-full max-w-md aspect-video bg-zinc-950 border-2 rounded-lg overflow-hidden ${hardwareStatus === 'success' ? 'border-primary' : hardwareStatus === 'error' ? 'border-red-500' : 'border-zinc-700'}`}>
                {hardwareStatus === 'testing' && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-zinc-500 animate-pulse">Requesting permissions...</span>
                  </div>
                )}
                {hardwareStatus === 'error' && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
                    <svg className="w-10 h-10 text-red-500 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    <span className="text-red-400 text-sm font-medium">{errorMessage}</span>
                  </div>
                )}
                <video ref={videoRef} autoPlay playsInline muted className={`w-full h-full object-cover ${hardwareStatus === 'success' ? 'opacity-100' : 'opacity-0'}`} />
              </div>

              {/* Status Indicators */}
              <div className="w-full max-w-md flex justify-between px-4 py-3 bg-zinc-950 rounded border border-zinc-800 text-sm">
                <div className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${hardwareStatus === 'success' ? 'bg-primary' : 'bg-zinc-600 animate-pulse'}`}></div>
                  <span>Camera Connected</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${hardwareStatus === 'success' ? 'bg-primary' : 'bg-zinc-600 animate-pulse'}`}></div>
                  <span>Microphone Active</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-zinc-800">
              <button 
                onClick={handleContinueToRules}
                disabled={hardwareStatus !== 'success'}
                className="bg-primary text-zinc-950 px-6 py-2.5 rounded-lg font-medium hover:bg-primaryHover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue to Exam Rules
              </button>
            </div>
          </div>
        )}

        {/* Stage 2: Exam Rules Acknowledgement */}
        {stage === 'rules' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-zinc-100 mb-2">Examination Protocols</h2>
            
            <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-6 space-y-4 max-h-96 overflow-y-auto">
              <p className="text-sm text-zinc-400">By proceeding, you agree to adhere to the following automated proctoring rules:</p>
              <ul className="space-y-3">
                {EXAM_RULES.map((rule, idx) => (
                  <li key={idx} className="flex gap-3 text-sm text-zinc-300">
                    <span className="text-primary mt-0.5">▹</span>
                    {rule}
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex items-center gap-3">
              <input 
                type="checkbox" 
                id="agree" 
                checked={agreedToRules}
                onChange={(e) => setAgreedToRules(e.target.checked)}
                className="w-5 h-5 accent-primary bg-zinc-800 border-zinc-700 rounded cursor-pointer"
              />
              <label htmlFor="agree" className="text-sm font-medium text-zinc-300 cursor-pointer select-none">
                I acknowledge the rules and agree to be monitored by AI for the duration of this exam.
              </label>
            </div>

            <div className="flex justify-between pt-4 border-t border-zinc-800">
              <button 
                onClick={() => setStage('hardware')}
                className="text-zinc-400 hover:text-zinc-100 px-4 py-2 text-sm font-medium transition-colors"
              >
                Back to Diagnostics
              </button>
              <button 
                onClick={handleStartExam}
                disabled={!agreedToRules}
                className="bg-primary text-zinc-950 px-6 py-2.5 rounded-lg font-medium hover:bg-primaryHover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Begin Examination
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}