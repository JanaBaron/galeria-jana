import { useState, useEffect, useCallback, useRef } from "react";

// ─── MOCK DATA ─────────────────────────────────────────────────────────────────
const PHOTOGRAPHER = { email: "jana@janabaron.com", password: "jana2024", name: "Jana Baron" };

const MOCK_PHOTOS = Array.from({ length: 18 }, (_, i) => ({
  id: `photo_${i + 1}`,
  url: `https://picsum.photos/seed/jana${i + 1}/800/1200`,
  thumb: `https://picsum.photos/seed/jana${i + 1}/400/600`,
}));

// ─── WATERMARK CANVAS ──────────────────────────────────────────────────────────
function WatermarkedImage({ src, alt, className, style, onClick }) {
  const canvasRef = useRef(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      // Grid watermark
      ctx.save();
      ctx.globalAlpha = 0.22;
      ctx.fillStyle = "#fff";
      const fontSize = Math.max(18, img.width * 0.045);
      ctx.font = `${fontSize}px 'Georgia', serif`;
      ctx.translate(img.width / 2, img.height / 2);
      ctx.rotate(-Math.PI / 5);

      const step = fontSize * 5;
      for (let y = -img.height * 1.5; y < img.height * 1.5; y += step) {
        for (let x = -img.width * 1.5; x < img.width * 1.5; x += step) {
          ctx.fillText("© Jana Baron", x, y);
        }
      }
      ctx.restore();
      setLoaded(true);
    };
    img.src = src;
  }, [src]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ ...style, display: loaded ? "block" : "none", cursor: onClick ? "pointer" : "default" }}
      onClick={onClick}
      onContextMenu={(e) => e.preventDefault()}
      onDragStart={(e) => e.preventDefault()}
    />
  );
}

