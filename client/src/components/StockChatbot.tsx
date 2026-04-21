/**
 * StockChatbot — Asistente Virtual JIT de Somos Bogotá Usme
 * Burbuja flotante en esquina inferior derecha, ventana expandible con Gemini AI.
 * Avatar: perrito pinscher en traje corporativo con corbata verde.
 */
import { useState, useRef, useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { Send, X, Minus, MessageCircle } from "lucide-react";

// ── Avatar URL (CDN) ──────────────────────────────────────────────────────────
const STOCK_AVATAR = "/manus-storage/stock-avatar_70dc4e00.webp";

// ── Tipos ─────────────────────────────────────────────────────────────────────
interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
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
    <div
      className={`flex gap-2 mb-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}
    >
      {/* Avatar */}
      {!isUser && (
        <img
          src={STOCK_AVATAR}
          alt="Stock"
          className="w-7 h-7 rounded-full object-cover flex-shrink-0 mt-1 border border-[#8CB32A]/40"
        />
      )}

      <div className={`flex flex-col max-w-[78%] ${isUser ? "items-end" : "items-start"}`}>
        <div
          className={`px-3 py-2 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words ${
            isUser
              ? "bg-[#009890] text-white rounded-tr-sm"
              : "bg-[#f5f5f5] text-[#281C19] rounded-tl-sm border border-[#e0e0e0]"
          }`}
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          {/* Renderizar markdown básico: **bold** */}
          {msg.content.split(/(\*\*[^*]+\*\*)/).map((part, i) =>
            part.startsWith("**") && part.endsWith("**") ? (
              <strong key={i}>{part.slice(2, -2)}</strong>
            ) : (
              <span key={i}>{part}</span>
            )
          )}
        </div>
        <span className="text-[10px] text-gray-400 mt-0.5 px-1">
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
        className="w-7 h-7 rounded-full object-cover flex-shrink-0 mt-1 border border-[#8CB32A]/40"
      />
      <div className="bg-[#f5f5f5] border border-[#e0e0e0] px-3 py-2 rounded-2xl rounded-tl-sm">
        <div className="flex gap-1 items-center h-4">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-[#009890]"
              style={{
                animation: `stockTyping 1.2s ease-in-out ${i * 0.2}s infinite`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────
export function StockChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [welcomeLoaded, setWelcomeLoaded] = useState(false);
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
      setMessages([{
        role: "assistant",
        content: welcomeQuery.data.content,
        timestamp: welcomeQuery.data.timestamp,
      }]);
      setWelcomeLoaded(true);
    }
  }, [welcomeQuery.data, welcomeLoaded]);

  // Auto-scroll al último mensaje
  useEffect(() => {
    if (isOpen && !isMinimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, sendMutation.isPending, isOpen, isMinimized]);

  // Focus en input al abrir
  useEffect(() => {
    if (isOpen && !isMinimized) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, isMinimized]);

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
          content: "Lo siento, tuve un problema al procesar tu consulta. Por favor intenta de nuevo.",
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

  const handleOpen = () => {
    setIsOpen(true);
    setIsMinimized(false);
  };

  const handleClose = () => {
    setIsOpen(false);
    setIsMinimized(false);
  };

  const handleMinimize = () => {
    setIsMinimized(true);
  };

  const handleMaximize = () => {
    setIsMinimized(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  return (
    <>
      {/* CSS para animaciones */}
      <style>{`
        @keyframes stockTyping {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30% { transform: translateY(-4px); opacity: 1; }
        }
        @keyframes stockFadeIn {
          from { opacity: 0; transform: translateY(12px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes stockBubblePulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(0, 152, 144, 0.4); }
          50% { box-shadow: 0 0 0 8px rgba(0, 152, 144, 0); }
        }
        .stock-window-enter {
          animation: stockFadeIn 0.25s ease-out forwards;
        }
        .stock-bubble-pulse {
          animation: stockBubblePulse 2.5s ease-in-out infinite;
        }
      `}</style>

      {/* ── Burbuja flotante ── */}
      {!isOpen && (
        <button
          onClick={handleOpen}
          className="stock-bubble-pulse fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full overflow-hidden border-2 border-[#8CB32A] shadow-lg hover:scale-110 transition-transform duration-200 focus:outline-none focus:ring-2 focus:ring-[#009890]"
          aria-label="Abrir asistente Stock"
          title="Hablar con Stock — Asistente JIT"
        >
          <img
            src={STOCK_AVATAR}
            alt="Stock"
            className="w-full h-full object-cover"
          />
          {/* Indicador online */}
          <span className="absolute bottom-0.5 right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
        </button>
      )}

      {/* ── Ventana de chat ── */}
      {isOpen && (
        <div
          className={`stock-window-enter fixed z-50 ${
            isMinimized
              ? "bottom-6 right-6 w-64"
              : "bottom-6 right-6 w-[360px] max-w-[calc(100vw-24px)]"
          }`}
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          <div
            className="rounded-2xl overflow-hidden shadow-2xl border border-[#e0e0e0]"
            style={{ background: "#ffffff" }}
          >
            {/* ── Header ── */}
            <div
              className="flex items-center gap-3 px-4 py-3 cursor-pointer"
              style={{ background: "#281C19" }}
              onClick={isMinimized ? handleMaximize : undefined}
            >
              <div className="relative flex-shrink-0">
                <img
                  src={STOCK_AVATAR}
                  alt="Stock"
                  className="w-9 h-9 rounded-full object-cover border-2 border-[#8CB32A]"
                />
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-400 rounded-full border-2 border-[#281C19]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold text-sm leading-none">Stock</p>
                <p className="text-[#8CB32A] text-xs mt-0.5">Asistente Virtual JIT</p>
              </div>
              <div className="flex gap-1">
                {!isMinimized && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleMinimize(); }}
                    className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-white/10 text-white/70 hover:text-white transition-colors"
                    aria-label="Minimizar"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); handleClose(); }}
                  className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-white/10 text-white/70 hover:text-white transition-colors"
                  aria-label="Cerrar"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* ── Área de mensajes (oculta si minimizado) ── */}
            {!isMinimized && (
              <>
                <div
                  className="overflow-y-auto px-4 py-3"
                  style={{
                    height: "340px",
                    background: "#fafafa",
                    scrollbarWidth: "thin",
                    scrollbarColor: "#e0e0e0 transparent",
                  }}
                >
                  {/* Estado de carga del welcome */}
                  {welcomeQuery.isLoading && messages.length === 0 && (
                    <TypingIndicator />
                  )}

                  {/* Mensajes */}
                  {messages.map((msg, i) => (
                    <MessageBubble key={i} msg={msg} />
                  ))}

                  {/* Typing indicator mientras Gemini procesa */}
                  {sendMutation.isPending && <TypingIndicator />}

                  <div ref={messagesEndRef} />
                </div>

                {/* ── Sugerencias rápidas (solo al inicio) ── */}
                {messages.length <= 1 && !sendMutation.isPending && (
                  <div className="px-3 pb-2 flex flex-wrap gap-1.5">
                    {[
                      "¿Cuántas refs en stock cero?",
                      "Órdenes críticas",
                      "Valor del inventario",
                    ].map((suggestion) => (
                      <button
                        key={suggestion}
                        onClick={() => {
                          setInput(suggestion);
                          setTimeout(() => inputRef.current?.focus(), 50);
                        }}
                        className="text-xs px-2.5 py-1 rounded-full border border-[#009890]/40 text-[#009890] hover:bg-[#009890]/10 transition-colors"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                )}

                {/* ── Input area ── */}
                <div
                  className="flex items-end gap-2 px-3 py-3 border-t border-[#e8e8e8]"
                  style={{ background: "#ffffff" }}
                >
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Escribe tu consulta..."
                    rows={1}
                    disabled={sendMutation.isPending}
                    className="flex-1 resize-none rounded-xl border border-[#e0e0e0] px-3 py-2 text-sm text-[#281C19] placeholder-gray-400 focus:outline-none focus:border-[#009890] focus:ring-1 focus:ring-[#009890]/30 disabled:opacity-50 transition-colors"
                    style={{
                      maxHeight: "80px",
                      fontFamily: "'Space Grotesk', sans-serif",
                      lineHeight: "1.4",
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
                      background: input.trim() && !sendMutation.isPending ? "#009890" : "#e0e0e0",
                    }}
                    aria-label="Enviar mensaje"
                  >
                    <Send className="w-4 h-4 text-white" />
                  </button>
                </div>
              </>
            )}

            {/* ── Minimizado: solo mostrar icono de expandir ── */}
            {isMinimized && (
              <button
                onClick={handleMaximize}
                className="w-full flex items-center justify-center gap-2 py-2 text-xs text-[#009890] hover:bg-[#009890]/5 transition-colors"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>Expandir chat</span>
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
