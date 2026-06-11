import { useCallback, useEffect, useMemo, useRef, useState, useId, type CSSProperties } from "react";
import Webcam from "react-webcam";
import { useT } from "@/lib/i18n-context";

const TUNE = {
  MIN_FACE_PRESENCE: 0.4,
  TARGET_FPS_MOBILE: 10,
  TARGET_FPS_DESKTOP: 18,
  MIN_SCALE_DESKTOP: 0.18,
  MIN_SCALE_MOBILE: 0.5,
  MAX_SCALE_DESKTOP: 0.7,
  MAX_SCALE_MOBILE: 0.58,
  CENTER_TOL_X_DESKTOP: 0.18,
  CENTER_TOL_Y_DESKTOP: 0.2,
  CENTER_TOL_X_MOBILE: 0.35,
  CENTER_TOL_Y_MOBILE: 0.1,
  INSIDE_GAIN_DESKTOP: 1.35,
  INSIDE_GAIN_MOBILE: 1.68,
  INSIDE_STRICT_MOBILE: 0.75,
  Y_CLAMP_MOBILE: 0.92,
  HOLD_FRAMES: 3,
  LOST_FACE_GRACE_MS: 900,
  CAPTURE_EXPAND_DESKTOP: 1.12,
  CAPTURE_EXPAND_MOBILE: 1.55,
  MOBILE_PAD_X: 0.28,
  MOBILE_PAD_TOP: 0.18,
  MOBILE_PAD_BOTTOM: 0.25,
  MOBILE_FACE_TOP_RATIO: 0.58,
  OVAL_SCALE_MOBILE: 0.74,
  OVAL_SCALE_DESKTOP: 1.0,
  OVAL_MIN_RX: 0.16,
  OVAL_MIN_RY: 0.16,
  OVERLAY_ALPHA_OK: 1,
  OVERLAY_ALPHA_BAD: 1,
  WARMUP_MS: 900,
  STABLE_WINDOW: 8,
  STABLE_WINDOW_MOBILE: 4,
  STABLE_MAX_JITTER: 0.05,
  STABLE_MAX_JITTER_MOBILE: 0.12,
  MOBILE_PREFER_VIDEO_FRAME: true,
  UI_THROTTLE_MS: 180,
  SKIP_AFTER_USERMEDIA_MS: 260,
  MIN_READY_W: 2,
  MIN_READY_H: 2,
  MAX_ROLL_RAD_MOBILE: 0.78,
  MAX_YAW_NORM_MOBILE: 0.6,
};

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

interface Point01 {
  x: number;
  y: number;
}

interface DetectionResult {
  keypoints: Point01[];
  boundingBox: { originX: number; originY: number; width: number; height: number } | null;
  score: number;
}

