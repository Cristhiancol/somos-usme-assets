import { getLoginUrl } from "@/const";
import { Bus, ShieldAlert, ArrowRight } from "lucide-react";
import { useEffect, useRef, useMemo } from "react";

// ── Mensajes de error OAuth ──────────────────────────────────────────
const AUTH_ERROR_MESSAGES: Record<string, string> = {
  NoAutorizado: "Tu correo no tiene acceso al sistema. Contacta al administrador para solicitar autorización.",
  UsuarioInactivo: "Tu cuenta está desactivada. Contacta al administrador para reactivarla.",
  ErrorServidor: "Error del servidor al verificar tu acceso. Intenta de nuevo en un momento.",
  SinEmail: "No se pudo obtener tu correo electrónico. Intenta con otra cuenta.",
};

// ── Dot Grid Canvas — efecto holograma con ondas ──────────────────────
function HologramDotGrid() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = 0;
    let height = 0;

    function resize() {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas!.width = width;
      canvas!.height = height;
    }
    resize();
    window.addEventListener("resize", resize);

    const DOT_SPACING = 28;
    const DOT_BASE_RADIUS = 1.2;
    const DOT_MAX_RADIUS = 3.0;

    // Colores corporativos
    const COLORS = [
      { r: 140, g: 179, b: 42 },   // #8CB32A verde lima
      { r: 0, g: 152, b: 144 },     // #009890 teal
      { r: 140, g: 179, b: 42 },   // #8CB32A repetido para mayor presencia
    ];

    function draw(time: number) {
      ctx!.clearRect(0, 0, width, height);
      const t = time * 0.001;

      const cols = Math.ceil(width / DOT_SPACING) + 1;
      const rows = Math.ceil(height / DOT_SPACING) + 1;

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const x = col * DOT_SPACING;
          const y = row * DOT_SPACING;

          // Distancia al centro
          const cx = width / 2;
          const cy = height * 0.38;
          const dx = x - cx;
          const dy = y - cy;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const maxDist = Math.sqrt(cx * cx + cy * cy);

          // Ondas concéntricas desde el centro
          const wave1 = Math.sin(dist * 0.012 - t * 1.8) * 0.5 + 0.5;
          const wave2 = Math.sin(dist * 0.008 - t * 1.2 + 1.5) * 0.5 + 0.5;
          const wave3 = Math.sin(x * 0.015 + y * 0.01 - t * 0.7) * 0.5 + 0.5;

          const combined = (wave1 * 0.5 + wave2 * 0.3 + wave3 * 0.2);

          // Fade hacia los bordes
          const edgeFade = 1 - Math.pow(dist / maxDist, 1.5);
          const intensity = combined * Math.max(0, edgeFade);

          // Seleccionar color basado en la onda
          const colorIdx = Math.floor(wave3 * COLORS.length) % COLORS.length;
          const color = COLORS[colorIdx];

          const radius = DOT_BASE_RADIUS + (DOT_MAX_RADIUS - DOT_BASE_RADIUS) * intensity;
          const alpha = 0.08 + intensity * 0.55;

          ctx!.beginPath();
          ctx!.arc(x, y, radius, 0, Math.PI * 2);
          ctx!.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha})`;
          ctx!.fill();
        }
      }

      animRef.current = requestAnimationFrame(draw);
    }

    animRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
      }}
    />
  );
}

// ── LoginScreen Principal ──────────────────────────────────────────────
export default function LoginScreen() {
  const authError = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    const errorKey = params.get("error");
    if (errorKey && AUTH_ERROR_MESSAGES[errorKey]) {
      window.history.replaceState({}, "", window.location.pathname);
      return AUTH_ERROR_MESSAGES[errorKey];
    }
    return null;
  }, []);

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden"
      style={{ background: "#0A0A0A" }}
    >
      {/* Dot Grid Animado */}
      <HologramDotGrid />

      {/* Contenido Central */}
      <div
        className="relative z-10 flex flex-col items-center gap-6 px-6 w-full max-w-md"
        style={{ animation: "loginFadeIn 0.8s ease-out" }}
      >
        {/* Logo con glow */}
        <div
          className="relative flex items-center justify-center"
          style={{ animation: "loginLogoFloat 4s ease-in-out infinite" }}
        >
          {/* Glow ring */}
          <div
            style={{
              position: "absolute",
              width: 120,
              height: 120,
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(140,179,42,0.25) 0%, rgba(140,179,42,0) 70%)",
              animation: "loginGlowPulse 3s ease-in-out infinite",
            }}
          />
          {/* Icon container */}
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: "50%",
              background: "rgba(140,179,42,0.08)",
              border: "1px solid rgba(140,179,42,0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backdropFilter: "blur(8px)",
            }}
          >
            <Bus
              style={{
                width: 40,
                height: 40,
                color: "#8CB32A",
                filter: "drop-shadow(0 0 12px rgba(140,179,42,0.6))",
              }}
            />
          </div>
          {/* Supply chain icon accent — reemplaza Zap que se distorsionaba */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#009890"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              position: "absolute",
              top: -4,
              right: -8,
              filter: "drop-shadow(0 0 8px rgba(0,152,144,0.6))",
              animation: "loginZapBlink 2s ease-in-out infinite",
            }}
            aria-hidden="true"
          >
            <circle cx="12" cy="4.5" r="2.5" />
            <path d="M12 7v3" />
            <circle cx="5" cy="19.5" r="2.5" />
            <path d="M5 17v-3.5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2V17" />
            <circle cx="19" cy="19.5" r="2.5" />
          </svg>
        </div>

        {/* Título */}
        <div className="flex flex-col items-center gap-2 text-center">
          <h1
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: "2rem",
              fontWeight: 700,
              color: "#f5f5f5",
              letterSpacing: "0.08em",
              lineHeight: 1.2,
              textShadow: "0 0 30px rgba(140,179,42,0.3)",
            }}
          >
            Bienvenido a
            <br />
            <span style={{ color: "#8CB32A" }}>SOMOS USME</span>
          </h1>
          <p
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: "0.85rem",
              color: "rgba(245,245,245,0.5)",
              letterSpacing: "0.15em",
              textTransform: "uppercase",
            }}
          >
            Sistema JIT — Control de Inventario
          </p>
          <div
            style={{
              width: 60,
              height: 2,
              background: "linear-gradient(90deg, transparent, #8CB32A, transparent)",
              marginTop: 4,
              borderRadius: 1,
            }}
          />
          <p
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: "0.75rem",
              color: "#009890",
              letterSpacing: "0.1em",
            }}
          >
            Gestión de Flota 260 Buses
          </p>
        </div>

        {/* Error OAuth */}
        {authError && (
          <div
            style={{
              width: "100%",
              display: "flex",
              alignItems: "flex-start",
              gap: 12,
              borderRadius: 12,
              padding: "12px 16px",
              background: "rgba(239,68,68,0.1)",
              border: "1px solid rgba(239,68,68,0.3)",
              color: "#f87171",
              fontSize: "0.85rem",
              animation: "loginFadeIn 0.4s ease-out",
            }}
          >
            <ShieldAlert style={{ width: 20, height: 20, flexShrink: 0, marginTop: 2 }} />
            <span>{authError}</span>
          </div>
        )}

        {/* Botón Iniciar Sesión */}
        <button
          onClick={() => { window.location.href = getLoginUrl(); }}
          className="group"
          style={{
            width: "100%",
            height: 52,
            borderRadius: 14,
            fontFamily: "'Space Grotesk', sans-serif",
            fontWeight: 700,
            fontSize: "0.95rem",
            letterSpacing: "0.12em",
            color: "#ffffff",
            background: "linear-gradient(135deg, #281C19 0%, #1a1210 100%)",
            border: "1px solid rgba(140,179,42,0.4)",
            boxShadow: "0 0 20px rgba(140,179,42,0.15), 0 4px 20px rgba(0,0,0,0.3)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            transition: "all 0.3s ease",
            position: "relative",
            overflow: "hidden",
          }}
          onMouseEnter={(e) => {
            const btn = e.currentTarget;
            btn.style.boxShadow = "0 0 40px rgba(140,179,42,0.35), 0 4px 30px rgba(0,0,0,0.4)";
            btn.style.borderColor = "rgba(140,179,42,0.7)";
            btn.style.transform = "translateY(-1px)";
          }}
          onMouseLeave={(e) => {
            const btn = e.currentTarget;
            btn.style.boxShadow = "0 0 20px rgba(140,179,42,0.15), 0 4px 20px rgba(0,0,0,0.3)";
            btn.style.borderColor = "rgba(140,179,42,0.4)";
            btn.style.transform = "translateY(0)";
          }}
        >
          INICIAR SESIÓN
          <ArrowRight style={{ width: 18, height: 18, opacity: 0.7 }} />
        </button>

        {/* Footer */}
        <p
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: "0.65rem",
            color: "rgba(245,245,245,0.2)",
            letterSpacing: "0.1em",
            textAlign: "center",
            marginTop: 8,
          }}
        >
          Somos Bogotá Usme — Abastecimiento Inteligente
        </p>
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes loginFadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes loginLogoFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        @keyframes loginGlowPulse {
          0%, 100% { transform: scale(1); opacity: 0.6; }
          50% { transform: scale(1.15); opacity: 1; }
        }
        @keyframes loginZapBlink {
          0%, 100% { opacity: 0.4; transform: scale(0.9); }
          50% { opacity: 1; transform: scale(1.1); }
        }
      `}</style>
    </div>
  );
}