// ─── MAIN APP ──────────────────────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState("landing"); // landing | photographer | client | client-gallery
  const [photographer, setPhotographer] = useState(null);
  const [client, setClient] = useState(null);
  const [sessions, setSessions] = useState([
    {
      id: "sess_1",
      name: "Noiva Fernanda — Ensaio Pré-Wedding",
      accessCode: "FERN2024",
      photos: MOCK_PHOTOS,
      selections: {},
      maxPhotos: 10,
      createdAt: "2024-01-15",
    },
  ]);
  const [activeSession, setActiveSession] = useState(null);
  const [selected, setSelected] = useState([]);
  const [lightbox, setLightbox] = useState(null);
  const [toast, setToast] = useState(null);
  const [loginData, setLoginData] = useState({ email: "", password: "", name: "" });
  const [accessCode, setAccessCode] = useState("");
  const [clientInfo, setClientInfo] = useState({ name: "", email: "", phone: "" });
  const [newSession, setNewSession] = useState({ name: "", maxPhotos: 10, accessCode: "" });
  const [selectionSent, setSelectionSent] = useState(false);
  const [showNewSession, setShowNewSession] = useState(false);
  const [tab, setTab] = useState("sessions");

  const showToast = useCallback((msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  // Block keyboard shortcuts for screenshots/printing
  useEffect(() => {
    const block = (e) => {
      if (
        (e.ctrlKey || e.metaKey) &&
        ["s", "p", "u", "shift"].includes(e.key.toLowerCase())
      )
        e.preventDefault();
      if (e.key === "PrintScreen") e.preventDefault();
    };
    window.addEventListener("keydown", block);
    return () => window.removeEventListener("keydown", block);
  }, []);

  // ── PHOTOGRAPHER LOGIN ──────────────────────────────────────────────────────
  const handlePhotographerLogin = (e) => {
    e.preventDefault();
    if (
      loginData.email === PHOTOGRAPHER.email &&
      loginData.password === PHOTOGRAPHER.password
    ) {
      setPhotographer(PHOTOGRAPHER);
      setScreen("photographer");
      showToast("Bem-vinda, Jana! 👋");
    } else {
      showToast("Email ou senha incorretos.", "error");
    }
  };

  // ── CLIENT ACCESS ───────────────────────────────────────────────────────────
  const handleClientAccess = (e) => {
    e.preventDefault();
    const sess = sessions.find(
      (s) => s.accessCode.toUpperCase() === accessCode.toUpperCase()
    );
    if (!sess) return showToast("Código de acesso inválido.", "error");
    if (!clientInfo.name || !clientInfo.email)
      return showToast("Preencha seu nome e e-mail.", "error");

    const clientObj = { ...clientInfo, id: `client_${Date.now()}` };
    setClient(clientObj);
    setActiveSession(sess);

    // Check if already submitted
    const existing = sess.selections[clientObj.email];
    if (existing) {
      setSelected(existing);
      setSelectionSent(true);
    } else {
      setSelected([]);
      setSelectionSent(false);
    }
    setScreen("client-gallery");
    showToast(`Galeria carregada! Você pode escolher até ${sess.maxPhotos} fotos.`);
  };

  // ── TOGGLE PHOTO SELECTION ──────────────────────────────────────────────────
  const toggleSelect = (photoId) => {
    if (selectionSent) return;
    setSelected((prev) => {
      if (prev.includes(photoId)) return prev.filter((id) => id !== photoId);
      if (prev.length >= activeSession.maxPhotos) {
        showToast(`Limite de ${activeSession.maxPhotos} fotos atingido.`, "error");
        return prev;
      }
      return [...prev, photoId];
    });
  };

  // ── SUBMIT SELECTION ────────────────────────────────────────────────────────
  const submitSelection = () => {
    if (selected.length === 0)
      return showToast("Selecione ao menos uma foto.", "error");

    setSessions((prev) =>
      prev.map((s) =>
        s.id === activeSession.id
          ? {
              ...s,
              selections: { ...s.selections, [client.email]: selected },
            }
          : s
      )
    );
    setSelectionSent(true);
    showToast(`Seleção de ${selected.length} fotos enviada! ✨`);
  };

  // ── CREATE SESSION ──────────────────────────────────────────────────────────
  const createSession = (e) => {
    e.preventDefault();
    if (!newSession.name || !newSession.accessCode)
      return showToast("Preencha todos os campos.", "error");
    const sess = {
      id: `sess_${Date.now()}`,
      name: newSession.name,
      accessCode: newSession.accessCode.toUpperCase(),
      photos: MOCK_PHOTOS,
      selections: {},
      maxPhotos: parseInt(newSession.maxPhotos) || 10,
      createdAt: new Date().toISOString().slice(0, 10),
    };
    setSessions((prev) => [...prev, sess]);
    setNewSession({ name: "", maxPhotos: 10, accessCode: "" });
    setShowNewSession(false);
    showToast("Sessão criada com sucesso! 📷");
  };

  // ── SCREENS ─────────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        minHeight: "100vh",
        fontFamily: "'Playfair Display', Georgia, serif",
        background: "#0e0c0a",
        color: "#e8ddd0",
        userSelect: "none",
        WebkitUserSelect: "none",
        MozUserSelect: "none",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;1,400&family=Cormorant+Garamond:wght@300;400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 6px; } 
        ::-webkit-scrollbar-track { background: #1a1612; }
        ::-webkit-scrollbar-thumb { background: #a08060; border-radius: 3px; }
        ::selection { background: transparent; }
        img { pointer-events: none; -webkit-user-drag: none; }
        canvas { -webkit-user-drag: none; }

        .btn {
          display: inline-flex; align-items: center; justify-content: center;
          gap: 8px; padding: 12px 28px; border: none; cursor: pointer;
          font-family: 'Cormorant Garamond', serif; font-size: 15px;
          font-weight: 500; letter-spacing: 0.12em; text-transform: uppercase;
          transition: all 0.3s ease; border-radius: 2px;
        }
        .btn-primary {
          background: #c4965a; color: #0e0c0a;
        }
        .btn-primary:hover { background: #d4a66a; transform: translateY(-1px); box-shadow: 0 8px 24px rgba(196,150,90,0.35); }
        .btn-ghost {
          background: transparent; color: #c4965a;
          border: 1px solid rgba(196,150,90,0.5);
        }
        .btn-ghost:hover { background: rgba(196,150,90,0.1); border-color: #c4965a; }
        .btn-danger { background: #8b3a3a; color: #e8ddd0; }
        .btn-danger:hover { background: #a04040; }

        .input {
          width: 100%; padding: 12px 16px; background: rgba(255,255,255,0.05);
          border: 1px solid rgba(196,150,90,0.25); border-radius: 2px;
          color: #e8ddd0; font-family: 'Cormorant Garamond', serif;
          font-size: 15px; letter-spacing: 0.04em; transition: border-color 0.3s;
          outline: none;
        }
        .input:focus { border-color: #c4965a; background: rgba(255,255,255,0.07); }
        .input::placeholder { color: rgba(232,221,208,0.35); }

        .card {
          background: rgba(255,255,255,0.04); border: 1px solid rgba(196,150,90,0.15);
          border-radius: 4px; padding: 24px; transition: all 0.3s;
        }
        .card:hover { border-color: rgba(196,150,90,0.35); background: rgba(255,255,255,0.06); }

        .photo-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
          gap: 12px;
        }

        .photo-item {
          position: relative; cursor: pointer; border-radius: 3px; overflow: hidden;
          aspect-ratio: 2/3; transition: transform 0.3s, box-shadow 0.3s;
        }
        .photo-item:hover { transform: translateY(-3px); box-shadow: 0 12px 32px rgba(0,0,0,0.5); }
        .photo-item.selected { box-shadow: 0 0 0 3px #c4965a, 0 12px 32px rgba(196,150,90,0.3); }

        .selection-badge {
          position: absolute; top: 10px; right: 10px; width: 28px; height: 28px;
          background: #c4965a; border-radius: 50%; display: flex;
          align-items: center; justify-content: center; font-size: 14px;
          color: #0e0c0a; font-weight: bold; z-index: 10;
          box-shadow: 0 2px 8px rgba(0,0,0,0.4);
        }

        .lightbox-overlay {
          position: fixed; inset: 0; background: rgba(0,0,0,0.92); z-index: 1000;
          display: flex; align-items: center; justify-content: center;
          backdrop-filter: blur(4px);
        }

        .toast {
          position: fixed; bottom: 32px; left: 50%; transform: translateX(-50%);
          padding: 12px 28px; border-radius: 3px; font-family: 'Cormorant Garamond', serif;
          font-size: 15px; letter-spacing: 0.06em; z-index: 2000;
          animation: toastIn 0.3s ease;
        }
        .toast.success { background: #2a4a2a; border: 1px solid #4a7a4a; color: #a0d0a0; }
        .toast.error { background: #4a2a2a; border: 1px solid #7a4a4a; color: #d0a0a0; }
        @keyframes toastIn { from { opacity: 0; transform: translateX(-50%) translateY(10px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }

        .tab { padding: 10px 20px; cursor: pointer; font-family: 'Cormorant Garamond', serif;
          font-size: 14px; letter-spacing: 0.1em; text-transform: uppercase;
          border-bottom: 2px solid transparent; transition: all 0.3s; color: rgba(232,221,208,0.5); }
        .tab.active { color: #c4965a; border-bottom-color: #c4965a; }
        .tab:hover { color: #e8ddd0; }

        .label { font-family: 'Cormorant Garamond', serif; font-size: 12px;
          letter-spacing: 0.12em; text-transform: uppercase; color: rgba(232,221,208,0.5);
          margin-bottom: 6px; display: block; }

        .divider { border: none; border-top: 1px solid rgba(196,150,90,0.15); margin: 24px 0; }

        .no-print { }
        @media print { body { display: none !important; } }
      `}</style>

      {/* ── LANDING ─────────────────────────────────────────────────────── */}
      {screen === "landing" && (
        <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 20px", position: "relative", overflow: "hidden" }}>
          {/* bg grain */}
          <div style={{ position: "fixed", inset: 0, backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.06'/%3E%3C/svg%3E\")", pointerEvents: "none", zIndex: 0 }} />

          <div style={{ maxWidth: 460, width: "100%", textAlign: "center", position: "relative", zIndex: 1 }}>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 11, letterSpacing: "0.3em", textTransform: "uppercase", color: "#c4965a", marginBottom: 20 }}>
              Galeria Privada
            </div>
            <h1 style={{ fontSize: "clamp(36px, 7vw, 54px)", fontWeight: 400, lineHeight: 1.1, marginBottom: 12, fontStyle: "italic" }}>
              Jana Baron
            </h1>
            <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 16, color: "rgba(232,221,208,0.55)", marginBottom: 48, letterSpacing: "0.05em" }}>
              Seleção exclusiva de fotografias
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <button
                className="btn btn-primary"
                style={{ width: "100%", padding: "16px", fontSize: 14 }}
                onClick={() => setScreen("photographer")}
              >
                <span>✦</span> Área da Fotógrafa
              </button>
              <button
                className="btn btn-ghost"
                style={{ width: "100%", padding: "16px", fontSize: 14 }}
                onClick={() => setScreen("client")}
              >
                Acessar Minha Galeria
              </button>
            </div>

            <p style={{ marginTop: 48, fontFamily: "'Cormorant Garamond', serif", fontSize: 12, color: "rgba(232,221,208,0.25)", letterSpacing: "0.08em" }}>
              Imagens protegidas · Marca d'água automática · Download desabilitado
            </p>
          </div>
        </div>
      )}

      {/* ── PHOTOGRAPHER LOGIN + DASHBOARD ─────────────────────────────── */}
      {screen === "photographer" && !photographer && (
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ maxWidth: 420, width: "100%" }}>
            <button className="btn btn-ghost" style={{ marginBottom: 32, padding: "8px 16px", fontSize: 12 }} onClick={() => setScreen("landing")}>
              ← Voltar
            </button>
            <div style={{ textAlign: "center", marginBottom: 40 }}>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 11, letterSpacing: "0.3em", textTransform: "uppercase", color: "#c4965a", marginBottom: 12 }}>Acesso Restrito</div>
              <h2 style={{ fontSize: 32, fontWeight: 400, fontStyle: "italic" }}>Área da Fotógrafa</h2>
            </div>
            <form onSubmit={handlePhotographerLogin} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label className="label">E-mail</label>
                <input className="input" type="email" placeholder="seu@email.com" value={loginData.email} onChange={(e) => setLoginData({ ...loginData, email: e.target.value })} />
              </div>
              <div>
                <label className="label">Senha</label>
                <input className="input" type="password" placeholder="••••••••" value={loginData.password} onChange={(e) => setLoginData({ ...loginData, password: e.target.value })} />
              </div>
              <button className="btn btn-primary" type="submit" style={{ marginTop: 8, padding: "14px" }}>
                Entrar
              </button>
            </form>
            <p style={{ textAlign: "center", marginTop: 20, fontFamily: "'Cormorant Garamond', serif", fontSize: 12, color: "rgba(232,221,208,0.3)" }}>
              Demo: jana@janabaron.com / jana2024
            </p>
          </div>
        </div>
      )}

      {/* ── PHOTOGRAPHER DASHBOARD ──────────────────────────────────────── */}
      {screen === "photographer" && photographer && (
        <div style={{ minHeight: "100vh", padding: "0 0 60px" }}>
          {/* Header */}
          <div style={{ borderBottom: "1px solid rgba(196,150,90,0.15)", padding: "20px 40px", display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(0,0,0,0.3)", backdropFilter: "blur(8px)", position: "sticky", top: 0, zIndex: 100 }}>
            <div>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 11, letterSpacing: "0.25em", textTransform: "uppercase", color: "#c4965a" }}>Painel</div>
              <h1 style={{ fontSize: 22, fontWeight: 400, fontStyle: "italic" }}>Jana Baron</h1>
            </div>
            <button className="btn btn-ghost" style={{ fontSize: 12, padding: "8px 16px" }} onClick={() => { setPhotographer(null); setScreen("landing"); }}>
              Sair
            </button>
          </div>

          <div style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 20px" }}>
            {/* Tabs */}
            <div style={{ display: "flex", gap: 0, borderBottom: "1px solid rgba(196,150,90,0.15)", marginBottom: 40 }}>
              <div className={`tab ${tab === "sessions" ? "active" : ""}`} onClick={() => setTab("sessions")}>Sessões</div>
              <div className={`tab ${tab === "selections" ? "active" : ""}`} onClick={() => setTab("selections")}>Seleções Recebidas</div>
            </div>

            {/* Sessions Tab */}
            {tab === "sessions" && (
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
                  <h2 style={{ fontSize: 22, fontWeight: 400 }}>Sessões de Fotos</h2>
                  <button className="btn btn-primary" onClick={() => setShowNewSession(!showNewSession)}>
                    {showNewSession ? "Cancelar" : "+ Nova Sessão"}
                  </button>
                </div>

                {showNewSession && (
                  <div className="card" style={{ marginBottom: 32, background: "rgba(196,150,90,0.06)", borderColor: "rgba(196,150,90,0.3)" }}>
                    <h3 style={{ fontSize: 18, fontWeight: 400, marginBottom: 24, fontStyle: "italic" }}>Criar Nova Sessão</h3>
                    <form onSubmit={createSession} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                      <div style={{ gridColumn: "1 / -1" }}>
                        <label className="label">Nome da sessão / Cliente</label>
                        <input className="input" placeholder="Ex: Noiva Mariana — Pré-Wedding" value={newSession.name} onChange={(e) => setNewSession({ ...newSession, name: e.target.value })} />
                      </div>
                      <div>
                        <label className="label">Código de acesso</label>
                        <input className="input" placeholder="Ex: MARI2024" value={newSession.accessCode} onChange={(e) => setNewSession({ ...newSession, accessCode: e.target.value.toUpperCase() })} />
                      </div>
                      <div>
                        <label className="label">Limite de fotos</label>
                        <input className="input" type="number" min="1" max="100" value={newSession.maxPhotos} onChange={(e) => setNewSession({ ...newSession, maxPhotos: e.target.value })} />
                      </div>
                      <div style={{ gridColumn: "1 / -1" }}>
                        <button className="btn btn-primary" type="submit">Criar Sessão</button>
                      </div>
                    </form>
                  </div>
                )}

                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {sessions.map((sess) => {
                    const selectionCount = Object.keys(sess.selections).length;
                    return (
                      <div key={sess.id} className="card" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
                        <div>
                          <div style={{ fontSize: 17, marginBottom: 4 }}>{sess.name}</div>
                          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 13, color: "rgba(232,221,208,0.45)", display: "flex", gap: 16 }}>
                            <span>📷 {sess.photos.length} fotos</span>
                            <span>✓ Máx. {sess.maxPhotos}</span>
                            <span>📅 {sess.createdAt}</span>
                          </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                          <div style={{ textAlign: "right" }}>
                            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase", color: "rgba(232,221,208,0.4)", marginBottom: 2 }}>Código</div>
                            <div style={{ fontSize: 18, color: "#c4965a", letterSpacing: "0.1em", fontWeight: 600 }}>{sess.accessCode}</div>
                          </div>
                          {selectionCount > 0 && (
                            <div style={{ background: "rgba(196,150,90,0.15)", border: "1px solid rgba(196,150,90,0.3)", borderRadius: 3, padding: "6px 14px", textAlign: "center" }}>
                              <div style={{ fontSize: 20, color: "#c4965a", fontWeight: 600 }}>{selectionCount}</div>
                              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 11, color: "rgba(232,221,208,0.45)", letterSpacing: "0.1em" }}>SELEÇÃO</div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Selections Tab */}
            {tab === "selections" && (
              <div>
                <h2 style={{ fontSize: 22, fontWeight: 400, marginBottom: 32 }}>Seleções Recebidas</h2>
                {sessions.filter((s) => Object.keys(s.selections).length > 0).length === 0 ? (
                  <div style={{ textAlign: "center", padding: "80px 20px", color: "rgba(232,221,208,0.3)", fontFamily: "'Cormorant Garamond', serif", fontSize: 18, fontStyle: "italic" }}>
                    Nenhuma seleção recebida ainda
                  </div>
                ) : (
                  sessions.map((sess) =>
                    Object.entries(sess.selections).map(([email, photoIds]) => (
                      <div key={email} className="card" style={{ marginBottom: 20 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
                          <div>
                            <div style={{ fontSize: 16, marginBottom: 4 }}>{sess.name}</div>
                            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 13, color: "#c4965a" }}>{email}</div>
                          </div>
                          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 13, color: "rgba(232,221,208,0.4)" }}>
                            {photoIds.length} foto{photoIds.length !== 1 ? "s" : ""} selecionada{photoIds.length !== 1 ? "s" : ""}
                          </div>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))", gap: 8 }}>
                          {photoIds.map((pid) => {
                            const photo = sess.photos.find((p) => p.id === pid);
                            return photo ? (
                              <div key={pid} style={{ aspectRatio: "2/3", borderRadius: 3, overflow: "hidden", background: "#1a1612" }}>
                                <img src={photo.thumb} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", pointerEvents: "none" }} onContextMenu={(e) => e.preventDefault()} />
                              </div>
                            ) : null;
                          })}
                        </div>
                      </div>
                    ))
                  )
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── CLIENT ACCESS FORM ──────────────────────────────────────────── */}
      {screen === "client" && (
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ maxWidth: 460, width: "100%" }}>
            <button className="btn btn-ghost" style={{ marginBottom: 32, padding: "8px 16px", fontSize: 12 }} onClick={() => setScreen("landing")}>
              ← Voltar
            </button>
            <div style={{ textAlign: "center", marginBottom: 40 }}>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 11, letterSpacing: "0.3em", textTransform: "uppercase", color: "#c4965a", marginBottom: 12 }}>Galeria Privada</div>
              <h2 style={{ fontSize: 32, fontWeight: 400, fontStyle: "italic" }}>Acesse sua Galeria</h2>
              <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 14, color: "rgba(232,221,208,0.45)", marginTop: 8 }}>
                Insira o código enviado pela fotógrafa
              </p>
            </div>
            <form onSubmit={handleClientAccess} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label className="label">Seu nome</label>
                <input className="input" placeholder="Nome completo" value={clientInfo.name} onChange={(e) => setClientInfo({ ...clientInfo, name: e.target.value })} />
              </div>
              <div>
                <label className="label">E-mail</label>
                <input className="input" type="email" placeholder="seu@email.com" value={clientInfo.email} onChange={(e) => setClientInfo({ ...clientInfo, email: e.target.value })} />
              </div>
              <div>
                <label className="label">WhatsApp (opcional)</label>
                <input className="input" placeholder="(51) 9 9999-9999" value={clientInfo.phone} onChange={(e) => setClientInfo({ ...clientInfo, phone: e.target.value })} />
              </div>
              <hr className="divider" />
              <div>
                <label className="label">Código de acesso</label>
                <input
                  className="input"
                  placeholder="Ex: FERN2024"
                  value={accessCode}
                  onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                  style={{ textAlign: "center", fontSize: 20, letterSpacing: "0.2em", fontFamily: "'Cormorant Garamond', serif" }}
                />
              </div>
              <button className="btn btn-primary" type="submit" style={{ marginTop: 8, padding: "14px" }}>
                Acessar Galeria →
              </button>
            </form>
            <p style={{ textAlign: "center", marginTop: 20, fontFamily: "'Cormorant Garamond', serif", fontSize: 12, color: "rgba(232,221,208,0.3)" }}>
              Demo: código FERN2024
            </p>
          </div>
        </div>
      )}

      {/* ── CLIENT GALLERY ──────────────────────────────────────────────── */}
      {screen === "client-gallery" && activeSession && (
        <div style={{ minHeight: "100vh" }}>
          {/* Header */}
          <div style={{ borderBottom: "1px solid rgba(196,150,90,0.15)", padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(0,0,0,0.4)", backdropFilter: "blur(10px)", position: "sticky", top: 0, zIndex: 100, gap: 12, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 11, letterSpacing: "0.25em", textTransform: "uppercase", color: "#c4965a" }}>
                {client?.name}
              </div>
              <div style={{ fontSize: 15, fontStyle: "italic", color: "rgba(232,221,208,0.7)" }}>{activeSession.name}</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ textAlign: "center", fontFamily: "'Cormorant Garamond', serif" }}>
                <div style={{ fontSize: 22, color: selected.length === activeSession.maxPhotos ? "#c4965a" : "#e8ddd0", fontWeight: 600 }}>
                  {selected.length}<span style={{ fontSize: 14, color: "rgba(232,221,208,0.4)" }}>/{activeSession.maxPhotos}</span>
                </div>
                <div style={{ fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(232,221,208,0.4)" }}>escolhidas</div>
              </div>
              {!selectionSent ? (
                <button className="btn btn-primary" onClick={submitSelection} disabled={selected.length === 0} style={{ opacity: selected.length === 0 ? 0.4 : 1, fontSize: 13 }}>
                  Enviar Seleção ✓
                </button>
              ) : (
                <div style={{ background: "rgba(74,120,74,0.2)", border: "1px solid rgba(74,120,74,0.5)", borderRadius: 3, padding: "8px 20px", fontFamily: "'Cormorant Garamond', serif", fontSize: 13, color: "#80c080", letterSpacing: "0.05em" }}>
                  ✓ Seleção Enviada
                </div>
              )}
            </div>
          </div>

          {selectionSent && (
            <div style={{ background: "rgba(74,120,74,0.1)", border: "none", borderBottom: "1px solid rgba(74,120,74,0.2)", padding: "14px 24px", textAlign: "center", fontFamily: "'Cormorant Garamond', serif", fontSize: 14, color: "#80c080" }}>
              Sua seleção de {selected.length} fotos foi enviada com sucesso! Jana entrará em contato em breve. ✨
            </div>
          )}

          <div style={{ maxWidth: 1300, margin: "0 auto", padding: "32px 20px" }}>
            <div className="photo-grid">
              {activeSession.photos.map((photo, idx) => {
                const isSelected = selected.includes(photo.id);
                const selIdx = selected.indexOf(photo.id);
                return (
                  <div
                    key={photo.id}
                    className={`photo-item ${isSelected ? "selected" : ""}`}
                    onClick={() => !selectionSent && (setLightbox(photo))}
                    style={{ background: "#1a1612" }}
                  >
                    <WatermarkedImage
                      src={photo.thumb}
                      alt={`Foto ${idx + 1}`}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                    {/* Select button */}
                    {!selectionSent && (
                      <div
                        style={{
                          position: "absolute", inset: 0,
                          background: isSelected ? "rgba(196,150,90,0.12)" : "transparent",
                          transition: "background 0.3s",
                          display: "flex", alignItems: "flex-end", padding: "12px",
                        }}
                        onClick={(e) => { e.stopPropagation(); toggleSelect(photo.id); }}
                      >
                        <div style={{
                          width: "100%", padding: "8px 12px", textAlign: "center",
                          background: isSelected ? "#c4965a" : "rgba(0,0,0,0.65)",
                          color: isSelected ? "#0e0c0a" : "#e8ddd0",
                          fontFamily: "'Cormorant Garamond', serif",
                          fontSize: 12, letterSpacing: "0.12em", textTransform: "uppercase",
                          borderRadius: 2, transition: "all 0.3s",
                          backdropFilter: "blur(4px)",
                          opacity: 0, // shown on hover via parent
                        }}
                          className="select-label"
                        >
                          {isSelected ? `✓ Escolhida` : "Escolher"}
                        </div>
                      </div>
                    )}
                    {isSelected && (
                      <div className="selection-badge" onClick={(e) => { e.stopPropagation(); toggleSelect(photo.id); }}>
                        {selIdx + 1}
                      </div>
                    )}
                    {/* Number overlay */}
                    <div style={{ position: "absolute", bottom: 8, left: 10, fontFamily: "'Cormorant Garamond', serif", fontSize: 11, color: "rgba(232,221,208,0.3)", letterSpacing: "0.05em" }}>
                      {String(idx + 1).padStart(2, "0")}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── LIGHTBOX ────────────────────────────────────────────────────── */}
      {lightbox && (
        <div className="lightbox-overlay" onClick={() => setLightbox(null)}>
          <div style={{ position: "relative", maxWidth: "85vw", maxHeight: "90vh" }} onClick={(e) => e.stopPropagation()}>
            <WatermarkedImage
              src={lightbox.url}
              style={{ maxWidth: "85vw", maxHeight: "85vh", objectFit: "contain", borderRadius: 3 }}
            />
            <button
              className="btn btn-ghost"
              style={{ position: "absolute", top: -48, right: 0, padding: "8px 16px", fontSize: 13 }}
              onClick={() => setLightbox(null)}
            >
              ✕ Fechar
            </button>
            <div style={{ marginTop: 16, display: "flex", justifyContent: "center", gap: 12 }}>
              <button
                className={`btn ${selected.includes(lightbox.id) ? "btn-danger" : "btn-primary"}`}
                onClick={() => { toggleSelect(lightbox.id); setLightbox(null); }}
              >
                {selected.includes(lightbox.id) ? "✕ Remover da seleção" : "✓ Escolher esta foto"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── TOAST ───────────────────────────────────────────────────────── */}
      {toast && (
        <div className={`toast ${toast.type}`}>{toast.msg}</div>
      )}

      <style>{`
        .photo-item:hover .select-label { opacity: 1 !important; }
      `}</style>
    </div>
  );
}
