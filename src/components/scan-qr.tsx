import { useEffect, useRef, useState, useCallback } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import {
  Camera,
  RefreshCw,
  X,
  Zap,
  ZapOff,
  Check,
  RotateCcw,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n-context";

type ScanQRProps = {
  open: boolean;
  onClose: () => void;
  onResult: (text: string) => void;
  title?: string;
  description?: string;
  /**
   * If true, skip the confirm step and call onResult immediately on detect.
   * Default false.
   */
  autoConfirm?: boolean;
};

export function ScanQR({
  open,
  onClose,
  onResult,
  title,
  description,
  autoConfirm = false,
}: ScanQRProps) {
  const t = useT();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const detectedLockRef = useRef(false);

  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [activeCameraId, setActiveCameraId] = useState<string | null>(null);
  const [error, setError] = useState<string>("");
  const [starting, setStarting] = useState(false);
  const [pendingResult, setPendingResult] = useState<string | null>(null);
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);

  // Discover cameras
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setError("");
    setPendingResult(null);
    detectedLockRef.current = false;
    Html5Qrcode.getCameras()
      .then((devs) => {
        if (cancelled) return;
        const list = devs.map((d) => ({ id: d.id, label: d.label || "Camera" }));
        setCameras(list);
        const back = list.find((c) =>
          /back|rear|environment|sau|sau\b/i.test(c.label),
        );
        setActiveCameraId((back ?? list[0])?.id ?? null);
      })
      .catch((e: any) => {
        if (cancelled) return;
        setError(e?.message ?? t.scanQR.cameraError);
      });
    return () => {
      cancelled = true;
    };
  }, [open, t.scanQR.cameraError]);

  // Start / stop scanner
  useEffect(() => {
    if (!open || !activeCameraId || !containerRef.current) return;
    if (pendingResult) return; // paused while user confirms

    let cancelled = false;
    const elementId = "scan-qr-region";
    containerRef.current.id = elementId;

    const scanner = new Html5Qrcode(elementId, {
      verbose: false,
      formatsToSupport: [
        Html5QrcodeSupportedFormats.QR_CODE,
        Html5QrcodeSupportedFormats.EAN_13,
        Html5QrcodeSupportedFormats.EAN_8,
        Html5QrcodeSupportedFormats.UPC_A,
        Html5QrcodeSupportedFormats.UPC_E,
        Html5QrcodeSupportedFormats.CODE_128,
        Html5QrcodeSupportedFormats.CODE_39,
        Html5QrcodeSupportedFormats.ITF,
      ],
    });
    scannerRef.current = scanner;
    setStarting(true);
    setTorchOn(false);

    scanner
      .start(
        { deviceId: { exact: activeCameraId } },
        {
          fps: 12,
          qrbox: (vw, vh) => {
            const edge = Math.floor(Math.min(vw, vh) * 0.72);
            return { width: edge, height: edge };
          },
          aspectRatio: undefined,
        },
        (decoded) => {
          if (cancelled) return;
          if (detectedLockRef.current) return;
          detectedLockRef.current = true;
          if (autoConfirm) {
            onResult(decoded);
            onClose();
          } else {
            setPendingResult(decoded);
            // try to vibrate for haptic feedback
            try {
              navigator.vibrate?.(60);
            } catch {
              /* noop */
            }
          }
        },
        () => {
          /* per-frame failures, ignore */
        },
      )
      .then(() => {
        if (cancelled) {
          scanner.stop().catch(() => {});
          return;
        }
        // Detect torch capability
        try {
          const track = scanner.getRunningTrackCameraCapabilities?.();
          const cap = (track as any)?.torchFeature?.();
          setTorchSupported(!!cap?.isSupported?.());
        } catch {
          setTorchSupported(false);
        }
      })
      .catch((e: any) => {
        if (cancelled) return;
        setError(e?.message ?? t.scanQR.cameraError);
      })
      .finally(() => {
        if (!cancelled) setStarting(false);
      });

    return () => {
      cancelled = true;
      const s = scannerRef.current;
      scannerRef.current = null;
      if (s) {
        try {
          if (s.isScanning) {
            s.stop()
              .then(() => s.clear())
              .catch(() => {});
          } else {
            s.clear();
          }
        } catch {
          /* noop */
        }
      }
    };
  }, [open, activeCameraId, pendingResult, autoConfirm, onResult, onClose, t.scanQR.cameraError]);

  const switchCamera = useCallback(() => {
    if (cameras.length < 2 || !activeCameraId) return;
    const idx = cameras.findIndex((c) => c.id === activeCameraId);
    const next = cameras[(idx + 1) % cameras.length];
    setActiveCameraId(next.id);
  }, [cameras, activeCameraId]);

  const toggleTorch = useCallback(async () => {
    const s = scannerRef.current;
    if (!s) return;
    try {
      const cap = s.getRunningTrackCameraCapabilities?.();
      const torch = (cap as any)?.torchFeature?.();
      if (torch?.isSupported?.()) {
        await torch.apply(!torchOn);
        setTorchOn(!torchOn);
      }
    } catch {
      setTorchSupported(false);
    }
  }, [torchOn]);

  const handleConfirm = () => {
    if (pendingResult == null) return;
    onResult(pendingResult);
    onClose();
  };

  const handleScanAgain = () => {
    setPendingResult(null);
    detectedLockRef.current = false;
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="
          p-0 gap-0 overflow-hidden border-0
          w-screen h-[100dvh] max-w-none rounded-none
          sm:w-[calc(100vw-1rem)] sm:max-w-md sm:h-auto sm:rounded-lg sm:border
          bg-black text-white
          flex flex-col
        "
      >
        <DialogTitle className="sr-only">
          {title ?? t.scanQR.title}
        </DialogTitle>
        <DialogDescription className="sr-only">
          {description ?? t.scanQR.description}
        </DialogDescription>

        {/* Header */}
        <div className="absolute top-0 inset-x-0 z-20 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
          <div className="flex items-center gap-2 pointer-events-auto">
            <Camera className="w-5 h-5" />
            <span className="text-sm font-medium">
              {title ?? t.scanQR.title}
            </span>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-white hover:bg-white/10 pointer-events-auto h-9 w-9"
            data-testid="button-scan-close"
            aria-label={t.common.close}
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Camera surface */}
        <div className="relative flex-1 sm:aspect-square sm:flex-none w-full bg-black overflow-hidden">
          <div
            ref={containerRef}
            className="
              absolute inset-0
              [&_video]:object-cover [&_video]:w-full [&_video]:h-full
              [&_#qr-shaded-region]:!hidden
              [&>img]:!hidden
            "
          />

          {/* Frame overlay */}
          {!error && !pendingResult && (
            <div className="absolute inset-0 pointer-events-none">
              {/* Dim mask using inset shadow square */}
              <div className="absolute inset-0 bg-black/45" />
              <div
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-2xl"
                style={{
                  width: "min(72vw, 72vh, 360px)",
                  height: "min(72vw, 72vh, 360px)",
                  boxShadow: "0 0 0 9999px rgba(0,0,0,0.45)",
                }}
              >
                {/* Corner brackets */}
                <span className="absolute -top-0.5 -left-0.5 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-2xl" />
                <span className="absolute -top-0.5 -right-0.5 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-2xl" />
                <span className="absolute -bottom-0.5 -left-0.5 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-2xl" />
                <span className="absolute -bottom-0.5 -right-0.5 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-2xl" />
                {/* Scanning line */}
                <span className="scan-line absolute left-2 right-2 h-[2px] bg-primary shadow-[0_0_10px_2px_rgba(255,255,255,0.45)] rounded-full" />
              </div>
              <p className="absolute left-0 right-0 bottom-28 sm:bottom-20 text-center text-xs sm:text-sm text-white/80 px-6">
                {description ?? t.scanQR.description}
              </p>
            </div>
          )}

          {(starting || error) && !pendingResult && (
            <div className="absolute inset-0 z-10 flex items-center justify-center text-white text-sm text-center px-6 bg-black/70">
              {error ? error : t.scanQR.starting}
            </div>
          )}

          {/* Confirmation overlay */}
          {pendingResult && (
            <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/85 px-6">
              <div className="w-full max-w-sm bg-background text-foreground rounded-xl p-5 space-y-4 shadow-xl">
                <div className="flex items-center gap-2 text-primary">
                  <Check className="w-5 h-5" />
                  <h3 className="font-semibold">{t.scanQR.confirmTitle}</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  {t.scanQR.confirmMessage}
                </p>
                <div className="rounded-md border bg-muted/40 p-3 text-sm font-mono break-all">
                  {pendingResult}
                </div>
                <div className="flex gap-2 pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={handleScanAgain}
                    data-testid="button-scan-again"
                  >
                    <RotateCcw className="w-4 h-4 mr-1.5" />
                    {t.scanQR.scanAgain}
                  </Button>
                  <Button
                    type="button"
                    className="flex-1"
                    onClick={handleConfirm}
                    data-testid="button-scan-confirm"
                  >
                    <Check className="w-4 h-4 mr-1.5" />
                    {t.scanQR.confirm}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom toolbar */}
        {!pendingResult && (
          <div className="absolute bottom-0 inset-x-0 z-20 px-6 pb-6 pt-10 bg-gradient-to-t from-black/80 to-transparent">
            <div className="flex items-center justify-center gap-4">
              {torchSupported && (
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  onClick={toggleTorch}
                  className={`h-12 w-12 rounded-full ${torchOn ? "bg-primary text-primary-foreground hover:bg-primary/90" : "bg-white/15 text-white hover:bg-white/25"} border-0`}
                  data-testid="button-scan-torch"
                  aria-label={torchOn ? t.scanQR.flashOff : t.scanQR.flashOn}
                  title={torchOn ? t.scanQR.flashOff : t.scanQR.flashOn}
                >
                  {torchOn ? <Zap className="w-5 h-5" /> : <ZapOff className="w-5 h-5" />}
                </Button>
              )}
              {cameras.length > 1 && (
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  onClick={switchCamera}
                  className="h-12 w-12 rounded-full bg-white/15 text-white hover:bg-white/25 border-0"
                  data-testid="button-scan-switch-camera"
                  aria-label={t.scanQR.switchCamera}
                  title={t.scanQR.switchCamera}
                >
                  <RefreshCw className="w-5 h-5" />
                </Button>
              )}
            </div>
          </div>
        )}

        <style>{`
          @keyframes scanLineMove {
            0% { top: 8%; opacity: 0.2; }
            50% { opacity: 1; }
            100% { top: 92%; opacity: 0.2; }
          }
          .scan-line {
            animation: scanLineMove 2.2s ease-in-out infinite;
          }
        `}</style>
      </DialogContent>
    </Dialog>
  );
}

export default ScanQR;
