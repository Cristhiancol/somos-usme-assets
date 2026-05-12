/**
 * StockChatbot v3.0 — Asistente Virtual JIT de Somos Bogotá Usme
 * React Portal → document.body (fuera de cualquier overflow/transform)
 * position: fixed + z-index: 9999 + isolation: isolate
 * Fuzzy search, datos completos, drawer móvil, localStorage persistente.
 */
import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { trpc } from "@/lib/trpc";
import { Send, X, Minus, Trash2, Sparkles } from "lucide-react";
import { MarkdownRenderer } from "./MarkdownRenderer";

// ── Avatar URL (CDN) ──────────────────────────────────────────────────────────
const STOCK_AVATAR = "/manus-storage/stock-avatar_70dc4e00.webp";

// ── Colores v2.0 ─────────────────────────────────────────────────────────────
const COLORS = {
  accent: "#22C55E",       // verde corbata del avatar
  headerBg: "#1C1C1E",    // header oscuro
  chatBg: "#F9FAFB",      // fondo mensajes
  userBubble: "#22C55E",   // burbuja usuario
  stockBubble: "#FFFFFF",  // burbuja Stock
  stockBorder: "#E5E7EB",  // borde burbuja Stock
  timestamp: "#9CA3AF",    // color timestamp
  inputBorder: "#E5E7EB",  // borde input
} as const;

// ── Tipos ─────────────────────────────────────────────────────────────────────
interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

// ── SessionStorage → localStorage helpers (persistencia entre sesiones) ───
const STORAGE_KEY = "stock-chatbot-messages-v3";

function loadMessages(): ChatMessage[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveMessages(msgs: ChatMessage[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(msgs.slice(-80)));
  } catch { /* quota exceeded — ignore */ }
}

