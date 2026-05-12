/**
 * QRAccess — Generador y Escáner de QR para Acceso a la Plataforma
 * - Genera QR con la URL pública https://www.usme.blog
 * - Opción de QR con ruta específica (ej: /ordenes?search=XXX)
 * - Scanner con cámara del dispositivo
 * - Descarga de QR como imagen
 */
import { useState, useRef, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import QRCode from "qrcode";
import {
  QrCode,
  Download,
  Copy,
  Check,
  Camera,
  X,
  Link2,
  Smartphone,
  Globe,
  Share2,
  Sparkles,
  ScanLine,
} from "lucide-react";

const APP_URL = "https://www.usme.blog";

// Opciones rápidas de QR
const QR_PRESETS = [
  { label: "🏠 Página Principal", path: "/", desc: "Acceso directo al Dashboard" },
  { label: "📦 Inventario", path: "/inventario", desc: "Ver inventario completo" },
  { label: "🛒 Órdenes", path: "/ordenes", desc: "Órdenes de compra pendientes" },
  { label: "📊 Analytics", path: "/analytics", desc: "Panel de analítica" },
  { label: "🔍 Stock Cero + OC", path: "/stock-cero-oc", desc: "Referencias sin stock con OC" },
  { label: "📈 Consumo", path: "/consumo", desc: "Consumo mensual y tendencias" },
];

export default function QRAccess() {
  const [qrUrl, setQrUrl] = useState(APP_URL);
  const [customPath, setCustomPath] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [activePreset, setActivePreset] = useState(0);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scannerRef = useRef<any>(null);
  const videoRef = useRef<HTMLDivElement>(null);

  // Generar QR
  const generateQR = useCallback(async (url: string) => {
    try {
      const canvas = canvasRef.current;
      if (!canvas) return;

      await QRCode.toCanvas(canvas, url, {
        width: 320,
        margin: 2,
        color: {
          dark: "#281C19",
          light: "#FFFFFF",
        },
        errorCorrectionLevel: "H",
      });

      const dataUrl = canvas.toDataURL("image/png");
      setQrDataUrl(dataUrl);
    } catch (err) {
      console.error("Error generando QR:", err);
    }
  }, []);

  // Generar QR al montar y cuando cambia la URL
  useEffect(() => {
    generateQR(qrUrl);
  }, [qrUrl, generateQR]);

  // Seleccionar preset
  const handlePreset = (index: number) => {
    setActivePreset(index);
    const preset = QR_PRESETS[index];
    const fullUrl = `${APP_URL}${preset.path}`;
    setQrUrl(fullUrl);
    setCustomPath(preset.path === "/" ? "" : preset.path);
  };

  // URL personalizada
  const handleCustomPath = (path: string) => {
    setCustomPath(path);
    const cleanPath = path.startsWith("/") ? path : `/${path}`;
    setQrUrl(`${APP_URL}${path ? cleanPath : ""}`);
    setActivePreset(-1);
  };

  // Descargar QR como PNG
  const handleDownload = () => {
    if (!qrDataUrl) return;
    const link = document.createElement("a");
    link.download = `QR-SomosUsme-${Date.now()}.png`;
    link.href = qrDataUrl;
    link.click();
  };

  // Copiar URL
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(qrUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const ta = document.createElement("textarea");
      ta.value = qrUrl;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Compartir (Web Share API)
  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Somos Usme — Sistema JIT",
          text: "Accede al sistema de gestión de inventario",
          url: qrUrl,
        });
      } catch { /* cancelled */ }
    } else {
      handleCopy();
    }
  };

  // Scanner QR
  const startScanner = async () => {
    setScanning(true);
    setScanResult(null);

    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const scanner = new Html5Qrcode("qr-reader");
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          setScanResult(decodedText);
          scanner.stop().catch(() => {});
          setScanning(false);
        },
        () => { /* ignore scan errors */ }
      );
    } catch (err) {
      console.error("Error iniciando scanner:", err);
      setScanning(false);
    }
  };

  const stopScanner = () => {
    if (scannerRef.current) {
      scannerRef.current.stop().catch(() => {});
      scannerRef.current = null;
    }
    setScanning(false);
  };

  // Cleanup scanner on unmount
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, #8CB32A 0%, #009890 100%)",
              boxShadow: "0 4px 15px rgba(140,179,42,0.3)",
            }}
          >
            <QrCode className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1
              className="text-xl font-bold tracking-wider"
              style={{ fontFamily: "'Space Grotesk', sans-serif", color: "#281C19" }}
            >
              ACCESO QR
            </h1>
            <p className="text-xs text-muted-foreground" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Genera y escanea códigos QR para acceder a la plataforma
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Generador QR ── */}
        <Card className="cyber-card p-6 rounded-xl">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-4 w-4" style={{ color: "#8CB32A" }} />
            <h2
              className="text-sm font-bold tracking-wider"
              style={{ fontFamily: "'Space Grotesk', sans-serif", color: "#281C19" }}
            >
              GENERADOR DE QR
            </h2>
          </div>

          {/* Presets rápidos */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            {QR_PRESETS.map((preset, idx) => (
              <button
                key={idx}
                onClick={() => handlePreset(idx)}
                className={`filter-btn px-3 py-2 rounded-lg text-left transition-all ${
                  activePreset === idx ? "active-lime" : ""
                }`}
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                <span className="text-xs font-semibold block">{preset.label}</span>
                <span className="text-[10px] text-muted-foreground block mt-0.5">{preset.desc}</span>
              </button>
            ))}
          </div>

          {/* URL personalizada */}
          <div className="mb-4">
            <label
              className="text-xs font-semibold mb-1.5 block"
              style={{ fontFamily: "'Space Grotesk', sans-serif", color: "#281C19" }}
            >
              Ruta personalizada (opcional)
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="/ordenes?search=..."
                  value={customPath}
                  onChange={(e) => handleCustomPath(e.target.value)}
                  className="pl-9 text-xs"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                />
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              URL: <span className="font-mono" style={{ color: "#009890" }}>{qrUrl}</span>
            </p>
          </div>

          {/* QR Canvas */}
          <div className="flex flex-col items-center gap-4">
            <div
              className="p-4 rounded-2xl relative"
              style={{
                background: "#FFFFFF",
                border: "2px solid rgba(140,179,42,0.3)",
                boxShadow: "0 8px 32px rgba(140,179,42,0.1), 0 2px 8px rgba(0,0,0,0.05)",
              }}
            >
              <canvas ref={canvasRef} style={{ display: "block" }} />
              {/* Logo overlay en centro del QR */}
              <div
                className="absolute"
                style={{
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  width: "48px",
                  height: "48px",
                  borderRadius: "12px",
                  background: "linear-gradient(135deg, #8CB32A 0%, #009890 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 2px 10px rgba(0,0,0,0.2)",
                  border: "3px solid white",
                }}
              >
                <Globe className="h-5 w-5 text-white" />
              </div>
            </div>

            {/* Acciones */}
            <div className="flex flex-wrap gap-2 justify-center">
              <Button
                onClick={handleDownload}
                size="sm"
                className="gap-1.5 text-xs font-bold"
                style={{
                  background: "#8CB32A",
                  color: "#FFFFFF",
                  fontFamily: "'Space Grotesk', sans-serif",
                  boxShadow: "0 0 10px rgba(140,179,42,0.3)",
                }}
              >
                <Download className="h-3.5 w-3.5" />
                Descargar PNG
              </Button>
              <Button
                onClick={handleCopy}
                size="sm"
                variant="outline"
                className="gap-1.5 text-xs font-bold"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5" style={{ color: "#8CB32A" }} />
                    ¡Copiado!
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    Copiar URL
                  </>
                )}
              </Button>
              <Button
                onClick={handleShare}
                size="sm"
                variant="outline"
                className="gap-1.5 text-xs font-bold"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                <Share2 className="h-3.5 w-3.5" />
                Compartir
              </Button>
            </div>
          </div>

          {/* Instrucciones */}
          <div
            className="mt-4 p-3 rounded-lg text-xs"
            style={{
              background: "rgba(0,152,144,0.06)",
              border: "1px solid rgba(0,152,144,0.15)",
              fontFamily: "'Space Grotesk', sans-serif",
            }}
          >
            <p className="font-bold mb-1" style={{ color: "#009890" }}>📱 Instrucciones:</p>
            <ol className="list-decimal list-inside space-y-0.5 text-muted-foreground">
              <li>Descarga o muestra el QR en pantalla</li>
              <li>Los usuarios escanean con la cámara del celular</li>
              <li>Se abre automáticamente <strong>usme.blog</strong> en el navegador</li>
              <li>Acceso directo a la sección seleccionada</li>
            </ol>
          </div>
        </Card>

        {/* ── Escáner QR ── */}
        <Card className="cyber-card p-6 rounded-xl">
          <div className="flex items-center gap-2 mb-4">
            <ScanLine className="h-4 w-4" style={{ color: "#009890" }} />
            <h2
              className="text-sm font-bold tracking-wider"
              style={{ fontFamily: "'Space Grotesk', sans-serif", color: "#281C19" }}
            >
              ESCÁNER QR
            </h2>
          </div>

          <p className="text-xs text-muted-foreground mb-4" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            Usa la cámara de tu dispositivo para escanear un código QR y acceder directamente a la sección correspondiente.
          </p>

          {/* Scanner area */}
          <div
            className="rounded-xl overflow-hidden relative mb-4"
            style={{
              minHeight: "300px",
              background: "#1C1C1E",
              border: "2px solid rgba(0,152,144,0.3)",
            }}
          >
            {scanning ? (
              <>
                <div id="qr-reader" ref={videoRef} style={{ width: "100%" }} />
                <button
                  onClick={stopScanner}
                  className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center z-10"
                  style={{
                    background: "rgba(0,0,0,0.6)",
                    backdropFilter: "blur(8px)",
                    border: "1px solid rgba(255,255,255,0.2)",
                  }}
                >
                  <X className="h-4 w-4 text-white" />
                </button>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-[300px] gap-4">
                <div
                  className="w-20 h-20 rounded-2xl flex items-center justify-center"
                  style={{
                    background: "linear-gradient(135deg, rgba(0,152,144,0.2) 0%, rgba(140,179,42,0.2) 100%)",
                    border: "2px dashed rgba(0,152,144,0.4)",
                  }}
                >
                  <Camera className="h-8 w-8" style={{ color: "#009890" }} />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-white mb-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    Escáner de Cámara
                  </p>
                  <p className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>
                    Apunta la cámara al código QR
                  </p>
                </div>
                <Button
                  onClick={startScanner}
                  size="sm"
                  className="gap-2 font-bold"
                  style={{
                    background: "linear-gradient(135deg, #009890 0%, #8CB32A 100%)",
                    color: "#FFFFFF",
                    fontFamily: "'Space Grotesk', sans-serif",
                    boxShadow: "0 0 15px rgba(0,152,144,0.4)",
                  }}
                >
                  <Camera className="h-4 w-4" />
                  Iniciar Escáner
                </Button>
              </div>
            )}
          </div>

          {/* Resultado del scan */}
          {scanResult && (
            <div
              className="p-4 rounded-xl"
              style={{
                background: "rgba(140,179,42,0.08)",
                border: "1px solid rgba(140,179,42,0.3)",
                boxShadow: "0 0 10px rgba(140,179,42,0.1)",
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <Check className="h-4 w-4" style={{ color: "#8CB32A" }} />
                <span
                  className="text-sm font-bold"
                  style={{ fontFamily: "'Space Grotesk', sans-serif", color: "#8CB32A" }}
                >
                  ¡QR Escaneado!
                </span>
              </div>
              <p
                className="text-xs font-mono break-all mb-3"
                style={{ color: "#009890" }}
              >
                {scanResult}
              </p>
              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    if (scanResult.startsWith("http")) {
                      window.open(scanResult, "_blank");
                    }
                  }}
                  size="sm"
                  className="gap-1.5 text-xs font-bold"
                  style={{
                    background: "#8CB32A",
                    color: "#FFFFFF",
                    fontFamily: "'Space Grotesk', sans-serif",
                  }}
                >
                  <Globe className="h-3.5 w-3.5" />
                  Abrir enlace
                </Button>
                <Button
                  onClick={() => {
                    setScanResult(null);
                    startScanner();
                  }}
                  size="sm"
                  variant="outline"
                  className="gap-1.5 text-xs font-bold"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  <ScanLine className="h-3.5 w-3.5" />
                  Escanear otro
                </Button>
              </div>
            </div>
          )}

          {/* Info card */}
          <div
            className="mt-4 p-3 rounded-lg text-xs"
            style={{
              background: "rgba(140,179,42,0.06)",
              border: "1px solid rgba(140,179,42,0.15)",
              fontFamily: "'Space Grotesk', sans-serif",
            }}
          >
            <p className="font-bold mb-1" style={{ color: "#8CB32A" }}>
              <Smartphone className="h-3 w-3 inline mr-1" />
              Compatible con:
            </p>
            <ul className="space-y-0.5 text-muted-foreground">
              <li>• iPhone (Safari) — Cámara nativa del teléfono</li>
              <li>• Android (Chrome) — Cámara nativa o Google Lens</li>
              <li>• Desktop — Webcam del computador</li>
            </ul>
          </div>
        </Card>
      </div>
    </div>
  );
}
