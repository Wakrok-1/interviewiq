"use client";

import { useEffect, useRef, useState } from "react";
import { FaceLandmarker, PoseLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

interface FaceMetrics {
  eyeContact: boolean;
  posture: "good" | "poor" | "unknown";
}

interface Props {
  onMetrics: (metrics: FaceMetrics) => void;
  className?: string;
}

// Face landmark indices
const L_IRIS = 468;
const R_IRIS = 473;
const L_EYE_INNER = 133;
const L_EYE_OUTER = 33;
const R_EYE_INNER = 362;
const R_EYE_OUTER = 263;
const L_EYE_UPPER = 159;
const L_EYE_LOWER = 145;
const R_EYE_UPPER = 386;
const R_EYE_LOWER = 374;

// Pose landmark indices
const POSE_LEFT_SHOULDER = 11;
const POSE_RIGHT_SHOULDER = 12;
const POSE_LEFT_EAR = 7;
const POSE_RIGHT_EAR = 8;
const POSE_NOSE = 0;

// Module-level cache — persists across navigations, loads once
let cachedFace: FaceLandmarker | null = null;
let cachedPose: PoseLandmarker | null = null;
let loadingPromise: Promise<void> | null = null;

async function getModels(): Promise<void> {
  if (cachedFace && cachedPose) return;
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    const vision = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
    );
    const [face, pose] = await Promise.all([
      FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
          delegate: "GPU",
        },
        runningMode: "VIDEO",
        numFaces: 1,
        outputFaceBlendshapes: false,
        outputFacialTransformationMatrixes: true,
      }),
      PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
          delegate: "GPU",
        },
        runningMode: "VIDEO",
        numPoses: 1,
      }),
    ]);
    cachedFace = face;
    cachedPose = pose;
  })();

  return loadingPromise;
}

// Smoothing buffer — majority vote over last N frames
const SMOOTH_FRAMES = 12;
const eyeContactBuffer: boolean[] = [];
const postureBuffer: Array<"good" | "poor"> = [];

function smoothBool(buffer: boolean[], value: boolean): boolean {
  buffer.push(value);
  if (buffer.length > SMOOTH_FRAMES) buffer.shift();
  return buffer.filter(Boolean).length > buffer.length / 2;
}

function smoothPosture(buffer: Array<"good" | "poor">, value: "good" | "poor"): "good" | "poor" {
  buffer.push(value);
  if (buffer.length > SMOOTH_FRAMES) buffer.shift();
  return buffer.filter((v) => v === "good").length > buffer.length / 2 ? "good" : "poor";
}