interface OvalPx {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Oval01 {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
}

interface Quality {
  ok: boolean;
  hint: string;
  metrics: Record<string, unknown>;
}

const KP_LEFT_EYE = 0;
const KP_RIGHT_EYE = 1;
const KP_NOSE = 2;
const KP_MOUTH = 3;
const KP_LEFT_EAR = 4;
const KP_RIGHT_EAR = 5;

function dist01(a: Point01, b: Point01) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function computeCenterFromKeypoints(kps: Point01[]): Point01 {
  if (kps.length < 4) return { x: 0.5, y: 0.5 };
  const le = kps[KP_LEFT_EYE];
  const re = kps[KP_RIGHT_EYE];
  const nose = kps[KP_NOSE];
  const mouth = kps[KP_MOUTH];
  return {
    x: (le.x + re.x + nose.x + mouth.x) / 4,
    y: (le.y + re.y + nose.y + mouth.y) / 4,
  };
}

function computeScaleFromKeypoints(kps: Point01[]) {
  if (kps.length < 2) return 0;
  const eyeDist = dist01(kps[KP_LEFT_EYE], kps[KP_RIGHT_EYE]);
  if (kps.length >= 6) {
    const earDist = dist01(kps[KP_LEFT_EAR], kps[KP_RIGHT_EAR]);
    return Math.max(eyeDist, earDist);
  }
  return eyeDist * 1.8;
}

function computeRollRadFromKeypoints(kps: Point01[]) {
  if (kps.length < 2) return 0;
  return Math.atan2(kps[KP_RIGHT_EYE].y - kps[KP_LEFT_EYE].y, kps[KP_RIGHT_EYE].x - kps[KP_LEFT_EYE].x);
}

function computeYawNormFromKeypoints(kps: Point01[]) {
  if (kps.length < 3) return 0;
  const nose = kps[KP_NOSE];
  const dl = dist01(nose, kps[KP_LEFT_EYE]);
  const dr = dist01(nose, kps[KP_RIGHT_EYE]);
  const sum = Math.max(1e-6, dl + dr);
  return (dl - dr) / sum;
}

function computeBBox01FromDetection(det: DetectionResult) {
  const bb = det.boundingBox;
  if (!bb) return null;
  const minX = clamp(bb.originX, 0, 1);
  const minY = clamp(bb.originY, 0, 1);
  const maxX = clamp(bb.originX + bb.width, 0, 1);
  const maxY = clamp(bb.originY + bb.height, 0, 1);
  if (maxX - minX < 0.008 || maxY - minY < 0.008) return null;
  return { minX, minY, maxX, maxY };
}

function getVideoViewportRect(containerW: number, containerH: number, videoW: number, videoH: number, fit: string) {
  if (!containerW || !containerH || !videoW || !videoH) {
    return { x: 0, y: 0, w: containerW || 0, h: containerH || 0 };
  }
  const sContain = Math.min(containerW / videoW, containerH / videoH);
  const sCover = Math.max(containerW / videoW, containerH / videoH);
  const s = fit === "cover" ? sCover : sContain;
  const rw = videoW * s;
  const rh = videoH * s;
  return { x: (containerW - rw) / 2, y: (containerH - rh) / 2, w: rw, h: rh };
}

function containerOvalToVideoOval(
  oval: Oval01,
  vr: { x: number; y: number; w: number; h: number },
  cw: number,
  ch: number,
) {
  const ovalCxPx = oval.cx * cw;
  const ovalCyPx = oval.cy * ch;
  const ovalRxPx = oval.rx * cw;
  const ovalRyPx = oval.ry * ch;
  const vw = Math.max(1e-6, vr.w);
  const vh = Math.max(1e-6, vr.h);
  return {
    cx: (ovalCxPx - vr.x) / vw,
    cy: (ovalCyPx - vr.y) / vh,
    rx: ovalRxPx / vw,
    ry: ovalRyPx / vh,
  };
}

async function captureVideoFrameBitmap(videoEl: HTMLVideoElement, jpegQuality: number) {
  if (!videoEl || !videoEl.videoWidth || !videoEl.videoHeight) return null;
  const sw = videoEl.videoWidth;
  const sh = videoEl.videoHeight;
  const c = document.createElement("canvas");
  c.width = sw;
  c.height = sh;
  const ctx = c.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(videoEl, 0, 0, sw, sh);
  const blob = await new Promise<Blob | null>((resolve) => c.toBlob(resolve, "image/jpeg", jpegQuality));
  if (!blob) return null;
  const bmp = await createImageBitmap(blob);
  return { bmp, srcW: sw, srcH: sh };
}

function dataUrlToBlob(dataUrl: string) {
  const [head, base64] = dataUrl.split(",");
  const mime = (head.match(/data:(.*);base64/) || [])[1] || "image/jpeg";
  const binStr = atob(base64);
  const len = binStr.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binStr.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

async function dataUrlToBitmap(dataUrl: string) {
  const blob = dataUrlToBlob(dataUrl);
  return createImageBitmap(blob);
}

function drawCoverToSquare(ctx: CanvasRenderingContext2D, img: CanvasImageSource, outW: number, outH: number) {
  const srcW = (img as HTMLImageElement).width || (img as HTMLImageElement).naturalWidth || 0;
  const srcH = (img as HTMLImageElement).height || (img as HTMLImageElement).naturalHeight || 0;
  if (!srcW || !srcH) return null;
  const side = Math.min(srcW, srcH);
  const sx = Math.round((srcW - side) / 2);
  const sy = Math.round((srcH - side) / 2);
  ctx.drawImage(img, sx, sy, side, side, 0, 0, outW, outH);
  return { sx, sy, side, srcW, srcH };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _detectorInstance: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _detectorPromise: Promise<any> | null = null;

const WASM_CDN = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm";
const MODEL_CDN =
  "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/latest/blaze_face_short_range.tflite";

async function getFaceDetector() {
  if (_detectorInstance) return _detectorInstance;
  if (_detectorPromise) return _detectorPromise;

  _detectorPromise = (async () => {
    const { FaceDetector, FilesetResolver } = await import("@mediapipe/tasks-vision");
    const vision = await FilesetResolver.forVisionTasks(WASM_CDN);

    const isMob = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator?.userAgent ?? "",
    );
    const tryOrder: Array<"CPU" | "GPU"> = isMob ? ["CPU", "GPU"] : ["GPU", "CPU"];
    for (const delegate of tryOrder) {
      try {
        _detectorInstance = await FaceDetector.createFromOptions(vision, {
          baseOptions: { modelAssetPath: MODEL_CDN, delegate },
          runningMode: "VIDEO",
          minDetectionConfidence: 0.5,
        });
        return _detectorInstance;
      } catch {
        _detectorInstance = null;
      }
    }
    throw new Error("FaceDetector: both GPU and CPU delegates failed");
  })();

  try {
    return await _detectorPromise;
  } catch (e) {
    _detectorPromise = null;
    throw e;
  }
}

function useVideoFrameLoop(
  enabled: boolean,
  videoEl: HTMLVideoElement | null | undefined,
  fn: (now: number) => Promise<void>,
  fps: number,
) {
  const cbRef = useRef(fn);
  cbRef.current = fn;
  const runningRef = useRef(false);
  const handleRef = useRef<number | null>(null);
  const lastRef = useRef(0);

  useEffect(() => {
    if (!enabled || !videoEl) return;
    runningRef.current = true;
    lastRef.current = 0;
    const minDt = 1000 / Math.max(1, fps);

    const tick = async (tNow?: number) => {
      if (!runningRef.current) return;
      const now = typeof tNow === "number" ? tNow : performance.now();
      if (now - lastRef.current >= minDt) {
        lastRef.current = now;
        try {
          await cbRef.current(now);
        } catch {}
      }
      if (typeof (videoEl as any).requestVideoFrameCallback === "function") {
        handleRef.current = (videoEl as any).requestVideoFrameCallback(tick);
      } else {
        handleRef.current = window.setTimeout(() => tick(performance.now()), Math.max(0, minDt)) as unknown as number;
      }
    };

    if (typeof (videoEl as any).requestVideoFrameCallback === "function") {
      handleRef.current = (videoEl as any).requestVideoFrameCallback(tick);
    } else {
      handleRef.current = window.setTimeout(() => tick(performance.now()), minDt) as unknown as number;
    }

    return () => {
      runningRef.current = false;
      if (typeof (videoEl as any).cancelVideoFrameCallback === "function" && typeof handleRef.current === "number") {
        try { (videoEl as any).cancelVideoFrameCallback(handleRef.current); } catch {}
      } else if (handleRef.current != null) {
        clearTimeout(handleRef.current);
      }
      handleRef.current = null;
    };
  }, [enabled, videoEl, fps]);
}

function IconClose({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M6 6L18 18M18 6L6 18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}
function IconConfirm({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconCamera({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M9 7l1.2-2h3.6L15 7h3a3 3 0 013 3v7a3 3 0 01-3 3H6a3 3 0 01-3-3v-7a3 3 0 013-3h3z"
        stroke="currentColor" strokeWidth="2" strokeLinejoin="round"
      />
      <circle cx="12" cy="13" r="3.2" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}
function IconSwitch({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M7 7h10M17 7l-2-2m2 2l-2 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M17 17H7m0 0l2-2m-2 2l2 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7 7c-2 2-2 8 0 10M17 17c2-2 2-8 0-10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function FaceGuideOverlay({ ovalPx, ok, hint }: { ovalPx: OvalPx; ok: boolean; hint: string }) {
  const rid = useId();
  const safeId = rid.replace(/[:]/g, "_");
  const maskId = `hole_${safeId}`;
  const gradId = `grad_${safeId}`;
  const cx = ovalPx.x + ovalPx.w / 2;
  const cy = ovalPx.y + ovalPx.h / 2;
  const hintTop = Math.max(10, ovalPx.y - 54);
  const a = clamp(ok ? TUNE.OVERLAY_ALPHA_OK : TUNE.OVERLAY_ALPHA_BAD, 0, 1);

  return (
    <div style={S.overlay} aria-hidden>
      <svg width="100%" height="100%">
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="0" gradientUnits="objectBoundingBox" gradientTransform="rotate(150 0.5 0.5)">
            <stop offset="0%" stopColor="#324359" stopOpacity={a} />
            <stop offset="10%" stopColor="#304051" stopOpacity={a} />
            <stop offset="20%" stopColor="#27394A" stopOpacity={a} />
            <stop offset="55%" stopColor="#1C2C3E" stopOpacity={a} />
            <stop offset="100%" stopColor="#172A40" stopOpacity={a} />
          </linearGradient>
          <mask id={maskId}>
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            <ellipse cx={cx} cy={cy} rx={ovalPx.w / 2} ry={ovalPx.h / 2} fill="black" />
          </mask>
        </defs>
        <rect x="0" y="0" width="100%" height="100%" fill={`url(#${gradId})`} mask={`url(#${maskId})`} />
        <ellipse
          cx={cx} cy={cy} rx={ovalPx.w / 2} ry={ovalPx.h / 2}
          fill="transparent"
          stroke={ok ? "rgba(40,200,120,0.95)" : "rgba(255,255,255,0.92)"}
          strokeWidth="3"
        />
      </svg>
      <div style={{ ...S.ovalHintTopWrap, left: ovalPx.x, top: hintTop, width: ovalPx.w }}>
        <div style={{ ...S.ovalHintPill, borderColor: ok ? "rgba(40,200,120,0.85)" : "rgba(255,255,255,0.22)" }}>
          {hint}
        </div>
      </div>
    </div>
  );
}

function PreviewPane({
  image,
  onRetake,
  onConfirm,
  labels,
}: {
  image: string;
  onRetake: () => void;
  onConfirm: () => void;
  labels: { title: string; sub: string; alt: string; retake: string; confirm: string };
}) {
  if (!image) return null;
  return (
    <div style={S.previewWrap}>
      <div style={S.previewCard}>
        <div style={S.previewHead}>
          <div style={S.previewTitle}>{labels.title}</div>
          <div style={S.previewSub}>{labels.sub}</div>
        </div>
        <div style={S.previewImgWrap}>
          <img src={image} alt={labels.alt} style={S.previewImg} />
        </div>
        <div style={S.previewActions}>
          <button style={S.btnGhost} onClick={onRetake} type="button" title={labels.retake} aria-label={labels.retake}>
            <IconCamera size={18} />
          </button>
          <button style={S.iconBtnPrimary} onClick={onConfirm} type="button" title={labels.confirm} aria-label={labels.confirm}>
            <IconConfirm size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}

interface CameraFaceProps {
  onConfirm: (dataUrl: string) => void;
  onClose: () => void;
  outputSize?: number;
  jpegQuality?: number;
}

export default function CameraFace({
  onConfirm,
  onClose,
  outputSize = 300,
  jpegQuality = 0.92,
}: CameraFaceProps) {
  const t = useT();

  const webcamRef = useRef<Webcam>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const faceDetectorRef = useRef<any>(null);
  const modelInitOnceRef = useRef(false);

  const [err, setErr] = useState("");
  const [modelReady, setModelReady] = useState(false);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [autoCapture, setAutoCapture] = useState(true);
  const [preview, setPreview] = useState("");
  const okStreakRef = useRef(0);
  const lastDetectionRef = useRef<DetectionResult | null>(null);
  const lastPresenceRef = useRef(0);
  const lastSeenRef = useRef({ ts: 0, scale: 0 });
  const busyRef = useRef(false);
  const lastUiRef = useRef({ t: 0, ok: false as boolean | null, hint: "" });
  const skipUntilRef = useRef(0);
  const noFaceCountRef = useRef(0);
  const cpuRetryDoneRef = useRef(false);

  const [docVisible, setDocVisible] = useState(() => !document.hidden);
  useEffect(() => {
    const onVis = () => setDocVisible(!document.hidden);
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  const videoEl = (webcamRef.current as any)?.video as HTMLVideoElement | undefined;

  const [vw, setVw] = useState(typeof window !== "undefined" ? window.innerWidth : 1200);
  useEffect(() => {
    const onResize = () => setVw(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  const isMobile = vw < 768;
  const mirrored = facingMode === "user";

  const smoothRef = useRef({ has: false, x: 0.5, y: 0.5 });
  const resetSmoothing = useCallback(() => {
    smoothRef.current = { has: false, x: 0.5, y: 0.5 };
  }, []);
  const smooth01 = useCallback((p: Point01, alpha = 0.35) => {
    if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) return null;
    const s = smoothRef.current;
    if (!s.has) { s.has = true; s.x = p.x; s.y = p.y; return { x: s.x, y: s.y }; }
    s.x += (p.x - s.x) * alpha;
    s.y += (p.y - s.y) * alpha;
    return { x: s.x, y: s.y };
  }, []);

  const warmRef = useRef({ t0: 0 });
  const resetWarmup = useCallback(() => { warmRef.current = { t0: performance.now() }; }, []);

  const containerStyle = useMemo((): CSSProperties => {
    const w = isMobile ? "100vw" : 520;
    const h = isMobile ? "82dvh" : 620;
    return {
      ...S.container,
      width: typeof w === "number" ? `${w}px` : w,
      height: typeof h === "number" ? `${h}px` : h,
      maxWidth: "520px",
      maxHeight: "720px",
      margin: "0 auto",
    };
  }, [isMobile]);

  const oval = useMemo((): Oval01 => {
    const base = { cx: 0.5, cy: isMobile ? 0.5 : 0.44, rx: isMobile ? 0.48 : 0.26, ry: isMobile ? 0.46 : 0.34 };
    const s = isMobile ? TUNE.OVAL_SCALE_MOBILE : TUNE.OVAL_SCALE_DESKTOP;
    return { ...base, rx: Math.max(TUNE.OVAL_MIN_RX, base.rx * s), ry: Math.max(TUNE.OVAL_MIN_RY, base.ry * s) };
  }, [isMobile]);

  const [containerSize, setContainerSize] = useState({ w: 520, h: 620 });
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const calc = () => { const r = el.getBoundingClientRect(); setContainerSize({ w: r.width, h: r.height }); };
    calc();
    if (window.ResizeObserver) {
      const ro = new ResizeObserver(calc);
      ro.observe(el);
      return () => ro.disconnect();
    }
    window.addEventListener("resize", calc);
    return () => window.removeEventListener("resize", calc);
  }, []);

  const [ovalPx, setOvalPx] = useState<OvalPx>({ x: 0, y: 0, w: 0, h: 0 });
  useEffect(() => {
    const { w, h } = containerSize;
    const ww = Math.max(160, oval.rx * 2 * w);
    const hh = Math.max(160, oval.ry * 2 * h);
    setOvalPx({
      x: clamp(oval.cx * w - ww / 2, 0, w - ww),
      y: clamp(oval.cy * h - hh / 2, 0, h - hh),
      w: ww, h: hh,
    });
  }, [oval, containerSize]);

  const vW0 = videoEl?.videoWidth || 0;
  const vH0 = videoEl?.videoHeight || 0;
  const videoIsLandscape = vW0 > 0 && vH0 > 0 ? vW0 > vH0 : false;
  const containerIsPortrait = containerSize.h > containerSize.w;

  const fitMode = useMemo(() => {
    if (isMobile && videoIsLandscape && containerIsPortrait) return "contain";
    return "cover";
  }, [isMobile, videoIsLandscape, containerIsPortrait]);

  const videoViewport = useMemo(
    () => getVideoViewportRect(containerSize.w, containerSize.h, videoEl?.videoWidth || 0, videoEl?.videoHeight || 0, fitMode),
    [containerSize, videoEl?.videoWidth, videoEl?.videoHeight, fitMode],
  );

  const ovalVideo = useMemo(() => {
    const ov = containerOvalToVideoOval(oval, videoViewport, containerSize.w, containerSize.h);
    return {
      cx: clamp(ov.cx, -1, 2),
      cy: clamp(ov.cy, -1, 2),
      rx: clamp(ov.rx, 0.0001, 2),
      ry: clamp(ov.ry, 0.0001, 2),
    };
  }, [oval, videoViewport, containerSize]);

  const initModelOnce = useCallback(async () => {
    if (modelInitOnceRef.current) return;
    modelInitOnceRef.current = true;
    try {
      setErr("");
      setModelReady(false);
      const detector = await getFaceDetector();
      faceDetectorRef.current = detector;
      setModelReady(true);
      resetSmoothing();
      resetWarmup();
    } catch (e: any) {
      setErr(e?.message || t.cameraFace.initFailed);
      setModelReady(false);
      modelInitOnceRef.current = false;
    }
  }, [resetSmoothing, resetWarmup, t]);

  useEffect(() => { initModelOnce(); }, [initModelOnce]);

  const [quality, setQuality] = useState<Quality>({
    ok: false,
    hint: t.cameraFace.placeFace,
    metrics: {},
  });

  const evaluate = useCallback((): Quality => {
    if (!videoEl || !videoEl.videoWidth || !videoEl.videoHeight) {
      return { ok: false, hint: t.cameraFace.cameraNotReady, metrics: {} };
    }
    const det = lastDetectionRef.current;
    const presence = lastPresenceRef.current || 0;
    const minScale = isMobile ? TUNE.MIN_SCALE_MOBILE : TUNE.MIN_SCALE_DESKTOP;
    const maxScale = isMobile ? TUNE.MAX_SCALE_MOBILE : TUNE.MAX_SCALE_DESKTOP;
    const tolX = isMobile ? TUNE.CENTER_TOL_X_MOBILE : TUNE.CENTER_TOL_X_DESKTOP;
    const tolY = isMobile ? TUNE.CENTER_TOL_Y_MOBILE : TUNE.CENTER_TOL_Y_DESKTOP;
    const insideGain = isMobile ? TUNE.INSIDE_GAIN_MOBILE : TUNE.INSIDE_GAIN_DESKTOP;

    if (!det || !det.keypoints || presence < TUNE.MIN_FACE_PRESENCE) {
      const now = Date.now();
      const { ts, scale } = lastSeenRef.current;
      if (ts && now - ts <= TUNE.LOST_FACE_GRACE_MS && scale >= maxScale * 0.92) {
        return { ok: false, hint: t.cameraFace.moveFarther, metrics: { faceScale: scale, presence } };
      }
      return { ok: false, hint: t.cameraFace.noFaceDetected, metrics: { presence } };
    }

    const kps = det.keypoints;
    const center = computeCenterFromKeypoints(kps);
    const faceScale = computeScaleFromKeypoints(kps);
    const roll = computeRollRadFromKeypoints(kps);
    const yaw = computeYawNormFromKeypoints(kps);
    lastSeenRef.current = { ts: Date.now(), scale: faceScale };

    if (!Number.isFinite(faceScale) || faceScale <= 0)
      return { ok: false, hint: t.cameraFace.detecting, metrics: { presence } };
    if (faceScale < minScale)
      return { ok: false, hint: t.cameraFace.moveCloser, metrics: { faceScale, center, roll, yaw, presence } };
    if (faceScale > maxScale)
      return { ok: false, hint: t.cameraFace.moveFarther, metrics: { faceScale, center, roll, yaw, presence } };

    if (isMobile) {
      if (Math.abs(roll) > TUNE.MAX_ROLL_RAD_MOBILE)
        return { ok: false, hint: t.cameraFace.keepPhoneStraight, metrics: { faceScale, center, roll, yaw, presence } };
      if (Math.abs(yaw) > TUNE.MAX_YAW_NORM_MOBILE)
        return { ok: false, hint: t.cameraFace.lookStraight, metrics: { faceScale, center, roll, yaw, presence } };
    }

    const centerUI = mirrored ? { x: 1 - center.x, y: center.y } : center;
    const dx = centerUI.x - ovalVideo.cx;
    const dy = centerUI.y - ovalVideo.cy;

    if (Math.abs(dx) > tolX || Math.abs(dy) > tolY) {
      if (Math.abs(dx) > Math.abs(dy)) {
        return { ok: false, hint: dx > 0 ? t.cameraFace.moveLeft : t.cameraFace.moveRight, metrics: { faceScale, centerUI, roll, yaw, presence } };
      }
      return { ok: false, hint: dy > 0 ? t.cameraFace.moveUp : t.cameraFace.moveDown, metrics: { faceScale, centerUI, roll, yaw, presence } };
    }

    const exn = (centerUI.x - ovalVideo.cx) / Math.max(1e-6, ovalVideo.rx);
    const eyn = (centerUI.y - ovalVideo.cy) / Math.max(1e-6, ovalVideo.ry);

    if (isMobile) {
      if (exn * exn + eyn * eyn > TUNE.INSIDE_STRICT_MOBILE)
        return { ok: false, hint: t.cameraFace.alignFace, metrics: { faceScale, centerUI, roll, yaw, presence } };
      if (Math.abs(centerUI.y - ovalVideo.cy) > ovalVideo.ry * TUNE.Y_CLAMP_MOBILE) {
        return {
          ok: false,
          hint: centerUI.y > ovalVideo.cy ? t.cameraFace.moveUp : t.cameraFace.moveDown,
          metrics: { faceScale, centerUI, roll, yaw, presence },
        };
      }
    } else {
      if (exn * exn + eyn * eyn > insideGain)
        return { ok: false, hint: t.cameraFace.alignFace, metrics: { faceScale, centerUI, roll, yaw, presence } };
    }

    return { ok: true, hint: t.cameraFace.goodHoldStill, metrics: { faceScale, centerUI, roll, yaw, presence } };
  }, [videoEl, isMobile, mirrored, ovalVideo, t]);

  const capturePortrait = useCallback(async () => {
    const webcam = webcamRef.current;
    if (!webcam) return;
    const out = document.createElement("canvas");
    out.width = outputSize;
    out.height = outputSize;
    const ctx = out.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, outputSize, outputSize);

    let bmp: ImageBitmap | null = null;
    let srcW = 0;
    let srcH = 0;

    if (isMobile && TUNE.MOBILE_PREFER_VIDEO_FRAME) {
      try {
        const f = await captureVideoFrameBitmap(videoEl!, jpegQuality);
        if (f?.bmp) { bmp = f.bmp; srcW = f.srcW; srcH = f.srcH; }
      } catch {}
    }

    if (!bmp) {
      const dataUrl = webcam.getScreenshot();
      if (!dataUrl) return;
      try { bmp = await dataUrlToBitmap(dataUrl); } catch { return; }
      srcW = bmp.width;
      srcH = bmp.height;
      if (!srcW || !srcH) return;
    }

    if (isMobile) {
      const det = lastDetectionRef.current;
      const bbox01 = det ? computeBBox01FromDetection(det) : null;
      if (!bbox01) {
        drawCoverToSquare(ctx, bmp, outputSize, outputSize);
        setPreview(out.toDataURL("image/jpeg", jpegQuality));
        bmp.close();
        return;
      }
      let { minX, minY, maxX, maxY } = bbox01;
      const bw = maxX - minX;
      const bh = maxY - minY;
      minX = clamp(minX - bw * TUNE.MOBILE_PAD_X, 0, 1);
      maxX = clamp(maxX + bw * TUNE.MOBILE_PAD_X, 0, 1);
      minY = clamp(minY - bh * TUNE.MOBILE_PAD_TOP, 0, 1);
      maxY = clamp(maxY + bh * TUNE.MOBILE_PAD_BOTTOM, 0, 1);
      let side = Math.max(maxX - minX, maxY - minY) * TUNE.CAPTURE_EXPAND_MOBILE;
      side = clamp(side, 0.12, 1.0);
      const faceCx = (minX + maxX) / 2;
      const faceCy = (minY + maxY) / 2;
      let cropS = Math.round(side * Math.min(srcW, srcH));
      cropS = clamp(cropS, 64, Math.min(srcW, srcH));
      let cropX = Math.round(faceCx * srcW - cropS / 2);
      let cropY = Math.round(faceCy * srcH - cropS * TUNE.MOBILE_FACE_TOP_RATIO);
      cropX = clamp(cropX, 0, srcW - cropS);
      cropY = clamp(cropY, 0, srcH - cropS);
      ctx.drawImage(bmp, cropX, cropY, cropS, cropS, 0, 0, outputSize, outputSize);
      bmp.close();
      setPreview(out.toDataURL("image/jpeg", jpegQuality));
      return;
    }

    const baseHalf = Math.max(ovalVideo.rx * srcW, ovalVideo.ry * srcH) * TUNE.CAPTURE_EXPAND_DESKTOP;
    const srcCxNorm = mirrored ? 1 - ovalVideo.cx : ovalVideo.cx;
    const cx = srcCxNorm * srcW;
    const cy = ovalVideo.cy * srcH;
    let cropS = Math.round(baseHalf * 2);
    cropS = clamp(cropS, 64, Math.min(srcW, srcH));
    let cropX = Math.round(cx - cropS / 2);
    let cropY = Math.round(cy - cropS / 2);
    cropX = clamp(cropX, 0, srcW - cropS);
    cropY = clamp(cropY, 0, srcH - cropS);
    ctx.drawImage(bmp, cropX, cropY, cropS, cropS, 0, 0, outputSize, outputSize);
    bmp.close();
    setPreview(out.toDataURL("image/jpeg", jpegQuality));
  }, [videoEl, isMobile, outputSize, jpegQuality, ovalVideo, mirrored]);

  const doRetake = useCallback(() => {
    setPreview("");
    okStreakRef.current = 0;
    resetSmoothing();
    resetWarmup();
    lastUiRef.current = { t: 0, ok: null, hint: "" };
    skipUntilRef.current = performance.now() + TUNE.SKIP_AFTER_USERMEDIA_MS;
  }, [resetSmoothing, resetWarmup]);

  const doSwitchCamera = useCallback(() => {
    setFacingMode((m) => (m === "user" ? "environment" : "user"));
    okStreakRef.current = 0;
    lastSeenRef.current = { ts: 0, scale: 0 };
    skipUntilRef.current = performance.now() + TUNE.SKIP_AFTER_USERMEDIA_MS;
    resetSmoothing();
    resetWarmup();
  }, [resetSmoothing, resetWarmup]);

  const canRun = modelReady && !preview && docVisible;
  const disabled = !modelReady || !!preview;
  const stableRef = useRef<{ buf: Point01[] }>({ buf: [] });
  const targetFps = isMobile ? TUNE.TARGET_FPS_MOBILE : TUNE.TARGET_FPS_DESKTOP;

  const videoConstraints = useMemo(() => {
    if (isMobile) {
      return { facingMode, width: { ideal: 960 }, height: { ideal: 540 }, frameRate: { ideal: 18, max: 24 } };
    }
    return { facingMode, width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 24, max: 30 } };
  }, [isMobile, facingMode]);

  useVideoFrameLoop(canRun, videoEl, async (now) => {
    const detector = faceDetectorRef.current;
    if (!detector || !videoEl) return;
    if (performance.now() < (skipUntilRef.current || 0)) return;
    if (videoEl.readyState < 2) return;
    const vW = videoEl.videoWidth || 0;
    const vH = videoEl.videoHeight || 0;
    if (vW < TUNE.MIN_READY_W || vH < TUNE.MIN_READY_H) return;
    if ((containerSize?.w || 0) < 8 || (containerSize?.h || 0) < 8) return;

    if (!warmRef.current.t0) warmRef.current.t0 = now;
    const warming = now - warmRef.current.t0 < TUNE.WARMUP_MS;
    if (busyRef.current) return;
    busyRef.current = true;

    try {
      let res: any = null;
      try { res = detector.detectForVideo(videoEl, now); } catch {
        lastDetectionRef.current = null;
        lastPresenceRef.current = 0;
      }
      const detections = res?.detections || [];
      const hasFace = detections.length > 0;

      if (hasFace) { noFaceCountRef.current = 0; } else {
        noFaceCountRef.current++;
        if (!cpuRetryDoneRef.current && noFaceCountRef.current >= 30) {
          cpuRetryDoneRef.current = true;
          _detectorInstance = null;
          _detectorPromise = null;
          try {
            const { FaceDetector, FilesetResolver } = await import("@mediapipe/tasks-vision");
            const vision = await FilesetResolver.forVisionTasks(WASM_CDN);
            const newDet = await FaceDetector.createFromOptions(vision, {
              baseOptions: { modelAssetPath: MODEL_CDN, delegate: "CPU" },
              runningMode: "VIDEO",
              minDetectionConfidence: 0.4,
            });
            _detectorInstance = newDet;
            faceDetectorRef.current = newDet;
          } catch {}
        }
      }

      if (hasFace) {
        const det = detections[0];
        const kps = (det.keypoints || []).map((kp: any) => ({ x: kp.x as number, y: kp.y as number }));
        lastDetectionRef.current = {
          keypoints: kps,
          boundingBox: det.boundingBox
            ? { originX: det.boundingBox.originX / vW, originY: det.boundingBox.originY / vH, width: det.boundingBox.width / vW, height: det.boundingBox.height / vH }
            : null,
          score: det.categories?.[0]?.score || 0,
        };
        lastPresenceRef.current = det.categories?.[0]?.score || 0;
      } else {
        lastDetectionRef.current = null;
        lastPresenceRef.current = 0;
      }

      let centerRaw: Point01 | null = null;
      if (hasFace && lastDetectionRef.current?.keypoints?.length! >= 4) {
        const c = computeCenterFromKeypoints(lastDetectionRef.current!.keypoints);
        if (Number.isFinite(c.x) && Number.isFinite(c.y)) {
          centerRaw = { x: clamp(c.x, 0, 1), y: clamp(c.y, 0, 1) };
        }
      }

      const stableWindow = isMobile ? TUNE.STABLE_WINDOW_MOBILE : TUNE.STABLE_WINDOW;
      const stableMaxJitter = isMobile ? TUNE.STABLE_MAX_JITTER_MOBILE : TUNE.STABLE_MAX_JITTER;
      const sb = stableRef.current;
      if (centerRaw) {
        const smoothed = smooth01(centerRaw, isMobile ? 0.5 : 0.35);
        sb.buf.push(smoothed || centerRaw);
        if (sb.buf.length > stableWindow) sb.buf.shift();
      } else {
        sb.buf = [];
      }

      let stable = false;
      if (sb.buf.length >= Math.min(3, stableWindow)) {
        const xs = sb.buf.map((p) => p.x);
        const ys = sb.buf.map((p) => p.y);
        const jitter = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
        stable = jitter <= stableMaxJitter;
      }

      const q = evaluate();
      const q2 = warming || !stable
        ? { ...q, ok: false, hint: warming ? t.cameraFace.cameraStarting : t.cameraFace.stabilizing }
        : q;

      const uiNow = performance.now();
      const last = lastUiRef.current;
      const changed = last.ok !== q2.ok || last.hint !== q2.hint;
      if (changed || uiNow - last.t > TUNE.UI_THROTTLE_MS) {
        lastUiRef.current = { t: uiNow, ok: q2.ok, hint: q2.hint };
        setQuality(q2);
      }

      if (autoCapture && q2.ok) {
        okStreakRef.current += 1;
        if (okStreakRef.current >= TUNE.HOLD_FRAMES) {
          okStreakRef.current = 0;
          await capturePortrait();
        }
      } else {
        okStreakRef.current = 0;
      }

      if (!centerRaw) resetSmoothing();
    } finally {
      busyRef.current = false;
    }
  }, targetFps);

  const hintText = useMemo(() => {
    if (err) return `${t.cameraFace.errorPrefix}: ${err}`;
    if (!modelReady) return t.cameraFace.loadingModel;
    return quality?.hint || t.cameraFace.placeFace;
  }, [err, modelReady, quality, t]);

  const containerBg = fitMode === "contain" ? "rgb(2,62,138)" : "#000";

  return (
    <div ref={containerRef} style={{ ...containerStyle, background: containerBg }}>
      <Webcam
        ref={webcamRef}
        audio={false}
        muted
        mirrored={mirrored}
        videoConstraints={videoConstraints}
        style={{ ...S.video, objectFit: fitMode as CSSProperties["objectFit"], objectPosition: "center center", background: containerBg }}
        screenshotFormat="image/jpeg"
        screenshotQuality={jpegQuality}
        forceScreenshotSourceSize={!isMobile}
        playsInline
        disablePictureInPicture
        onUserMedia={() => {
          setErr("");
          resetSmoothing();
          resetWarmup();
          lastUiRef.current = { t: 0, ok: null, hint: "" };
          skipUntilRef.current = performance.now() + TUNE.SKIP_AFTER_USERMEDIA_MS;
        }}
        onUserMediaError={(e: any) => setErr(e?.message || t.cameraFace.cameraPermissionError)}
      />
      <FaceGuideOverlay ovalPx={ovalPx} ok={!!quality?.ok} hint={hintText} />
      <div style={S.controls}>
        <button style={S.iconBtnGhost} onClick={onClose} disabled={disabled} title={t.common.close} aria-label={t.common.close} type="button">
          <IconClose size={18} />
        </button>
        <div style={S.controlsCenter}>
          <button style={S.iconBtnPrimary} onClick={capturePortrait} disabled={disabled} title={t.cameraFace.capture} aria-label={t.cameraFace.capture} type="button">
            <IconCamera size={18} />
          </button>
          <label style={S.toggle} title={t.cameraFace.autoCapture}>
            <input type="checkbox" checked={autoCapture} onChange={(e) => setAutoCapture(e.target.checked)} disabled={disabled} />
            <span>{t.cameraFace.auto}</span>
          </label>
          <button style={S.iconBtnGhost} onClick={doSwitchCamera} disabled={disabled} title={t.cameraFace.switchCamera} aria-label={t.cameraFace.switchCamera} type="button">
            <IconSwitch size={18} />
          </button>
        </div>
      </div>
      {preview && (
        <PreviewPane
          image={preview}
          onRetake={doRetake}
          onConfirm={() => { if (preview) onConfirm(preview); }}
          labels={{
            title: t.cameraFace.previewTitle,
            sub: t.cameraFace.previewSub,
            alt: t.cameraFace.previewAlt,
            retake: t.cameraFace.retake,
            confirm: t.cameraFace.confirmBtn,
          }}
        />
      )}
    </div>
  );
}

const S: Record<string, CSSProperties> = {
  container: {
    position: "relative",
    borderRadius: 6,
    overflow: "hidden",
    boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
    touchAction: "manipulation",
  },
  video: {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    display: "block",
    zIndex: 1,
  },
  overlay: {
    position: "absolute",
    inset: 0,
    pointerEvents: "none",
    zIndex: 2,
  },
  ovalHintTopWrap: {
    position: "absolute",
    display: "flex",
    justifyContent: "center",
    padding: "0 6px",
    pointerEvents: "none",
  },
  ovalHintPill: {
    color: "white",
    fontSize: 13,
    padding: "10px 14px",
    borderRadius: 999,
    background: "rgba(0,0,0,0.45)",
    border: "1px solid rgba(255,255,255,0.22)",
    backdropFilter: "blur(6px)",
    textAlign: "center",
    lineHeight: 1.2,
    maxWidth: "100%",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  controls: {
    position: "absolute",
    left: 14,
    right: 14,
    bottom: "calc(14px + env(safe-area-inset-bottom, 0px))",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    pointerEvents: "auto",
    zIndex: 3,
  },
  controlsCenter: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" },
  iconBtnPrimary: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 48,
    height: 48,
    borderRadius: 14,
    border: "1px solid rgba(40,200,120,0.5)",
    background: "rgba(0,0,0,0.9)",
    color: "rgb(40,200,120)",
    cursor: "pointer",
    transition: "all 0.2s ease",
    lineHeight: 0,
  },
  iconBtnGhost: {
    width: 46,
    height: 46,
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.18)",
    background: "rgba(0,0,0,0.25)",
    color: "white",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    lineHeight: 0,
  },
  toggle: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "10px 12px",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.18)",
    background: "rgba(0,0,0,0.25)",
    color: "white",
    cursor: "pointer",
    userSelect: "none",
  },
  previewWrap: {
    position: "absolute",
    inset: 0,
    background: "rgba(2,62,100,0.85)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    zIndex: 4,
    pointerEvents: "auto",
  },
  previewCard: {
    width: "min(520px, 96vw)",
    borderRadius: 18,
    background: "rgba(16,16,16,0.52)",
    border: "1px solid rgba(255,255,255,0.12)",
    boxShadow: "0 20px 60px rgba(0,0,0,0.45)",
    overflow: "hidden",
  },
  previewHead: { padding: 14 },
  previewTitle: { color: "white", fontSize: 16, fontWeight: 900 },
  previewSub: { color: "rgba(255,255,255,0.75)", fontSize: 12, marginTop: 4 },
  previewImgWrap: { padding: 14, paddingTop: 0 },
  previewImg: { width: "100%", borderRadius: 14, display: "block" },
  previewActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: 10,
    padding: 14,
    borderTop: "1px solid rgba(255,255,255,0.08)",
  },
  btnGhost: {
    width: 46,
    height: 46,
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.18)",
    background: "rgba(0,0,0,0.25)",
    color: "white",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    lineHeight: 0,
  },
};
