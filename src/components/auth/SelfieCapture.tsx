"use client";

import Image from "next/image";
import { useEffect, useRef, useState, useCallback } from "react";
import { Camera, CameraOff, Check, RefreshCw, Upload } from "lucide-react";
import { AppLoader } from "@/components/ui/loader";
import { Button } from "@/components/ui/button";

interface NativeFaceDetector {
  detect: (image: HTMLVideoElement | HTMLCanvasElement | ImageBitmap) => Promise<
    Array<{
      boundingBox: {
        x: number;
        y: number;
        width: number;
        height: number;
      };
    }>
  >;
}

interface SelfieCaptureProps {
  onCapture: (dataUrl: string) => void;
  busy?: boolean;
  capturedImage?: string | null;
  onRetake?: () => void;
  dataTour?: string;
}

type FacePosition = "centered" | "off_center" | "too_close" | "no_face" | "detecting";

export default function SelfieCapture({
  onCapture,
  busy = false,
  capturedImage = null,
  onRetake,
  dataTour = "selfie-capture-btn",
}: SelfieCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const animFrameRef = useRef<number | null>(null);
  const detectorRef = useRef<NativeFaceDetector | null>(null);

  const [cameraState, setCameraState] = useState<
    "idle" | "requesting" | "ready" | "denied" | "unsupported"
  >("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [flash, setFlash] = useState(false);
  const [facePosition, setFacePosition] = useState<FacePosition>("detecting");
  const [positionHint, setPositionHint] = useState<string>("Center your face in the frame");

  const stopStream = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  const startCamera = useCallback(async () => {
    if (typeof window === "undefined") return;

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraState("unsupported");
      setErrorMessage("Camera access is not supported on this browser.");
      return;
    }

    setCameraState("requesting");
    setErrorMessage("");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 720 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
      setCameraState("ready");
    } catch (err: unknown) {
      const error = err as { name?: string; message?: string };
      setCameraState("denied");
      if (error?.name === "NotAllowedError" || error?.name === "PermissionDeniedError") {
        setErrorMessage("Camera permission was denied. Enable camera access in your browser to proceed.");
      } else if (error?.name === "NotFoundError" || error?.name === "DevicesNotFoundError") {
        setErrorMessage("No camera detected on your device.");
      } else {
        setErrorMessage("Unable to access camera feed.");
      }
    }
  }, []);

  // Initialize Shape Detection API (FaceDetector) if supported by browser
  useEffect(() => {
    if (typeof window !== "undefined" && "FaceDetector" in window) {
      try {
        // @ts-expect-error Shape Detection API FaceDetector
        detectorRef.current = new window.FaceDetector({ fastMode: true, maxDetectedFaces: 1 });
      } catch {
        detectorRef.current = null;
      }
    }
  }, []);

  // Real-time face position tracking loop
  useEffect(() => {
    if (cameraState !== "ready" || capturedImage) return;

    let isSubscribed = true;
    let lastProcessed = 0;
    const offscreenCanvas = document.createElement("canvas");
    offscreenCanvas.width = 160;
    offscreenCanvas.height = 160;
    const offscreenCtx = offscreenCanvas.getContext("2d", { willReadFrequently: true });

    const checkPosition = async (timestamp: number) => {
      if (!isSubscribed) return;

      // Throttle detection to ~10 times per second for smooth performance
      if (timestamp - lastProcessed > 120 && videoRef.current && videoRef.current.readyState >= 2) {
        lastProcessed = timestamp;
        const video = videoRef.current;
        const vWidth = video.videoWidth;
        const vHeight = video.videoHeight;

        if (vWidth > 0 && vHeight > 0) {
          // Path 1: Native FaceDetector API (Chrome/Edge/Android)
          if (detectorRef.current) {
            try {
              const faces = await detectorRef.current.detect(video);
              if (!isSubscribed) return;
              if (faces.length === 0) {
                setFacePosition("no_face");
                setPositionHint("Please look directly at the camera");
              } else {
                const face = faces[0].boundingBox;
                const faceCenterX = face.x + face.width / 2;
                const faceCenterY = face.y + face.height / 2;
                const normX = faceCenterX / vWidth; // 0 (left) to 1 (right)
                const normY = faceCenterY / vHeight; // 0 (top) to 1 (bottom)
                const faceRelSize = Math.max(face.width / vWidth, face.height / vHeight);

                // Note: video is mirrored with scale-x-[-1], so left/right are inverted
                if (faceRelSize > 0.75) {
                  setFacePosition("too_close");
                  setPositionHint("Move back slightly");
                } else if (normX < 0.38) {
                  setFacePosition("off_center");
                  setPositionHint("Move your face to the right");
                } else if (normX > 0.62) {
                  setFacePosition("off_center");
                  setPositionHint("Move your face to the left");
                } else if (normY < 0.35) {
                  setFacePosition("off_center");
                  setPositionHint("Move your face down");
                } else if (normY > 0.65) {
                  setFacePosition("off_center");
                  setPositionHint("Move your face up");
                } else {
                  setFacePosition("centered");
                  setPositionHint("Face centered! Ready to take photo");
                }
              }
            } catch {
              // Fallback to optical analysis if FaceDetector errors
            }
          } else if (offscreenCtx) {
            // Path 2: Optical Center of Mass / Skin-tone centroid fallback (All browsers)
            // Draws downsampled crop to analyze subject centering in the viewfinder
            offscreenCtx.drawImage(video, 0, 0, 160, 160);
            const imgData = offscreenCtx.getImageData(0, 0, 160, 160).data;
            let sumX = 0;
            let sumY = 0;
            let weightSum = 0;

            for (let y = 0; y < 160; y += 4) {
              for (let x = 0; x < 160; x += 4) {
                const i = (y * 160 + x) * 4;
                const r = imgData[i];
                const g = imgData[i + 1];
                const b = imgData[i + 2];
                // Human skin tone / luminance contrast signature
                const isSkinLikely = r > 60 && g > 40 && b > 20 && r > b && (r - g) >= -5;
                if (isSkinLikely) {
                  sumX += x;
                  sumY += y;
                  weightSum++;
                }
              }
            }

            if (weightSum < 15) {
              setFacePosition("no_face");
              setPositionHint("Please look directly at the camera");
            } else {
              const centroidX = sumX / weightSum;
              const centroidY = sumY / weightSum;
              const normX = centroidX / 160;
              const normY = centroidY / 160;

              // Mirrored video adjustment: 0.5 is absolute center
              if (normX < 0.36) {
                setFacePosition("off_center");
                setPositionHint("Move your face to the right");
              } else if (normX > 0.64) {
                setFacePosition("off_center");
                setPositionHint("Move your face to the left");
              } else if (normY < 0.32) {
                setFacePosition("off_center");
                setPositionHint("Move your face down");
              } else if (normY > 0.68) {
                setFacePosition("off_center");
                setPositionHint("Move your face up");
              } else {
                setFacePosition("centered");
                setPositionHint("Face centered! Ready to take photo");
              }
            }
          }
        }
      }

      animFrameRef.current = requestAnimationFrame(checkPosition);
    };

    animFrameRef.current = requestAnimationFrame(checkPosition);

    return () => {
      isSubscribed = false;
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
    };
  }, [cameraState, capturedImage]);

  useEffect(() => {
    if (!capturedImage) {
      startCamera();
    }
    return () => {
      stopStream();
    };
  }, [capturedImage, startCamera, stopStream]);

  // Connect stream to video element when videoRef becomes available
  useEffect(() => {
    if (cameraState === "ready" && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
  }, [cameraState]);

  const handleSnap = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;

    // Trigger visual shutter flash
    setFlash(true);
    setTimeout(() => setFlash(false), 200);

    const canvas = document.createElement("canvas");
    const width = video.videoWidth || 640;
    const height = video.videoHeight || 640;
    const size = Math.min(width, height);

    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Mirror horizontally so the output matches the mirrored selfie preview
    ctx.translate(size, 0);
    ctx.scale(-1, 1);

    const sourceX = Math.max(0, (width - size) / 2);
    const sourceY = Math.max(0, (height - size) / 2);
    ctx.drawImage(video, sourceX, sourceY, size, size, 0, 0, size, size);

    const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
    stopStream();
    onCapture(dataUrl);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        stopStream();
        onCapture(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRetakeClick = () => {
    if (onRetake) onRetake();
    setFacePosition("detecting");
    setPositionHint("Center your face in the frame");
    startCamera();
  };

  return (
    <div className="flex flex-col items-center gap-6 w-full">
      {/* Hidden file input fallback for environments without camera */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="user"
        onChange={handleFileUpload}
        className="hidden"
        aria-hidden="true"
      />

      {/* Circular Viewfinder */}
      <div className="flex flex-col items-center gap-3">
        <div
          className={`relative flex size-48 sm:size-56 items-center justify-center overflow-hidden rounded-full border-4 transition-colors duration-200 bg-muted/40 shadow-inner ${
            capturedImage
              ? "border-emerald-500/80"
              : facePosition === "centered"
              ? "border-emerald-500 ring-4 ring-emerald-500/20"
              : facePosition === "off_center" || facePosition === "too_close"
              ? "border-amber-500/80 ring-4 ring-amber-500/15"
              : "border-primary/40"
          }`}
        >
          {/* Shutter flash effect */}
          {flash && (
            <div className="absolute inset-0 z-30 bg-white/80 pointer-events-none transition-opacity duration-150" />
          )}

          {capturedImage ? (
            <div className="relative size-full">
              {/* A camera snapshot (data URL) — nothing for the optimiser to do. */}
              <Image src={capturedImage} alt="Captured selfie" fill unoptimized className="object-cover" />
              <div className="absolute inset-0 flex items-center justify-center bg-black/15">
                <div className="flex size-11 items-center justify-center rounded-full bg-emerald-500 text-white shadow-sm">
                  <Check size={22} strokeWidth={2.8} />
                </div>
              </div>
            </div>
          ) : cameraState === "ready" ? (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="size-full object-cover scale-x-[-1]"
              />
              {/* Dynamic face centering target ring */}
              <div
                className={`pointer-events-none absolute inset-3 rounded-full border-2 transition-all duration-200 ${
                  facePosition === "centered"
                    ? "border-emerald-400/90 shadow-[0_0_12px_rgba(16,185,129,0.4)]"
                    : facePosition === "off_center" || facePosition === "too_close"
                    ? "border-amber-400/80 border-dashed"
                    : "border-white/40 border-dashed"
                }`}
              />

              {/* Crosshair alignment markers */}
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-30">
                <div className="h-4 w-[1px] bg-white absolute top-4" />
                <div className="h-4 w-[1px] bg-white absolute bottom-4" />
                <div className="w-4 h-[1px] bg-white absolute left-4" />
                <div className="w-4 h-[1px] bg-white absolute right-4" />
              </div>
            </>
          ) : cameraState === "requesting" ? (
            <div className="flex flex-col items-center gap-2.5 p-4 text-center text-muted-foreground">
              <AppLoader size={32} />
              <span className="text-[12.5px] font-medium text-foreground">Starting camera...</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 p-5 text-center text-muted-foreground">
              <CameraOff size={32} strokeWidth={1.8} className="text-muted-foreground/80" />
              <span className="text-[12px] leading-tight">
                {errorMessage || "Camera unavailable"}
              </span>
            </div>
          )}
        </div>

        {/* Real-time centering guidance banner */}
        {!capturedImage && cameraState === "ready" && (
          <div
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-medium transition-all duration-150 animate-in fade-in ${
              facePosition === "centered"
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : facePosition === "off_center" || facePosition === "too_close"
                ? "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {facePosition === "centered" ? (
              <Check size={13} strokeWidth={2.5} className="text-emerald-600 dark:text-emerald-400" />
            ) : (
              <div
                className={`size-1.5 rounded-full ${
                  facePosition === "off_center" || facePosition === "too_close"
                    ? "bg-amber-500 animate-pulse"
                    : "bg-muted-foreground"
                }`}
              />
            )}
            <span>{positionHint}</span>
          </div>
        )}
      </div>

      {/* Action Controls */}
      <div className="w-full flex flex-col gap-2.5">
        {capturedImage ? (
          <div className="flex flex-col gap-2">
            <Button
              type="button"
              variant="default"
              size="lg"
              disabled={busy}
              className="h-11 w-full text-[14px]"
            >
              {busy ? (
                <>
                  <AppLoader size={16} className="mr-2" />
                  Verifying photo...
                </>
              ) : (
                "Verified ✓"
              )}
            </Button>
            {onRetake && !busy && (
              <button
                type="button"
                onClick={handleRetakeClick}
                className="inline-flex items-center justify-center gap-1.5 text-[12.5px] text-muted-foreground hover:text-foreground transition-colors cursor-pointer py-1"
              >
                <RefreshCw size={13} />
                Retake photo
              </button>
            )}
          </div>
        ) : cameraState === "ready" ? (
          <Button
            type="button"
            variant="default"
            size="lg"
            data-tour={dataTour}
            onClick={handleSnap}
            disabled={busy}
            className="h-11 w-full text-[14px]"
          >
            <Camera size={16} className="mr-2" />
            Take photo
          </Button>
        ) : cameraState === "denied" || cameraState === "unsupported" ? (
          <div className="flex flex-col gap-2 w-full">
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={startCamera}
              className="h-11 w-full text-[14px]"
            >
              <RefreshCw size={15} className="mr-2" />
              Try camera again
            </Button>
            <Button
              type="button"
              variant="default"
              size="lg"
              onClick={() => fileInputRef.current?.click()}
              className="h-11 w-full text-[14px]"
            >
              <Upload size={15} className="mr-2" />
              Upload photo from device
            </Button>
          </div>
        ) : (
          <Button
            type="button"
            variant="default"
            size="lg"
            disabled
            className="h-11 w-full text-[14px]"
          >
            <AppLoader size={16} className="mr-2" />
            Preparing camera...
          </Button>
        )}
      </div>
    </div>
  );
}