export default function CameraFeed({ onMetrics, className }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const onMetricsRef = useRef(onMetrics);
  const [status, setStatus] = useState<"loading" | "active" | "error">("loading");

  useEffect(() => { onMetricsRef.current = onMetrics; }, [onMetrics]);

  useEffect(() => {
    let stream: MediaStream | null = null;

    async function init() {
      try {
        await getModels();

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
      if (!video || !canvas || !cachedFace || !cachedPose || video.readyState < 2) {
        animRef.current = requestAnimationFrame(detect);
        return;
      }

      const now = performance.now();
      const faceResult = cachedFace.detectForVideo(video, now);
      const poseResult = cachedPose.detectForVideo(video, now);

      // --- Eye contact ---
      let rawEyeContact = false;
      if (faceResult.faceLandmarks?.length) {
        const lm = faceResult.faceLandmarks[0];

        // Eye Aspect Ratio — checks if eyes are actually open
        const leftEAR = Math.abs(lm[L_EYE_UPPER].y - lm[L_EYE_LOWER].y) /
          (Math.abs(lm[L_EYE_INNER].x - lm[L_EYE_OUTER].x) + 1e-6);
        const rightEAR = Math.abs(lm[R_EYE_UPPER].y - lm[R_EYE_LOWER].y) /
          (Math.abs(lm[R_EYE_INNER].x - lm[R_EYE_OUTER].x) + 1e-6);
        const eyesOpen = leftEAR > 0.02 && rightEAR > 0.02;

        // Iris horizontal centering
        const leftRatio = (lm[L_IRIS].x - lm[L_EYE_OUTER].x) /
          (lm[L_EYE_INNER].x - lm[L_EYE_OUTER].x + 1e-6);
        const rightRatio = (lm[R_IRIS].x - lm[R_EYE_OUTER].x) /
          (lm[R_EYE_INNER].x - lm[R_EYE_OUTER].x + 1e-6);
        const iriscentred = leftRatio > 0.25 && leftRatio < 0.75 &&
          rightRatio > 0.25 && rightRatio < 0.75;

        rawEyeContact = eyesOpen && iriscentred;
      }

      // --- Posture (body-based via PoseLandmarker) ---
      let rawPosture: "good" | "poor" = "poor";
      if (poseResult.landmarks?.length) {
        const lm = poseResult.landmarks[0];
        const ls = lm[POSE_LEFT_SHOULDER];
        const rs = lm[POSE_RIGHT_SHOULDER];
        const le = lm[POSE_LEFT_EAR];
        const re = lm[POSE_RIGHT_EAR];
        const nose = lm[POSE_NOSE];

        // Check visibility — if landmarks aren't visible, posture is unknown
        const shouldersVisible = (ls.visibility ?? 0) > 0.5 && (rs.visibility ?? 0) > 0.5;

        if (shouldersVisible) {
          // 1. Shoulders should be roughly level (not heavily tilted)
          const shoulderTilt = Math.abs(ls.y - rs.y);

          // 2. Shoulders should not be raised too high (toward ears)
          const earMidY = (le.y + re.y) / 2;
          const shoulderMidY = (ls.y + rs.y) / 2;
          const shouldersRaised = shoulderMidY < earMidY + 0.08; // shoulders too close to ears

          // 3. Head should not be pitched too far down (nose much lower than ears)
          const noseDrop = nose.y - earMidY;
          const headDown = noseDrop > 0.12;

          // 4. Shoulders should be wide enough (not hunched/rounded forward)
          const shoulderWidth = Math.abs(ls.x - rs.x);
          const tooNarrow = shoulderWidth < 0.2;

          rawPosture = shoulderTilt < 0.08 && !shouldersRaised && !headDown && !tooNarrow
            ? "good"
            : "poor";
        } else {
          // Fallback to face-only if pose not visible
          if (faceResult.faceLandmarks?.length) {
            const lm = faceResult.faceLandmarks[0];
            const earSpan = Math.abs(lm[234].x - lm[454].x);
            const earMidY = (lm[234].y + lm[454].y) / 2;
            const noseDrop = lm[1].y - earMidY;
            rawPosture = earSpan > 0.15 && noseDrop < 0.15 ? "good" : "poor";
          }
        }
      } else if (faceResult.faceLandmarks?.length) {
        // No pose detected — face fallback
        const lm = faceResult.faceLandmarks[0];
        const earSpan = Math.abs(lm[234].x - lm[454].x);
        const earMidY = (lm[234].y + lm[454].y) / 2;
        const noseDrop = lm[1].y - earMidY;
        rawPosture = earSpan > 0.15 && noseDrop < 0.15 ? "good" : "poor";
      }

      if (!faceResult.faceLandmarks?.length && !poseResult.landmarks?.length) {
        onMetricsRef.current({ eyeContact: false, posture: "unknown" });
        animRef.current = requestAnimationFrame(detect);
        return;
      }

      onMetricsRef.current({
        eyeContact: smoothBool(eyeContactBuffer, rawEyeContact),
        posture: smoothPosture(postureBuffer, rawPosture),
      });

      animRef.current = requestAnimationFrame(detect);
    }

    init();

    return () => {
      cancelAnimationFrame(animRef.current);
      stream?.getTracks().forEach((t) => t.stop());
      // Don't close models — cached for reuse
    };
  }, []);

  return (
    <div className={className ?? "relative rounded-xl overflow-hidden bg-gray-900 aspect-video w-full"}>
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
