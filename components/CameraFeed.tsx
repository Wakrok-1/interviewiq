"use client";

import { useEffect, useRef, useState } from "react";
import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

interface FaceMetrics {
  eyeContact: boolean;
  posture: "good" | "poor" | "unknown";
}

interface Props {
  onMetrics: (metrics: FaceMetrics) => void;
}

// MediaPipe face landmark indices
// Left iris center: 468, Right iris center: 473
// Left eye: inner=133, outer=33 | Right eye: inner=362, outer=263
// Nose tip: 1 | Left ear: 234 | Right ear: 454
const L_IRIS = 468;
const R_IRIS = 473;
const L_EYE_INNER = 133;
const L_EYE_OUTER = 33;
const R_EYE_INNER = 362;
const R_EYE_OUTER = 263;
const NOSE = 1;
const L_EAR = 234;
const R_EAR = 454;

export default function CameraFeed({ onMetrics }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const landmarkerRef = useRef<FaceLandmarker | null>(null);
  const animRef = useRef<number>(0);
  const onMetricsRef = useRef(onMetrics);
  const [status, setStatus] = useState<"loading" | "active" | "error">("loading");

  useEffect(() => { onMetricsRef.current = onMetrics; }, [onMetrics]);

  useEffect(() => {
    let stream: MediaStream | null = null;

    async function init() {
      try {
        // 1. Load MediaPipe face landmarker (with iris)
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
        );
        const landmarker = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
            delegate: "GPU",
          },
          runningMode: "VIDEO",
          numFaces: 1,
          outputFaceBlendshapes: false,
          outputFacialTransformationMatrixes: true, // needed for head pose
        });
        landmarkerRef.current = landmarker;

        // 2. Start camera
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: 640, height: 480 },
          audio: false,
        });

        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await new Promise<void>((res) => {
          video.onloadedmetadata = () => { video.play(); res(); };
        });

        setStatus("active");
        detect();
      } catch {
        setStatus("error");
      }
    }

    function detect() {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const landmarker = landmarkerRef.current;
      if (!video || !canvas || !landmarker || video.readyState < 2) {
        animRef.current = requestAnimationFrame(detect);
        return;
      }

      const result = landmarker.detectForVideo(video, performance.now());

      if (!result.faceLandmarks || result.faceLandmarks.length === 0) {
        onMetricsRef.current({ eyeContact: false, posture: "unknown" });
        animRef.current = requestAnimationFrame(detect);
        return;
      }

      const lm = result.faceLandmarks[0];

      // --- Eye contact: check if iris is centered in the eye horizontally ---
      // ratio = (iris_x - eye_outer_x) / (eye_inner_x - eye_outer_x)
      // if ratio is 0.3–0.7, the iris is roughly centered → looking at camera
      const leftRatio =
        (lm[L_IRIS].x - lm[L_EYE_OUTER].x) /
        (lm[L_EYE_INNER].x - lm[L_EYE_OUTER].x + 1e-6);
      const rightRatio =
        (lm[R_IRIS].x - lm[R_EYE_OUTER].x) /
        (lm[R_EYE_INNER].x - lm[R_EYE_OUTER].x + 1e-6);
      const eyeContact = leftRatio > 0.3 && leftRatio < 0.7 && rightRatio > 0.3 && rightRatio < 0.7;

      // --- Posture: use head yaw (ear symmetry) and pitch (nose vs ear height) ---
      // Yaw: if |left_ear.x - right_ear.x| is small → head turned
      const earSpan = Math.abs(lm[L_EAR].x - lm[R_EAR].x);
      // Pitch: nose Y relative to ear Y — if nose is too low, head is down (slouching)
      const earMidY = (lm[L_EAR].y + lm[R_EAR].y) / 2;
      const noseDrop = lm[NOSE].y - earMidY; // positive = nose below ears = head tilted down

      // Face must be reasonably frontal (earSpan > 0.15) and not looking down too much
      const posture: "good" | "poor" =
        earSpan > 0.15 && noseDrop < 0.15 ? "good" : "poor";

      onMetricsRef.current({ eyeContact, posture });

      animRef.current = requestAnimationFrame(detect);
    }

    init();

    return () => {
      cancelAnimationFrame(animRef.current);
      stream?.getTracks().forEach((t) => t.stop());
      landmarkerRef.current?.close();
    };
  }, []);

  return (
    <div className="relative rounded-xl overflow-hidden bg-gray-900 aspect-video w-full">
      <video
        ref={videoRef}
        className="w-full h-full object-cover scale-x-[-1]"
        muted
        playsInline
      />
      <canvas ref={canvasRef} className="hidden" />

      {status === "loading" && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-sm text-gray-400">Loading AI model...</p>
            <p className="text-xs text-gray-600 mt-1">First load may take a few seconds</p>
          </div>
        </div>
      )}

      {status === "error" && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
          <div className="text-center text-red-400">
            <p className="text-2xl mb-2">📷</p>
            <p className="text-sm">Camera access denied</p>
            <p className="text-xs text-gray-500 mt-1">Allow camera in browser settings</p>
          </div>
        </div>
      )}
    </div>
  );
}