// ── Utilidades ────────────────────────────────────────────────────────────────
function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString("es-CO", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

// ── Componente de burbuja de mensaje ─────────────────────────────────────────
function MessageBubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === "user";
  return (
    <div className={`flex gap-2 mb-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      {!isUser && (
        <img
          src={STOCK_AVATAR}
          alt="Stock"
          className="w-7 h-7 rounded-full object-cover flex-shrink-0 mt-1"
          style={{ border: `1.5px solid ${COLORS.accent}40` }}
        />
      )}
      <div className={`flex flex-col max-w-[80%] ${isUser ? "items-end" : "items-start"}`}>
        <div
          className={`px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap break-words ${
            isUser
              ? "rounded-2xl rounded-tr-sm text-white"
              : "rounded-2xl rounded-tl-sm"
          }`}
          style={{
            background: isUser ? COLORS.userBubble : COLORS.stockBubble,
            color: isUser ? "#FFFFFF" : "#1C1C1E",
            border: isUser ? "none" : `1px solid ${COLORS.stockBorder}`,
            fontFamily: "'Space Grotesk', sans-serif",
          }}
        >
          {isUser ? (
            msg.content
          ) : (
            <MarkdownRenderer content={msg.content} className="chatbot-markdown" />
          )}
        </div>
        <span className="text-[10px] mt-0.5 px-1" style={{ color: COLORS.timestamp }}>
          {formatTime(msg.timestamp)}
        </span>
      </div>
    </div>
  );
}

// ── Typing indicator ──────────────────────────────────────────────────────────
function TypingIndicator() {
  return (
    <div className="flex gap-2 mb-3">
      <img
        src={STOCK_AVATAR}
        alt="Stock"
        className="w-7 h-7 rounded-full object-cover flex-shrink-0 mt-1"
        style={{ border: `1.5px solid ${COLORS.accent}40` }}
      />
      <div
        className="px-3 py-2 rounded-2xl rounded-tl-sm"
        style={{ background: COLORS.stockBubble, border: `1px solid ${COLORS.stockBorder}` }}
      >
        <div className="flex gap-1.5 items-center h-5">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-2 h-2 rounded-full bg-gray-400"
              style={{
                animation: `stockBounce 1.4s ease-in-out ${i * 0.16}s infinite`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Componente principal (renderizado via Portal) ────────────────────────────
function ChatbotUI() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(() => loadMessages());
  const [input, setInput] = useState("");
  const [welcomeLoaded, setWelcomeLoaded] = useState(() => loadMessages().length > 0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Cargar mensaje de bienvenida
  const welcomeQuery = trpc.chatbot.welcome.useQuery(undefined, {
    enabled: isOpen && !welcomeLoaded,
    staleTime: Infinity,
  });

  // Mutation para enviar mensajes
  const sendMutation = trpc.chatbot.sendMessage.useMutation();

  // Agregar bienvenida cuando carga
  useEffect(() => {
    if (welcomeQuery.data && !welcomeLoaded) {
      const welcomeMsg: ChatMessage = {
        role: "assistant",
        content: welcomeQuery.data.content,
        timestamp: welcomeQuery.data.timestamp,
      };
      setMessages([welcomeMsg]);
      saveMessages([welcomeMsg]);
      setWelcomeLoaded(true);
    }
  }, [welcomeQuery.data, welcomeLoaded]);

  // Persistir mensajes en sessionStorage
  useEffect(() => {
    if (messages.length > 0) {
      saveMessages(messages);
    }
  }, [messages]);

  // Auto-scroll al último mensaje
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, sendMutation.isPending, isOpen]);

  // Focus en input al abrir
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || sendMutation.isPending) return;

    const userMsg: ChatMessage = {
      role: "user",
      content: text,
      timestamp: Date.now(),
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");

    // Reset textarea height
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
    }

    try {
      const response = await sendMutation.mutateAsync({
        messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
      });
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: response.content, timestamp: response.timestamp },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "🔴 Tuve un problema conectándome. Intenta de nuevo en unos segundos.",
          timestamp: Date.now(),
        },
      ]);
    }
  }, [input, messages, sendMutation]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClearChat = () => {
    setMessages([]);
    setWelcomeLoaded(false);
    localStorage.removeItem(STORAGE_KEY);
  };

  const handleQuickReply = (text: string) => {
    setInput(text);
    setTimeout(() => {
      inputRef.current?.focus();
      // Auto-send
      const userMsg: ChatMessage = { role: "user", content: text, timestamp: Date.now() };
      const newMessages = [...messages, userMsg];
      setMessages(newMessages);
      sendMutation.mutateAsync({
        messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
      }).then((response) => {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: response.content, timestamp: response.timestamp },
        ]);
      }).catch(() => {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "🔴 Error de conexión. Intenta de nuevo.", timestamp: Date.now() },
        ]);
      });
      setInput("");
    }, 50);
  };

  return (
    <>
      {/* ── Burbuja flotante ── */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="group"
          style={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            zIndex: 9999,
            width: "60px",
            height: "60px",
            borderRadius: "50%",
            overflow: "visible",
            border: "none",
            padding: 0,
            cursor: "pointer",
            background: "transparent",
          }}
          aria-label="Abrir asistente Stock"
          title="Hablar con Stock — Asistente JIT"
        >
          <div
            className="w-full h-full rounded-full overflow-hidden transition-transform duration-200 group-hover:scale-110"
            style={{
              boxShadow: `0 4px 20px rgba(34,197,94,0.3)`,
              border: `2.5px solid ${COLORS.accent}`,
            }}
          >
            <img
              src={STOCK_AVATAR}
              alt="Stock"
              className="w-full h-full object-cover"
            />
          </div>
          {/* Indicador online pulsante */}
          <span
            className="absolute"
            style={{
              bottom: "2px",
              right: "2px",
              width: "14px",
              height: "14px",
              borderRadius: "50%",
              background: COLORS.accent,
              border: "2.5px solid white",
              animation: "stockPulse 2s ease-in-out infinite",
            }}
          />
        </button>
      )}

      {/* ── Ventana de chat ── */}
      {isOpen && (
        <div
          className="stock-chat-window"
          style={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            zIndex: 9999,
            width: "380px",
            maxWidth: "calc(100vw - 16px)",
            animation: "stockSlideUp 0.15s ease-out forwards",
          }}
        >
          <div
            style={{
              borderRadius: "16px",
              overflow: "hidden",
              boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
              display: "flex",
              flexDirection: "column",
              height: "600px",
              maxHeight: "calc(100vh - 48px)",
              background: COLORS.chatBg,
            }}
          >
            {/* ── Header ── */}
            <div
              className="flex items-center gap-3 px-4 py-3 flex-shrink-0"
              style={{
                background: 'linear-gradient(135deg, #1C1C1E 0%, #281C19 100%)',
                borderBottom: '2px solid rgba(34,197,94,0.3)',
              }}
            >
              <div className="relative flex-shrink-0">
                <img
                  src={STOCK_AVATAR}
                  alt="Stock"
                  className="w-10 h-10 rounded-full object-cover"
                  style={{ border: `2px solid ${COLORS.accent}` }}
                />
                <span
                  className="absolute"
                  style={{
                    bottom: "0",
                    right: "0",
                    width: "10px",
                    height: "10px",
                    borderRadius: "50%",
                    background: COLORS.accent,
                    border: `2px solid ${COLORS.headerBg}`,
                  }}
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-bold text-sm leading-none">Stock</p>
                <div className="flex items-center gap-1.5 mt-1">
                  <p style={{ color: COLORS.accent }} className="text-xs">
                    Asistente Virtual JIT
                  </p>
                  <span
                    style={{
                      width: "6px",
                      height: "6px",
                      borderRadius: "50%",
                      background: COLORS.accent,
                      display: "inline-block",
                    }}
                  />
                </div>
              </div>
              <div className="flex gap-0.5">
                <button
                  onClick={handleClearChat}
                  className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-white/10 text-white/50 hover:text-white transition-colors"
                  aria-label="Limpiar conversación"
                  title="Limpiar conversación"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-white/10 text-white/50 hover:text-white transition-colors"
                  aria-label="Minimizar"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-white/10 text-white/50 hover:text-white transition-colors"
                  aria-label="Cerrar"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* ── Área de mensajes ── */}
            <div
              className="flex-1 overflow-y-auto px-4 py-3"
              style={{
                background: COLORS.chatBg,
                scrollbarWidth: "thin",
                scrollbarColor: `${COLORS.stockBorder} transparent`,
              }}
            >
              {/* Estado de carga del welcome */}
              {welcomeQuery.isLoading && messages.length === 0 && <TypingIndicator />}

              {/* Mensajes */}
              {messages.map((msg, i) => (
                <MessageBubble key={`${i}-${msg.timestamp}`} msg={msg} />
              ))}

              {/* Typing indicator mientras Gemini procesa */}
              {sendMutation.isPending && <TypingIndicator />}

              <div ref={messagesEndRef} />
            </div>

            {/* ── Sugerencias rápidas (solo al inicio) ── */}
            {messages.length <= 1 && !sendMutation.isPending && (
              <div className="px-3 pb-2 flex flex-wrap gap-1.5 flex-shrink-0" style={{ background: COLORS.chatBg }}>
                {[
                  "📦 ¿Cuántas refs en stock cero?",
                  "🚨 Órdenes críticas pendientes",
                  "💰 Top 20 mayor valor",
                  "🛒 ¿Qué necesito comprar?",
                  "📈 Tendencias de consumo",
                  "🔧 Servicios pendientes",
                  "📊 Valor total inventario",
                  "📅 Órdenes con más retraso",
                  "🏭 Proveedores principales",
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => handleQuickReply(suggestion)}
                    disabled={sendMutation.isPending}
                    className="text-xs px-2.5 py-1.5 rounded-full transition-colors disabled:opacity-50"
                    style={{
                      border: `1px solid ${COLORS.accent}40`,
                      color: COLORS.accent,
                      background: "transparent",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = `${COLORS.accent}10`;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "transparent";
                    }}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}

            {/* ── Input area ── */}
            <div
              className="flex items-end gap-2 px-3 py-3 flex-shrink-0"
              style={{ background: "#FFFFFF", borderTop: `1px solid ${COLORS.stockBorder}` }}
            >
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Escribe tu consulta..."
                rows={1}
                disabled={sendMutation.isPending}
                className="flex-1 resize-none rounded-xl px-3 py-2 text-sm placeholder-gray-400 focus:outline-none disabled:opacity-50 transition-colors"
                style={{
                  maxHeight: "80px",
                  fontFamily: "'Space Grotesk', sans-serif",
                  lineHeight: "1.4",
                  border: `1px solid ${COLORS.inputBorder}`,
                  color: "#1C1C1E",
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = COLORS.accent;
                  e.currentTarget.style.boxShadow = `0 0 0 2px ${COLORS.accent}20`;
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = COLORS.inputBorder;
                  e.currentTarget.style.boxShadow = "none";
                }}
                onInput={(e) => {
                  const el = e.currentTarget;
                  el.style.height = "auto";
                  el.style.height = Math.min(el.scrollHeight, 80) + "px";
                }}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || sendMutation.isPending}
                className="w-9 h-9 flex-shrink-0 rounded-full flex items-center justify-center transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  background: input.trim() && !sendMutation.isPending ? COLORS.accent : "#E5E7EB",
                }}
                aria-label="Enviar mensaje"
              >
                <Send className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ── Componente exportado: React Portal en document.body ──────────────────────
export function StockChatbot() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return createPortal(
    <>
      {/* CSS global para animaciones del chatbot */}
      <style>{`
        @keyframes stockBounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-6px); }
        }
        @keyframes stockSlideUp {
          from { opacity: 0; transform: translateY(16px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes stockPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.2); }
        }
        /* Móvil: drawer pantalla completa */
        @media (max-width: 639px) {
          .stock-chat-window {
            bottom: 0 !important;
            right: 0 !important;
            left: 0 !important;
            width: 100vw !important;
            max-width: 100vw !important;
          }
          .stock-chat-window > div {
            border-radius: 0 !important;
            height: 100vh !important;
            max-height: 100vh !important;
            height: 100dvh !important;
            max-height: 100dvh !important;
          }
        }
      `}</style>
      <div style={{ position: "fixed", zIndex: 9999, isolation: "isolate", inset: 0, pointerEvents: "none" }}>
        <div style={{ pointerEvents: "auto" }}>
          <ChatbotUI />
        </div>
      </div>
    </>,
    document.body
  );
}
