import { useState, useRef, useCallback, useEffect } from 'react';
import Webcam from 'react-webcam';
import { Button } from '@/components/ui/button';
import { Camera, Redo, Check } from 'lucide-react';

interface WebcamCaptureProps {
  onCapture: (imageSrc: string | null) => void;
  initialImage?: string | null;
}

export function WebcamCapture({ onCapture, initialImage }: WebcamCaptureProps) {
  const webcamRef = useRef<Webcam | null>(null);
  const [imgSrc, setImgSrc] = useState<string | null>(initialImage || null);
  const [cameraActive, setCameraActive] = useState<boolean>(true);
  const [cameraError, setCameraError] = useState<boolean>(false);

  // Handle camera initialization errors
  const handleUserMediaError = () => {
    setCameraError(true);
  };

  // Capture image from webcam
  const capture = useCallback(() => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
      setImgSrc(imageSrc);
      setCameraActive(false);
    }
  }, [webcamRef]);

  // Retake photo
  const retake = () => {
    setImgSrc(null);
    setCameraActive(true);
  };

  // Confirm selection
  const confirmCapture = useCallback(() => {
    onCapture(imgSrc);
  }, [imgSrc, onCapture]);

  // Cancel capture
  const cancelCapture = () => {
    onCapture(null);
  };

  // Set camera constraints - try to use environment camera on mobile
  const videoConstraints = {
    width: 1280,
    height: 720,
    facingMode: "user"
  };

  useEffect(() => {
    return () => {
      // Clean up any camera resources
      if (webcamRef.current && webcamRef.current.stream) {
        const tracks = webcamRef.current.stream.getTracks();
        tracks.forEach(track => track.stop());
      }
    };
  }, []);

  return (
    <div className="flex flex-col items-center">
      {cameraError ? (
        <div className="w-full p-4 text-center border border-red-200 rounded bg-red-50 text-red-500">
          <p className="mb-2 font-semibold">Camera access error</p>
          <p className="text-sm">
            We couldn't access your camera. Please ensure you've granted camera permissions 
            or try a different browser. You can still upload a document instead.
          </p>
          <Button 
            variant="outline" 
            className="mt-4"
            onClick={cancelCapture}
          >
            Close Camera
          </Button>
        </div>
      ) : (
        <div className="flex flex-col items-center w-full">
          {cameraActive ? (
            <div className="w-full">
              <Webcam
                audio={false}
                ref={webcamRef}
                screenshotFormat="image/jpeg"
                videoConstraints={videoConstraints}
                className="w-full rounded-md border border-gray-200"
                onUserMediaError={handleUserMediaError}
              />
              <div className="flex justify-center mt-4">
                <Button
                  onClick={capture}
                  className="flex items-center gap-2"
                >
                  <Camera className="h-4 w-4" />
                  Capture Photo
                </Button>
              </div>
            </div>
          ) : (
            <div className="w-full">
              {imgSrc && (
                <div className="border rounded-md overflow-hidden">
                  <img
                    src={imgSrc}
                    alt="Captured"
                    className="w-full max-h-[300px] object-contain"
                  />
                </div>
              )}
              <div className="flex justify-between mt-4">
                <Button 
                  variant="outline" 
                  onClick={retake}
                  className="flex items-center gap-2"
                >
                  <Redo className="h-4 w-4" />
                  Retake
                </Button>
                <Button 
                  onClick={confirmCapture}
                  className="flex items-center gap-2"
                >
                  <Check className="h-4 w-4" />
                  Use Photo
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}