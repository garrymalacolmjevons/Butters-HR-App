import { useState, useRef, useCallback, useEffect } from 'react';
import { Camera, X, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface WebcamCaptureProps {
  onCapture: (imageDataUrl: string | null) => void;
  initialImage?: string | null;
}

export function WebcamCapture({ onCapture, initialImage }: WebcamCaptureProps) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isCapturing, setIsCapturing] = useState<boolean>(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(initialImage || null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Start webcam when capturing begins
  const startWebcam = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'environment' 
        } 
      });
      
      setStream(mediaStream);
      setIsCapturing(true);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (error) {
      console.error('Error accessing webcam:', error);
      alert('Unable to access the webcam. Please make sure you have granted permission to use the camera.');
    }
  }, []);

  // Stop webcam when capture is complete
  const stopWebcam = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsCapturing(false);
  }, [stream]);

  // Take photo from webcam
  const capturePhoto = useCallback(() => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageDataUrl = canvas.toDataURL('image/jpeg');
        setCapturedImage(imageDataUrl);
        onCapture(imageDataUrl);
        stopWebcam();
      }
    }
  }, [onCapture, stopWebcam]);

  // Clear captured photo
  const clearPhoto = useCallback(() => {
    setCapturedImage(null);
    onCapture(null);
  }, [onCapture]);

  // Clean up when component unmounts
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  return (
    <div className="flex flex-col space-y-4 w-full mt-2">
      {!isCapturing && !capturedImage && (
        <Button 
          type="button" 
          onClick={startWebcam} 
          className="flex items-center gap-2"
        >
          <Camera className="h-4 w-4" />
          <span>Capture Document Image</span>
        </Button>
      )}
      
      {isCapturing && (
        <div className="space-y-4">
          <div className="border rounded-md overflow-hidden bg-black relative">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full h-auto max-h-[400px] object-contain"
            />
          </div>
          
          <div className="flex flex-wrap gap-2">
            <Button 
              type="button" 
              onClick={capturePhoto}
              className="flex-1 sm:flex-none"
            >
              Take Photo
            </Button>
            <Button 
              type="button" 
              variant="outline"
              onClick={stopWebcam}
              className="flex-1 sm:flex-none"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
      
      {capturedImage && (
        <div className="space-y-4">
          <div className="border rounded-md overflow-hidden relative">
            <img 
              src={capturedImage} 
              alt="Captured document" 
              className="w-full h-auto max-h-[400px] object-contain"
            />
          </div>
          
          <div className="flex flex-wrap gap-2">
            <Button 
              type="button" 
              variant="outline"
              onClick={() => {
                clearPhoto();
                startWebcam();
              }}
              className="flex-1 sm:flex-none flex items-center gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Retake</span>
            </Button>
            <Button 
              type="button" 
              variant="outline"
              onClick={clearPhoto}
              className="flex-1 sm:flex-none flex items-center gap-2 text-destructive border-destructive hover:bg-destructive/10"
            >
              <X className="h-4 w-4" />
              <span>Remove</span>
            </Button>
          </div>
        </div>
      )}
      
      {/* Hidden canvas for capturing images */}
      <canvas 
        ref={canvasRef} 
        style={{ display: 'none' }}
      />
    </div>
  );
}