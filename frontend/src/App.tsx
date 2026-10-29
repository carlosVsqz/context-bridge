import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  Activity,
  ArrowDownToLine,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  CheckCheck,
  ChevronRight,
  Clipboard,
  Clock3,
  Code2,
  Database,
  FileText,
  FolderGit2,
  GitBranch,
  KeyRound,
  Layers3,
  LogOut,
  Menu,
  Monitor,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Terminal,
  Trash2,
  X,
} from "lucide-react";
import {
  api,
  ApiError,
  json,
  login,
  logout,
  tokenActive,
  newRequestId,
  type Context,
  type Entry,
  type Project,
  type Token,
  type User,
} from "./api";

type View = "overview" | "projects" | "connections" | "activity";
type DialogState =
  | { type: "project"; project?: Project }
  | { type: "entry"; project: Project }
  | { type: "token" }
  | { type: "secret"; secret: string; name: string }
  | { type: "password" }
  | null;
const labels: Record<string, string> = {
  CHECKPOINT: "Avance",
  DECISION: "Decisión",
  NOTE: "Nota",
};
const date = (s: string) =>
  new Intl.DateTimeFormat("es-GT", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(s));
const relative = (s: string) => {
  const min = Math.floor((Date.now() - new Date(s).getTime()) / 60000);
  return min < 1
    ? "Ahora mismo"
    : min < 60
      ? `Hace ${min} min`
      : min < 1440
        ? `Hace ${Math.floor(min / 60)} h`
        : date(s);
};
const message = (e: unknown) =>
  e instanceof Error ? e.message : "No se pudo completar la operación.";
