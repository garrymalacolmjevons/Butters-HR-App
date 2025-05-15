import { useRef, useState, useCallback, useEffect } from "react";
import Webcam from "react-webcam";
import { Button } from "@/components/ui/button";
import { Camera, RefreshCw } from "lucide-react";

interface WebcamCaptureProps {
  onCapture: (imageSrc: string) => void;
  width?: number;
  height?: number;
}

const WebcamCapture = ({ onCapture, width = 600, height = 400 }: WebcamCaptureProps) => {
  const webcamRef = useRef<Webcam>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isCameraAvailable, setIsCameraAvailable] = useState(true);

  useEffect(() => {
    // Check if camera is available
    const checkCamera = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        setIsCameraAvailable(videoDevices.length > 0);
      } catch (error) {
        console.error("Error checking camera availability:", error);
        setIsCameraAvailable(false);
      }
    };

    checkCamera();
  }, []);

  const capture = useCallback(() => {
    if (webcamRef.current) {
      const imageSrc = webcamRef.current.getScreenshot();
      if (imageSrc) {
        setCapturedImage(imageSrc);
        onCapture(imageSrc);
      }
    }
  }, [webcamRef, onCapture]);

  const retake = () => {
    setCapturedImage(null);
  };

  if (!isCameraAvailable) {
    return (
      <div className="text-center p-4 border rounded-md bg-neutral-50">
        <p className="text-neutral-600 mb-2">Camera not available</p>
        <p className="text-sm text-neutral-500">Please make sure your camera is connected and you've granted permission.</p>
      </div>
    );
  }

  return (
    <div className="webcam-container flex flex-col items-center">
      {capturedImage ? (
        <div className="captured-image-container">
          <img
            src={capturedImage}
            alt="Captured"
            style={{ width, height, objectFit: "cover" }}
            className="rounded-md"
          />
          <div className="flex justify-center mt-4">
            <Button
              type="button"
              variant="outline"
              className="flex items-center gap-2"
              onClick={retake}
            >
              <RefreshCw className="h-4 w-4" />
              Retake
            </Button>
          </div>
        </div>
      ) : (
        <>
          <Webcam
            audio={false}
            ref={webcamRef}
            screenshotFormat="image/jpeg"
            width={width}
            height={height}
            videoConstraints={{
              width,
              height,
              facingMode: "user"
            }}
            className="rounded-md"
          />
          <div className="flex justify-center mt-4">
            <Button
              type="button"
              className="flex items-center gap-2"
              onClick={capture}
            >
              <Camera className="h-4 w-4" />
              Capture Photo
            </Button>
          </div>
        </>
      )}
    </div>
  );
};

export default WebcamCapture;