function Brand({ light = false }: { light?: boolean }) {
  return (
    <div className={"brand " + (light ? "brand-light" : "")}>
      <span className="brand-mark">
        <Layers3 size={23} />
      </span>
      <span>
        context<span className="brand-weight">bridge</span>
        <small>PROJECT MEMORY</small>
      </span>
    </div>
  );
}
function Button({
  children,
  onClick,
  secondary = false,
  disabled = false,
  type = "button",
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  secondary?: boolean;
  disabled?: boolean;
  type?: "submit" | "button";
  className?: string;
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`${secondary ? "button secondary" : "button"} ${className}`}
    >
      {children}
    </button>
  );
}
function Empty({
  icon = <FolderGit2 />,
  title,
  children,
  action,
}: {
  icon?: ReactNode;
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <span className="empty-icon">{icon}</span>
      <h3>{title}</h3>
      <p>{children}</p>
      {action}
    </div>
  );
}
function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}
function Modal({
  title,
  subtitle,
  children,
  onClose,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    d?.showModal();
    return () => d?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      <div className="modal">
        <div className="modal-head">
          <div>
            <h2>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button className="icon-button" aria-label="Cerrar" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}
function Login({ onLogin }: { onLogin: (u: User) => void }) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState("");
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      onLogin(await login(email, password));
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="login">
      <section className="login-story">
        <Brand light />
        <div className="story-body">
          <span className="eyebrow light">
            <span className="tiny-dot" />
            UNA MEMORIA. TODOS TUS ENTORNOS.
          </span>
          <h1>
            Cambia de entorno.
            <br />
            Conserva el <em>contexto.</em>
          </h1>
          <p>
            Decisiones, avances y próximos pasos,
            <br className="desktop" /> siempre al alcance de tu agente.
          </p>
          <div className="orbit-scene" aria-hidden="true">
            <div className="orbit orbit-one" />
            <div className="orbit orbit-two" />
            <div className="orbit orbit-three" />
            <div className="scene-core">
              <Layers3 size={38} />
            </div>
            <div className="scene-node node-one">
              <Monitor size={18} />
              <span>Entorno A</span>
              <Check size={13} />
            </div>
            <div className="scene-node node-two">
              <Code2 size={18} />
              <span>Entorno B</span>
              <Check size={13} />
            </div>
            <div className="scene-note">
              <span className="tiny-dot" />
              Contexto compartido
            </div>
          </div>
        </div>
        <div className="story-footer">
          <ShieldCheck size={16} />
          Tu conocimiento, bajo tu control.<span>01 — 02</span>
        </div>
      </section>
      <section className="login-form-area">
        <div className="login-form-wrap">
          <span className="eyebrow">CONSOLA DE ADMINISTRACIÓN</span>
          <h2>Todo en su contexto.</h2>
          <p className="muted">
            Inicia sesión para continuar con tus proyectos.
          </p>
          <form onSubmit={submit}>
            <Field label="Correo electrónico">
              <input
                type="email"
                autoComplete="username"
                placeholder="tu@correo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                maxLength={254}
              />
            </Field>
            <Field label="Contraseña">
              <input
                type="password"
                autoComplete="current-password"
                placeholder="Ingresa tu contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                maxLength={72}
              />
            </Field>
            {error && (
              <div role="alert" className="form-error">
                {error}
              </div>
            )}
            <Button type="submit" disabled={busy}>
              {busy ? "Conectando…" : "Entrar a la consola"}
              <ArrowRight size={17} />
            </Button>
          </form>
          <div className="login-security">
            <ShieldCheck size={15} />
            Acceso privado · Sesión protegida
          </div>
        </div>
        <div className="login-bottom">
          CONTEXT BRIDGE<span>Tu trabajo continúa aquí.</span>
        </div>
      </section>
    </main>
  );
}
export default function App() {
  const [user, setUser] = useState<User | null>(null),
    [checking, setChecking] = useState(true),
    [bootError, setBootError] = useState("");
  useEffect(() => {
    const expired = () => setUser(null);
    window.addEventListener("session-expired", expired);
    api<User>("/auth/me")
      .then(setUser)
      .catch((e) => {
        if (!(e instanceof ApiError && e.status === 401))
          setBootError(message(e));
      })
      .finally(() => setChecking(false));
    return () => window.removeEventListener("session-expired", expired);
  }, []);
  if (checking)
    return (
      <div className="boot">
        <Brand />
        <span className="spinner" />
        Conectando con tu espacio…
      </div>
    );
  if (bootError)
    return (
      <div className="boot">
        <Brand />
        <p role="alert">{bootError}</p>
        <Button onClick={() => location.reload()}>
          <RefreshCw size={16} />
          Reintentar conexión
        </Button>
      </div>
    );
  if (!user) return <Login onLogin={setUser} />;
  return <Console user={user} onLogout={() => setUser(null)} />;
}
function Console({ user, onLogout }: { user: User; onLogout: () => void }) {
  const [view, setView] = useState<View>("overview"),
    [projects, setProjects] = useState<Project[]>([]),
    [tokens, setTokens] = useState<Token[]>([]),
    [activity, setActivity] = useState<Entry[]>([]),
    [selected, setSelected] = useState<Context | null>(null),
    [query, setQuery] = useState(""),
    [dialog, setDialog] = useState<DialogState>(null),
    [loading, setLoading] = useState(true),
    [refreshing, setRefreshing] = useState(false),
    [error, setError] = useState(""),
    [toast, setToast] = useState(""),
    [menu, setMenu] = useState(false),
    [detailLoading, setDetailLoading] = useState(false),
    [entrySearch, setEntrySearch] = useState(""),
    [searchResults, setSearchResults] = useState<Entry[] | null>(null);
  const detailRequest = useRef(0);
  function notify(text: string) {
    setToast(text);
  }
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 4500);
    return () => clearTimeout(t);
  }, [toast]);
  async function refresh() {
    setRefreshing(true);
    setError("");
    try {
      const [p, t, a] = await Promise.all([
        api<Project[]>("/projects"),
        api<Token[]>("/tokens"),
        api<Entry[]>("/activity"),
      ]);
      setProjects(p);
      setTokens(t);
      setActivity(a);
    } catch (e) {
      setError(message(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }
  useEffect(() => {
    void refresh();
  }, []);
  async function openProject(p: Project) {
    const req = ++detailRequest.current;
    setDetailLoading(true);
    setError("");
    setEntrySearch("");
    setSearchResults(null);
    try {
      const c = await api<Context>(`/projects/${p.id}/context`);
      if (req === detailRequest.current) setSelected(c);
    } catch (e) {
      setError(message(e));
    } finally {
      if (req === detailRequest.current) setDetailLoading(false);
    }
  }
  function navigate(v: View) {
    detailRequest.current++;
    setView(v);
    setSelected(null);
    setDetailLoading(false);
    setMenu(false);
    setQuery("");
  }
  const active = tokens.filter(tokenActive),
    filtered = projects.filter((p) =>
      (p.name + " " + p.slug + " " + p.description)
        .toLowerCase()
        .includes(query.toLowerCase()),
    );
  const visibleActivity = activity.filter((e) =>
    (e.title + " " + e.content + " " + e.environment)
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  const pageTitle: Record<View, string> = {
    overview: "Tu trabajo, conectado.",
    projects: "Un espacio para cada proyecto.",
    connections: "Conecta tus entornos.",
    activity: "Cada avance deja contexto.",
  };
  const copy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      notify("Copiado al portapapeles.");
    } catch {
      notify("No se pudo copiar. Selecciona el texto y cópialo manualmente.");
    }
  };
  async function searchEntries(e: FormEvent) {
    e.preventDefault();
    if (!selected) return;
    try {
      setSearchResults(
        entrySearch.trim()
          ? await api<Entry[]>(
              `/projects/${selected.project.id}/entries?q=${encodeURIComponent(entrySearch)}`,
            )
          : null,
      );
    } catch (e) {
      setError(message(e));
    }
  }
  async function loadMore() {
    if (!selected?.nextCursor) return;
    try {
      const next = await api<Context>(
        `/projects/${selected.project.id}/context?before=${selected.nextCursor}`,
      );
      setSelected({ ...next, entries: [...selected.entries, ...next.entries] });
    } catch (e) {
      setError(message(e));
    }
  }
  const projectName = (id: string) =>
    projects.find((p) => p.id === id)?.name ?? "Proyecto";
  return (
    <div className="app-shell">
      <aside className={"sidebar " + (menu ? "is-open" : "")}>
        <Brand light />
        <div className="workspace">
          <span className="workspace-avatar">CB</span>
          <div>
            Mi espacio de trabajo<small>Administración</small>
          </div>
          <ShieldCheck size={15} />
        </div>
        <span className="nav-label">WORKSPACE</span>
        <nav>
          {(
            [
              { id: "overview", icon: Layers3, label: "Vista general" },
              { id: "projects", icon: FolderGit2, label: "Proyectos" },
              { id: "connections", icon: KeyRound, label: "Conexiones MCP" },
              { id: "activity", icon: Activity, label: "Actividad" },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              className={
                "nav-item " + (view === item.id && !selected ? "active" : "")
              }
              onClick={() => navigate(item.id)}
            >
              <item.icon size={18} />
              {item.label}
              {item.id === "projects" && (
                <span className="nav-count">{projects.length}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="mcp-info">
            <span className="status-dot" />
            <span>
              Memoria compartida<small>PostgreSQL · MCP</small>
            </span>
            <Database size={17} />
          </div>
          <button
            className="profile"
            onClick={() => setDialog({ type: "password" })}
          >
            <span className="user-avatar">
              {user.name.charAt(0).toUpperCase()}
            </span>
            <span>
              {user.name}
              <small>Administrador</small>
            </span>
            <Settings2 size={17} />
          </button>
          <button
            className="logout"
            onClick={async () => {
              try {
                await logout();
                onLogout();
              } catch (e) {
                setError(message(e));
              }
            }}
          >
            <LogOut size={15} />
            Cerrar sesión
          </button>
        </div>
      </aside>
      {menu && (
        <button
          className="sidebar-overlay"
          aria-label="Cerrar menú"
          onClick={() => setMenu(false)}
        />
      )}
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="mobile-menu icon-button"
              aria-label="Abrir menú"
              onClick={() => setMenu(true)}
            >
              <Menu size={20} />
            </button>
            <span>Workspace</span>
            <ChevronRight size={13} />
            <strong>
              {selected
                ? selected.project.name
                : {
                    overview: "Vista general",
                    projects: "Proyectos",
                    connections: "Conexiones MCP",
                    activity: "Actividad",
                  }[view]}
            </strong>
          </div>
          <div className="topbar-right">
            <span className="private-badge">
              <ShieldCheck size={13} />
              Espacio privado
            </span>
            <button
              className="icon-button"
              title="Actualizar datos"
              aria-label="Actualizar datos"
              disabled={refreshing}
              onClick={() => {
                void refresh();
                if (selected) void openProject(selected.project);
              }}
            >
              <RefreshCw size={17} className={refreshing ? "spin" : ""} />
            </button>
            <span className="top-avatar">
              {user.name.charAt(0).toUpperCase()}
            </span>
          </div>
        </header>
        <main className="main-content">
          {selected ? (
            <>
              <button className="back-link" onClick={() => setSelected(null)}>
                <ArrowLeft size={15} />
                Volver a proyectos
              </button>
              <section className="page-heading">
                <div>
                  <span className="eyebrow">
                    PROYECTO / {selected.project.slug}
                  </span>
                  <h1>{selected.project.name}</h1>
                  <p>
                    {selected.project.description ||
                      "Un espacio compartido para el conocimiento de tu proyecto."}
                  </p>
                </div>
                <Button
                  onClick={() =>
                    setDialog({ type: "entry", project: selected.project })
                  }
                >
                  <Plus size={17} />
                  Registrar avance
                </Button>
              </section>
              <div className="detail-meta">
                <span>
                  <GitBranch size={15} />
                  Revisión {selected.project.revision}
                </span>
                <span>
                  <Clock3 size={15} />
                  {date(selected.project.updatedAt)}
                </span>
                {selected.project.repositoryUrl && (
                  <span>
                    <FolderGit2 size={15} />
                    {selected.project.repositoryUrl}
                  </span>
                )}
              </div>
              <div className="detail-grid">
                <section className="panel summary-panel">
                  <div className="panel-heading">
                    <h2>
                      <FileText size={18} />
                      Contexto vigente
                    </h2>
                    <button
                      className="text-button"
                      onClick={() =>
                        setDialog({
                          type: "project",
                          project: selected.project,
                        })
                      }
                    >
                      Editar contexto
                      <ArrowUpRight size={15} />
                    </button>
                  </div>
                  <p className="summary-text">
                    {selected.project.summary ||
                      "Aún no hay un resumen. Documenta la arquitectura, las convenciones y los objetivos para que Codex pueda retomar el trabajo en cualquier entorno."}
                  </p>
                  <div className="summary-footer">
                    <ShieldCheck size={15} />
                    Los cambios conservan una copia en el historial.
                  </div>
                </section>
                <section className="panel project-connect">
                  <span className="eyebrow">LISTO PARA TU IDE</span>
                  <div className="connection-glyph">
                    <Terminal size={26} />
                  </div>
                  <h2>
                    El mismo contexto.
                    <br />
                    En cada entorno.
                  </h2>
                  <p>
                    Genera un token para este proyecto y conéctalo a Codex desde
                    JetBrains.
                  </p>
                  <Button secondary onClick={() => navigate("connections")}>
                    Configurar conexión
                    <ArrowRight size={16} />
                  </Button>
                </section>
              </div>
              <section className="panel">
                <div className="panel-heading">
                  <div>
                    <h2>Historial del proyecto</h2>
                    <p>Decisiones y avances, con su versión del código.</p>
                  </div>
                  <span className="count-pill">
                    {selected.entries.length} registros cargados
                  </span>
                </div>
                <form className="entry-search" onSubmit={searchEntries}>
                  <Search size={17} />
                  <input
                    aria-label="Buscar en contexto"
                    placeholder="Buscar en el contexto del proyecto…"
                    maxLength={200}
                    value={entrySearch}
                    onChange={(e) => setEntrySearch(e.target.value)}
                  />
                  <button type="submit" className="text-button">
                    Buscar
                  </button>
                </form>
                <EntryList entries={searchResults ?? selected.entries} />
                {searchResults === null && selected.nextCursor && (
                  <div className="load-more">
                    <Button secondary onClick={() => void loadMore()}>
                      Cargar registros anteriores
                    </Button>
                  </div>
                )}
              </section>
            </>
          ) : (
            <>
              <section className="page-heading">
                <div>
                  <span className="eyebrow">
                    {view === "overview"
                      ? "TU CENTRO DE CONTEXTO"
                      : view === "projects"
                        ? "PROYECTOS"
                        : view === "connections"
                          ? "INTEGRACIONES"
                          : "HISTORIAL"}
                  </span>
                  <h1>{pageTitle[view]}</h1>
                  <p>
                    {view === "overview"
                      ? "Todo lo que tu agente necesita para continuar donde lo dejaste."
                      : view === "projects"
                        ? "Centraliza el conocimiento y mantén la continuidad del trabajo."
                        : view === "connections"
                          ? "Un token por equipo. Un contexto compartido por proyecto."
                          : "Decisiones, notas y avances de todos tus proyectos."}
                  </p>
                </div>
                <Button
                  onClick={() =>
                    setDialog(
                      view === "connections"
                        ? { type: "token" }
                        : { type: "project" },
                    )
                  }
                  disabled={view === "connections" && !projects.length}
                >
                  <Plus size={17} />
                  {view === "connections" ? "Nueva conexión" : "Nuevo proyecto"}
                </Button>
              </section>
              {error && (
                <div className="banner-error" role="alert">
                  <span>{error}</span>
                  <button
                    className="text-button"
                    onClick={() => void refresh()}
                  >
                    Reintentar
                  </button>
                </div>
              )}
              {view === "overview" && (
                <>
                  <div className="stats-grid">
                    <Stat
                      label="Proyectos"
                      value={projects.length}
                      icon={<FolderGit2 size={19} />}
                      caption="Conocimiento centralizado"
                    />
                    <Stat
                      label="Conexiones activas"
                      value={active.length}
                      icon={<Monitor size={19} />}
                      caption="Tokens vigentes y autorizados"
                    />
                    <Stat
                      label="Actividad reciente"
                      value={activity.length}
                      icon={<Activity size={19} />}
                      caption="Últimos 30 registros"
                    />
                    <Stat
                      label="Última actualización"
                      value={
                        activity[0]
                          ? relative(activity[0].createdAt)
                          : "Sin actividad"
                      }
                      icon={<Clock3 size={19} />}
                      caption={
                        activity[0]
                          ? projectName(activity[0].projectId)
                          : "Tu próximo avance empieza aquí"
                      }
                    />
                  </div>
                  <div className="overview-grid">
                    <section className="panel projects-panel">
                      <div className="panel-heading">
                        <div>
                          <h2>
                            Tus proyectos
                            <span className="count-pill">
                              {projects.length}
                            </span>
                          </h2>
                          <p>Retoma el trabajo con todo el contexto.</p>
                        </div>
                        <button
                          className="text-button"
                          onClick={() => navigate("projects")}
                        >
                          Ver todos
                          <ArrowUpRight size={15} />
                        </button>
                      </div>
                      {loading ? (
                        <div className="inline-loading">
                          Cargando proyectos…
                        </div>
                      ) : projects.length ? (
                        <div className="compact-projects">
                          {projects.slice(0, 4).map((p) => (
                            <ProjectCard
                              key={p.id}
                              project={p}
                              onClick={() => void openProject(p)}
                              compact
                            />
                          ))}
                        </div>
                      ) : (
                        <Empty
                          title="Tu primer proyecto empieza aquí"
                          action={
                            <Button
                              secondary
                              onClick={() => setDialog({ type: "project" })}
                            >
                              <Plus size={16} />
                              Crear proyecto
                            </Button>
                          }
                        >
                          Dale un espacio a las decisiones que vale la pena
                          recordar.
                        </Empty>
                      )}
                    </section>
                    <section className="connect-card">
                      <span className="eyebrow light">
                        HECHO PARA CONTINUAR
                      </span>
                      <div className="connect-visual" aria-hidden="true">
                        <span>
                          <Code2 size={22} />
                        </span>
                        <i />
                        <span className="connect-center">
                          <Layers3 size={25} />
                        </span>
                        <i />
                        <span>
                          <Monitor size={22} />
                        </span>
                      </div>
                      <h2>
                        Dos entornos.
                        <br />
                        Una sola memoria.
                      </h2>
                      <p>
                        Conecta Codex en JetBrains y lleva contigo cada decisión
                        del proyecto.
                      </p>
                      <button onClick={() => navigate("connections")}>
                        Configurar MCP
                        <ArrowUpRight size={17} />
                      </button>
                      <div className="connect-card-footer">
                        <ShieldCheck size={14} />
                        Tokens por proyecto · Acceso revocable
                      </div>
                    </section>
                  </div>
                  <section className="panel activity-panel">
                    <div className="panel-heading">
                      <div>
                        <h2>El trabajo sigue avanzando</h2>
                        <p>Los últimos cambios en tu memoria compartida.</p>
                      </div>
                      <button
                        className="text-button"
                        onClick={() => navigate("activity")}
                      >
                        Toda la actividad
                        <ArrowUpRight size={15} />
                      </button>
                    </div>
                    {activity.length ? (
                      <EntryList
                        entries={activity.slice(0, 4)}
                        projectName={projectName}
                      />
                    ) : (
                      <Empty
                        icon={<Activity />}
                        title="Aquí aparecerá tu actividad"
                      >
                        Registra un avance desde la consola o desde Codex.
                      </Empty>
                    )}
                  </section>
                </>
              )}
              {view === "projects" && (
                <>
                  <div className="section-toolbar">
                    <span>{projects.length} proyectos en tu espacio</span>
                    <label className="search-box">
                      <Search size={17} />
                      <input
                        aria-label="Buscar proyectos"
                        placeholder="Buscar proyecto…"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                      />
                    </label>
                  </div>
                  {filtered.length ? (
                    <div className="project-grid">
                      {filtered.map((p) => (
                        <ProjectCard
                          key={p.id}
                          project={p}
                          onClick={() => void openProject(p)}
                        />
                      ))}
                    </div>
                  ) : (
                    <section className="panel">
                      <Empty
                        title={
                          query
                            ? "No encontramos ese proyecto"
                            : "Crea tu primer proyecto"
                        }
                        action={
                          !query && (
                            <Button
                              onClick={() => setDialog({ type: "project" })}
                            >
                              <Plus size={16} />
                              Nuevo proyecto
                            </Button>
                          )
                        }
                      >
                        {query
                          ? "Prueba con otro nombre o identificador."
                          : "Define su nombre y después agrega el contexto que quieres compartir."}
                      </Empty>
                    </section>
                  )}
                </>
              )}
              {view === "connections" && (
                <>
                  <div className="connection-guide">
                    <div className="guide-icon">
                      <Terminal size={25} />
                    </div>
                    <div>
                      <span className="eyebrow">CODEX + JETBRAINS</span>
                      <h2>Configúralo una vez en cada equipo.</h2>
                      <p>
                        Agrega el servidor en{" "}
                        <strong>
                          AI Assistant → Model Context Protocol (MCP)
                        </strong>{" "}
                        y activa{" "}
                        <strong>Agents → Pass custom MCP servers</strong>.
                      </p>
                    </div>
                    <span className="guide-step">01 / 02</span>
                  </div>
                  <section className="panel">
                    <div className="panel-heading">
                      <div>
                        <h2>
                          Credenciales de conexión
                          <span className="count-pill">{tokens.length}</span>
                        </h2>
                        <p>
                          El secreto se muestra una sola vez al crear el token.
                        </p>
                      </div>
                      <ShieldCheck size={19} />
                    </div>
                    {tokens.length ? (
                      <div className="table-scroll">
                        <table>
                          <thead>
                            <tr>
                              <th>ENTORNO / TOKEN</th>
                              <th>PROYECTO</th>
                              <th>PERMISOS</th>
                              <th>ÚLTIMO USO</th>
                              <th>ESTADO</th>
                              <th>
                                <span className="sr-only">Acciones</span>
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {tokens.map((t) => (
                              <tr key={t.id}>
                                <td>
                                  <div className="token-name">
                                    <span className="table-icon">
                                      <KeyRound size={16} />
                                    </span>
                                    <span>
                                      <strong>{t.name}</strong>
                                      <small>{t.prefix}••••••</small>
                                    </span>
                                  </div>
                                </td>
                                <td>{projectName(t.projectId)}</td>
                                <td>
                                  <span className="subtle-badge">
                                    {t.permission === "WRITE"
                                      ? "Lectura y escritura"
                                      : "Solo lectura"}
                                  </span>
                                </td>
                                <td>
                                  {t.lastUsedAt
                                    ? relative(t.lastUsedAt)
                                    : "Sin uso todavía"}
                                </td>
                                <td>
                                  <span
                                    className={
                                      "state-badge " +
                                      (tokenActive(t) ? "on" : "off")
                                    }
                                  >
                                    <span />
                                    {t.revokedAt
                                      ? "Revocado"
                                      : tokenActive(t)
                                        ? "Vigente"
                                        : "Vencido"}
                                  </span>
                                </td>
                                <td>
                                  {!t.revokedAt && (
                                    <button
                                      className="icon-button danger"
                                      aria-label={`Revocar ${t.name}`}
                                      onClick={async () => {
                                        if (
                                          !window.confirm(
                                            `¿Revocar el token «${t.name}»? Ese entorno perderá acceso.`,
                                          )
                                        )
                                          return;
                                        try {
                                          await api(`/tokens/${t.id}`, {
                                            method: "DELETE",
                                          });
                                          await refresh();
                                          notify("Token revocado.");
                                        } catch (e) {
                                          setError(message(e));
                                        }
                                      }}
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <Empty
                        icon={<KeyRound />}
                        title="Conecta tu primer entorno"
                        action={
                          <Button
                            secondary
                            disabled={!projects.length}
                            onClick={() => setDialog({ type: "token" })}
                          >
                            <Plus size={16} />
                            Crear token
                          </Button>
                        }
                      >
                        {projects.length
                          ? "Genera una credencial para tu computadora y otra para el segundo entorno."
                          : "Primero crea un proyecto para asignarle una conexión."}
                      </Empty>
                    )}
                  </section>
                  <div className="integration-notes">
                    <div>
                      <ShieldCheck size={20} />
                      <h3>Acceso limitado al proyecto</h3>
                      <p>
                        Cada token consulta únicamente el proyecto asignado.
                        Puedes revocarlo en cualquier momento.
                      </p>
                    </div>
                    <div>
                      <GitBranch size={20} />
                      <h3>Contexto con versión</h3>
                      <p>
                        Codex registra rama, commit y revisión para que cada
                        avance tenga una referencia clara.
                      </p>
                    </div>
                    <div>
                      <FileText size={20} />
                      <h3>Instrucciones compartidas</h3>
                      <p>
                        Incluye el AGENTS.md de ejemplo en tu repositorio para
                        orientar la lectura y escritura de contexto.
                      </p>
                    </div>
                  </div>
                </>
              )}
              {view === "activity" && (
                <section className="panel">
                  <div className="panel-heading">
                    <div>
                      <h2>Últimos registros</h2>
                      <p>
                        Hasta 30 cambios recientes. El historial completo está
                        dentro de cada proyecto.
                      </p>
                    </div>
                    <label className="search-box">
                      <Search size={17} />
                      <input
                        aria-label="Buscar actividad"
                        placeholder="Buscar en actividad…"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                      />
                    </label>
                  </div>
                  <EntryList
                    entries={visibleActivity}
                    projectName={projectName}
                  />
                </section>
              )}
            </>
          )}
          {selected && error && (
            <div className="banner-error" role="alert">
              {error}
            </div>
          )}
          {detailLoading && (
            <div className="loading-overlay">
              <span className="spinner" />
              Cargando contexto…
            </div>
          )}
          <footer className="main-footer">
            <span>
              Context Bridge<span className="footer-dot">·</span>Memoria que
              conecta tu trabajo.
            </span>
            <span>MCP / Streamable HTTP</span>
          </footer>
        </main>
      </div>
      {toast && (
        <div role="status" className="toast">
          <CheckCheck size={18} />
          {toast}
        </div>
      )}
      {dialog && (
        <EditorDialog
          state={dialog}
          projects={projects}
          close={() => setDialog(null)}
          copy={copy}
          saved={async (text, project) => {
            await refresh();
            if (project) await openProject(project);
            notify(text);
          }}
          reveal={(secret, name) => setDialog({ type: "secret", secret, name })}
        />
      )}
    </div>
  );
}
function Stat({
  label,
  value,
  icon,
  caption,
}: {
  label: string;
  value: string | number;
  icon: ReactNode;
  caption: string;
}) {
  return (
    <section className="stat-card">
      <div>
        <span>{label}</span>
        <span className="stat-icon">{icon}</span>
      </div>
      <strong className={typeof value === "string" ? "stat-text" : ""}>
        {value}
      </strong>
      <p>{caption}</p>
    </section>
  );
}
function ProjectCard({
  project: p,
  onClick,
  compact = false,
}: {
  project: Project;
  onClick: () => void;
  compact?: boolean;
}) {
  return (
    <button
      className={"project-card " + (compact ? "compact" : "")}
      onClick={onClick}
    >
      <span className="project-icon">
        <FolderGit2 size={21} />
      </span>
      <div className="project-card-body">
        <h3>
          {p.name}
          <ArrowUpRight size={16} />
        </h3>
        <p>{p.description || "Un espacio para el contexto de tu proyecto."}</p>
        <div className="project-card-meta">
          <span>{p.slug}</span>
          <span>rev. {p.revision}</span>
        </div>
      </div>
      {!compact && (
        <div className="project-card-footer">
          <span>
            <Clock3 size={13} />
            {relative(p.updatedAt)}
          </span>
          <span>
            Abrir proyecto
            <ArrowRight size={14} />
          </span>
        </div>
      )}
    </button>
  );
}
function EntryList({
  entries,
  projectName,
}: {
  entries: Entry[];
  projectName?: (id: string) => string;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  if (!entries.length)
    return (
      <Empty icon={<FileText />} title="Aún no hay registros">
        Los avances y decisiones aparecerán aquí cuando se guarden.
      </Empty>
    );
  return (
    <div className="entry-list">
      {entries.map((e) => (
        <article
          className={"entry " + (expanded === e.id ? "expanded" : "")}
          key={e.id}
        >
          <div className={"entry-icon " + e.kind.toLowerCase()}>
            {e.kind === "DECISION" ? (
              <GitBranch size={17} />
            ) : e.kind === "NOTE" ? (
              <FileText size={17} />
            ) : (
              <CheckCheck size={17} />
            )}
          </div>
          <div className="entry-body">
            <button
              className="entry-title"
              aria-expanded={expanded === e.id}
              onClick={() => setExpanded(expanded === e.id ? null : e.id)}
            >
              {e.title}
              <ChevronRight size={15} />
            </button>
            <div className="entry-meta">
              {projectName && <strong>{projectName(e.projectId)}</strong>}
              <span>{labels[e.kind]}</span>
              {e.environment && (
                <span>
                  <Monitor size={12} />
                  {e.environment}
                </span>
              )}
              {e.branch && (
                <span>
                  <GitBranch size={12} />
                  {e.branch}
                </span>
              )}
              <span>rev. {e.revision}</span>
            </div>
            {expanded === e.id && (
              <div className="entry-expanded">
                <p>{e.content}</p>
                <small>
                  Autor: {e.author}
                  {e.gitCommit && ` · Commit: ${e.gitCommit}`} ·{" "}
                  {date(e.createdAt)}
                </small>
              </div>
            )}
          </div>
          <time dateTime={e.createdAt}>{relative(e.createdAt)}</time>
        </article>
      ))}
    </div>
  );
}
function EditorDialog({
  state,
  projects,
  close,
  saved,
  reveal,
  copy,
}: {
  state: NonNullable<DialogState>;
  projects: Project[];
  close: () => void;
  saved: (message: string, project?: Project) => Promise<void>;
  reveal: (secret: string, name: string) => void;
  copy: (value: string) => Promise<void>;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const editing = state.type === "project" ? state.project : undefined;
  const [name, setName] = useState(editing?.name ?? ""),
    [slug, setSlug] = useState(editing?.slug ?? ""),
    [description, setDescription] = useState(editing?.description ?? ""),
    [repo, setRepo] = useState(editing?.repositoryUrl ?? ""),
    [summary, setSummary] = useState(editing?.summary ?? "");
  const [kind, setKind] = useState("CHECKPOINT"),
    [content, setContent] = useState(""),
    [environment, setEnvironment] = useState("consola"),
    [branch, setBranch] = useState(""),
    [commit, setCommit] = useState("");
  const [projectId, setProjectId] = useState(projects[0]?.id ?? ""),
    [permission, setPermission] = useState("WRITE"),
    [days, setDays] = useState(90),
    [currentPassword, setCurrentPassword] = useState(""),
    [newPassword, setNewPassword] = useState("");
  const requestId = useRef(newRequestId());
  const titles = {
    project: editing ? "Editar proyecto" : "Nuevo proyecto",
    entry: "Registrar un avance",
    token: "Nueva conexión MCP",
    secret: "Tu conexión está lista",
    password: "Cambiar contraseña",
  };
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (state.type === "project") {
        const p = editing
          ? await api<Project>(`/projects/${editing.id}`, {
              method: "PUT",
              body: json({
                name,
                description,
                repositoryUrl: repo,
                summary,
                expectedRevision: editing.revision,
              }),
            })
          : await api<Project>("/projects", {
              method: "POST",
              body: json({ name, slug, description, repositoryUrl: repo }),
            });
        await saved(editing ? "Contexto actualizado." : "Proyecto creado.", p);
        close();
      } else if (state.type === "entry") {
        await api(`/projects/${state.project.id}/entries`, {
          method: "POST",
          body: json({
            kind,
            title: name,
            content,
            environment,
            branch,
            gitCommit: commit,
            expectedRevision: state.project.revision,
            requestId: requestId.current,
          }),
        });
        await saved(
          "Avance guardado en el contexto compartido.",
          state.project,
        );
        close();
      } else if (state.type === "token") {
        const result = await api<{ secret: string }>("/tokens", {
          method: "POST",
          body: json({ projectId, name, permission, expiresInDays: days }),
        });
        await saved("Conexión creada. Guarda el token.");
        reveal(result.secret, name);
      } else if (state.type === "password") {
        await api("/auth/password", {
          method: "POST",
          body: json({ currentPassword, newPassword }),
        });
        await saved("Contraseña actualizada.");
        close();
      }
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  const config =
    state.type === "secret"
      ? JSON.stringify(
          {
            mcpServers: {
              "context-bridge": {
                type: "streamable-http",
                url: location.origin + "/mcp",
                headers: { Authorization: `Bearer ${state.secret}` },
              },
            },
          },
          null,
          2,
        )
      : "";
  return (
    <Modal
      title={titles[state.type]}
      subtitle={
        state.type === "token"
          ? "Una credencial independiente para cada equipo."
          : state.type === "entry"
            ? "Documenta lo que el próximo entorno necesita saber."
            : undefined
      }
      onClose={close}
    >
      {state.type === "secret" ? (
        <div className="secret-body">
          <div className="success-note">
            <ShieldCheck size={19} />
            <span>
              Token creado para <strong>{state.name}</strong>. Se mostrará solo
              esta vez.
            </span>
          </div>
          <Field label="Token de acceso">
            <div className="copy-field">
              <input
                readOnly
                value={state.secret}
                aria-label="Token de acceso"
              />
              <button
                className="icon-button"
                aria-label="Copiar token"
                onClick={() => void copy(state.secret)}
              >
                <Clipboard size={17} />
              </button>
            </div>
          </Field>
          <Field label="Configuración para JetBrains">
            <textarea
              className="config-code"
              readOnly
              rows={13}
              value={config}
            />
          </Field>
          <p className="muted small">
            Si el servidor es remoto, reemplaza la URL por su dirección HTTPS
            accesible desde ambos equipos.
          </p>
          <div className="modal-actions">
            <Button secondary onClick={() => void copy(config)}>
              <Clipboard size={16} />
              Copiar configuración
            </Button>
            <Button onClick={close}>
              Ya lo guardé
              <Check size={16} />
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={submit} className="editor-form">
          {state.type === "project" && (
            <>
              <Field label="Nombre del proyecto">
                <input
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (!editing)
                      setSlug(
                        e.target.value
                          .toLowerCase()
                          .normalize("NFD")
                          .replace(/[\u0300-\u036f]/g, "")
                          .replace(/[^a-z0-9]+/g, "-")
                          .replace(/^-|-$/g, ""),
                      );
                  }}
                  placeholder="Mi proyecto"
                  required
                  maxLength={120}
                />
              </Field>
              {!editing && (
                <Field
                  label="Identificador"
                  hint="Minúsculas, números y guiones. Debe ser único."
                >
                  <input
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    placeholder="mi-proyecto"
                    required
                    pattern="[a-z0-9]+(-[a-z0-9]+)*"
                    maxLength={80}
                  />
                </Field>
              )}
              <Field label="Descripción">
                <input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="¿Qué estamos construyendo?"
                  maxLength={1000}
                />
              </Field>
              <Field label="Repositorio (opcional)">
                <input
                  value={repo}
                  onChange={(e) => setRepo(e.target.value)}
                  placeholder="https://github.com/organizacion/proyecto"
                  maxLength={500}
                />
              </Field>
              {editing && (
                <Field
                  label="Contexto vigente"
                  hint="Arquitectura, convenciones, objetivos y restricciones del proyecto."
                >
                  <textarea
                    rows={9}
                    value={summary}
                    onChange={(e) => setSummary(e.target.value)}
                    maxLength={30000}
                  />
                </Field>
              )}
            </>
          )}
          {state.type === "entry" && (
            <>
              <div className="form-row">
                <Field label="Tipo de registro">
                  <select
                    value={kind}
                    onChange={(e) => setKind(e.target.value)}
                  >
                    <option value="CHECKPOINT">Avance</option>
                    <option value="DECISION">Decisión</option>
                    <option value="NOTE">Nota</option>
                  </select>
                </Field>
                <Field label="Entorno">
                  <input
                    value={environment}
                    onChange={(e) => setEnvironment(e.target.value)}
                    placeholder="macbook / escritorio"
                    maxLength={100}
                  />
                </Field>
              </div>
              <Field label="Título">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Un resumen breve del cambio"
                  required
                  maxLength={160}
                />
              </Field>
              <Field
                label="Detalle"
                hint="Incluye trabajo completado, pruebas y próximos pasos. No guardes contraseñas ni secretos."
              >
                <textarea
                  rows={8}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  required
                  maxLength={30000}
                />
              </Field>
              <div className="form-row">
                <Field label="Rama de Git">
                  <input
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    placeholder="feature/mi-cambio"
                    maxLength={200}
                  />
                </Field>
                <Field label="Commit">
                  <input
                    value={commit}
                    onChange={(e) => setCommit(e.target.value)}
                    placeholder="Hash del commit (opcional)"
                    maxLength={64}
                  />
                </Field>
              </div>
              <div className="revision-note">
                <GitBranch size={14} />
                Se guardará sobre la revisión {state.project.revision}.
              </div>
            </>
          )}
          {state.type === "token" && (
            <>
              <Field label="Nombre del entorno">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="MacBook · IntelliJ"
                  required
                  maxLength={100}
                />
              </Field>
              <Field label="Proyecto">
                <select
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  required
                >
                  {projects.map((p) => (
                    <option value={p.id} key={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </Field>
              <div className="form-row">
                <Field label="Permisos">
                  <select
                    value={permission}
                    onChange={(e) => setPermission(e.target.value)}
                  >
                    <option value="WRITE">Lectura y escritura</option>
                    <option value="READ">Solo lectura</option>
                  </select>
                </Field>
                <Field label="Vigencia">
                  <select
                    value={days}
                    onChange={(e) => setDays(Number(e.target.value))}
                  >
                    <option value={30}>30 días</option>
                    <option value={90}>90 días</option>
                    <option value={365}>365 días</option>
                  </select>
                </Field>
              </div>
              <div className="revision-note">
                <ShieldCheck size={16} />
                El token solo tendrá acceso a este proyecto.
              </div>
            </>
          )}
          {state.type === "password" && (
            <>
              <Field label="Contraseña actual">
                <input
                  type="password"
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  maxLength={72}
                />
              </Field>
              <Field
                label="Nueva contraseña"
                hint="Al menos 16 caracteres; máximo 72 bytes UTF-8."
              >
                <input
                  type="password"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  minLength={16}
                  maxLength={72}
                  required
                />
              </Field>
            </>
          )}
          {error && (
            <div className="form-error" role="alert">
              {error}
              {error.includes("otro entorno") && (
                <p>
                  Cierra este formulario y actualiza el proyecto. Conserva tu
                  texto antes de hacerlo.
                </p>
              )}
            </div>
          )}
          <div className="modal-actions">
            <Button secondary onClick={close}>
              Cancelar
            </Button>
            <Button type="submit" disabled={busy}>
              {busy
                ? "Guardando…"
                : state.type === "token"
                  ? "Generar token"
                  : "Guardar"}
              {!busy && <ArrowRight size={16} />}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
