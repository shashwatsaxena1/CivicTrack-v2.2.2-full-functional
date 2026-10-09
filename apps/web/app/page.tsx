'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import type {
  ChangeEvent,
  ReactNode,
} from 'react';

type Role =
  | 'CITIZEN'
  | 'CONTRACTOR'
  | 'GOVERNMENT'
  | 'ADMIN';

type View =
  | 'Dashboard'
  | 'Projects'
  | 'Map'
  | 'Complaints'
  | 'Evidence'
  | 'Notifications'
  | 'Admin';

type ProtectedAction =
  | 'complaint'
  | 'evidence'
  | 'comment';

type ModalType =
  | 'complaint'
  | 'evidence'
  | 'project'
  | 'account'
  | 'comment'
  | null;

type User = {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: string;
  created_at: string;
};

type Project = {
  id: string;
  project_code: string;
  name: string;
  description: string;
  status: string;
  visibility: string;
  budget: number | null;
  latitude: number | null;
  longitude: number | null;
  contractor_name: string | null;
  contractor_user_id?: string | null;
  start_date: string | null;
  expected_completion_date: string | null;
  created_at: string;
  updated_at: string;
  distance_m?: number;
};

type Complaint = {
  id: string;
  issue_code: string;
  project_id: string | null;
  project_name?: string | null;
  title: string;
  description: string;
  severity: string;
  status: string;
  support_count: number;
  resolution_note?: string | null;
  created_at: string;
  updated_at: string;
};

type Evidence = {
  id: string;
  project_id: string | null;
  project_name?: string | null;
  file_name: string;
  mime_type: string;
  sha256: string;
  latitude: number | null;
  longitude: number | null;
  captured_at: string;
  source: string;
  status: string;
  notes: string;
  created_at: string;
  object_key?: string;
};

type Notice = {
  id: string;
  title: string;
  body: string;
  type: string;
  read_at?: string | null;
  created_at: string;
};

type Comment = {
  id: string;
  project_id: string;
  author_name: string | null;
  body: string;
  created_at: string;
};

type Audit = {
  id: string;
  actor_name?: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: any;
  created_at: string;
};

const API =
  process.env.NEXT_PUBLIC_API_URL ??
  'http://localhost:4000';

const nav: {
  label: View;
  icon: string;
}[] = [
  {
    label: 'Dashboard',
    icon: 'grid',
  },
  {
    label: 'Projects',
    icon: 'folder',
  },
  {
    label: 'Map',
    icon: 'map',
  },
  {
    label: 'Complaints',
    icon: 'alert',
  },
  {
    label: 'Evidence',
    icon: 'camera',
  },
  {
    label: 'Notifications',
    icon: 'bell',
  },
];

function Icon({
  name,
  size = 18,
}: {
  name: string;
  size?: number;
}) {
  const p: Record<string, ReactNode> = {
    grid: (
      <>
        <rect
          x="3"
          y="3"
          width="7"
          height="7"
          rx="1"
        />
        <rect
          x="14"
          y="3"
          width="7"
          height="7"
          rx="1"
        />
        <rect
          x="3"
          y="14"
          width="7"
          height="7"
          rx="1"
        />
        <rect
          x="14"
          y="14"
          width="7"
          height="7"
          rx="1"
        />
      </>
    ),

    map: (
      <>
        <path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Z" />
        <path d="M9 3v15M15 6v15" />
      </>
    ),

    folder: (
      <path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H10l2 2h6.5A2.5 2.5 0 0 1 21 9.5v7A2.5 2.5 0 0 1 18.5 19h-13A2.5 2.5 0 0 1 3 16.5v-9Z" />
    ),

    alert: (
      <>
        <path d="M10.3 3.6 2.2 18a2 2 0 0 0 1.7 3h16.2a2 2 0 0 0 1.7-3L13.7 3.6a2 2 0 0 0-3.4 0Z" />
        <path d="M12 8v5M12 17h.01" />
      </>
    ),

    bell: (
      <>
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />
      </>
    ),

    shield: (
      <>
        <path d="M12 3 20 6v6c0 5-3.4 8.5-8 10-4.6-1.5-8-5-8-10V6l8-3Z" />
        <path d="m9 12 2 2 4-5" />
      </>
    ),

    search: (
      <>
        <circle
          cx="10.5"
          cy="10.5"
          r="6.5"
        />
        <path d="m16 16 5 5" />
      </>
    ),

    plus: (
      <>
        <path d="M12 5v14M5 12h14" />
      </>
    ),

    camera: (
      <>
        <path d="M4 7h3l1.5-2h7L17 7h3v11H4V7Z" />
        <circle
          cx="12"
          cy="12.5"
          r="3.2"
        />
      </>
    ),

    clock: (
      <>
        <circle
          cx="12"
          cy="12"
          r="8.5"
        />
        <path d="M12 7v5l3 2" />
      </>
    ),

    activity: (
      <path d="M3 12h4l2-6 4 12 2-6h6" />
    ),

    users: (
      <>
        <circle
          cx="9"
          cy="8"
          r="3"
        />
        <path d="M3 19c.7-3 2.7-4.5 6-4.5s5.3 1.5 6 4.5" />
        <circle
          cx="17"
          cy="9"
          r="2.5"
        />
      </>
    ),

    close: (
      <>
        <path d="m6 6 12 12M18 6 6 18" />
      </>
    ),

    chevron: (
      <path d="m9 18 6-6-6-6" />
    ),

    check: (
      <path d="m5 12 4 4L19 6" />
    ),

    locate: (
      <>
        <circle
          cx="12"
          cy="12"
          r="3"
        />
        <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
      </>
    ),

    download: (
      <>
        <path d="M12 3v12M7 10l5 5 5-5M4 21h16" />
      </>
    ),

    refresh: (
      <>
        <path d="M20 11a8 8 0 0 0-14-4L3 10M4 13a8 8 0 0 0 14 4l3-3" />
      </>
    ),

    upload: (
      <>
        <path d="M12 16V4M7 9l5-5 5 5M5 20h14" />
      </>
    ),

    lock: (
      <>
        <rect
          x="5"
          y="10"
          width="14"
          height="10"
          rx="2"
        />
        <path d="M8 10V7a4 4 0 0 1 8 0v3" />
      </>
    ),

    menu: (
      <>
        <path d="M4 7h16M4 12h16M4 17h16" />
      </>
    ),

    users2: (
      <>
        <circle
          cx="8"
          cy="8"
          r="3"
        />
        <circle
          cx="16"
          cy="8"
          r="3"
        />
        <path d="M2.5 20c.7-3.4 2.7-5 5.5-5s4.8 1.6 5.5 5M10.5 20c.7-3.4 2.7-5 5.5-5s4.8 1.6 5.5 5" />
      </>
    ),
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {p[name] ?? p.activity}
    </svg>
  );
}

/* ---------------------------------------------------------
   API
--------------------------------------------------------- */

async function api<T>(
  path: string,
  options: RequestInit = {},
  retry = true
): Promise<T> {
  const isForm =
    options.body instanceof FormData;

  const headers = new Headers(options.headers);

  if (!isForm) {
    headers.set(
      'Content-Type',
      'application/json'
    );
  }

  const response = await fetch(
    `${API}${path}`,
    {
      ...options,
      headers,
      credentials: 'include',
      cache: 'no-store',
    }
  );

  /*
    Do not retry authentication endpoints.
    A failed login should return the real backend
    error to the user.
  */
  if (
    response.status === 401 &&
    retry &&
    path !== '/auth/login' &&
    path !== '/auth/register' &&
    path !== '/auth/refresh'
  ) {
    const refresh = await fetch(
      `${API}/auth/refresh`,
      {
        method: 'POST',
        credentials: 'include',
      }
    );

    if (refresh.ok) {
      return api<T>(
        path,
        options,
        false
      );
    }
  }

  const data = await response
    .json()
    .catch(() => ({}));

  if (!response.ok) {
    const message =
      data?.error ||
      data?.message ||
      data?.detail ||
      `Request failed (${response.status})`;

    throw new Error(message);
  }

  return data as T;
}

function money(
  value: number | null
) {
  if (value == null) {
    return '—';
  }

  return `₹${Number(value).toLocaleString(
    'en-IN'
  )}`;
}

function date(value: string) {
  const d = new Date(value);

  if (Number.isNaN(d.getTime())) {
    return '—';
  }

  return d.toLocaleDateString(
    'en-IN',
    {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }
  );
}

function statusClass(value: string) {
  return value
    .toLowerCase()
    .replaceAll('_', '-');
}

/* ---------------------------------------------------------
   MAIN APP
--------------------------------------------------------- */

export default function Home() {
  const guest: User = {
    id: 'guest',
    name: 'Public visitor',
    email: '',
    role: 'CITIZEN',
    status: 'PUBLIC',
    created_at:
      new Date(0).toISOString(),
  };

  const [user, setUser] =
    useState<User | null>(null);

  const [authLoading, setAuthLoading] =
    useState(true);

  const [view, setView] =
    useState<View>('Dashboard');

  const [mobile, setMobile] =
    useState(false);

  const [query, setQuery] =
    useState('');

  const [toast, setToast] =
    useState('');

  const [modal, setModal] =
    useState<ModalType>(null);

  const [selected, setSelected] =
    useState<Project | null>(null);

  const [authOpen, setAuthOpen] =
    useState(false);

  const [pending, setPending] =
    useState<ProtectedAction | null>(
      null
    );

  const [apiState, setApiState] =
    useState<
      'checking' | 'online' | 'offline'
    >('checking');

  const [location, setLocation] =
    useState<{
      lat: number;
      lon: number;
    } | null>(null);

  const [locationAsked, setLocationAsked] =
    useState(false);

  const [projects, setProjects] =
    useState<Project[]>([]);

  const [complaints, setComplaints] =
    useState<Complaint[]>([]);

  const [evidence, setEvidence] =
    useState<Evidence[]>([]);

  const [notices, setNotices] =
    useState<Notice[]>([]);

  const [users, setUsers] =
    useState<User[]>([]);

  const [audit, setAudit] =
    useState<Audit[]>([]);

  const [refreshing, setRefreshing] =
    useState(false);

  const activeUser =
    user ?? guest;

  const notify = useCallback(
    (message: string) => {
      setToast(message);

      window.setTimeout(() => {
        setToast('');
      }, 3200);
    },
    []
  );

  /*
    Authentication is requested only when
    a protected action is attempted.
  */
  const requireAuth = useCallback(
    (
      action: ProtectedAction
    ) => {
      if (user) {
        return true;
      }

      setPending(action);
      setAuthOpen(true);

      return false;
    },
    [user]
  );

  /*
    Load only real API records.
    There is intentionally NO fallback/demo data.
  */
  const load = useCallback(
    async () => {
      setRefreshing(true);

      try {
        const health =
          await fetch(
            `${API}/health`,
            {
              cache: 'no-store',
            }
          );

        if (!health.ok) {
          throw new Error(
            'Backend health check failed'
          );
        }

        setApiState('online');

        /*
          Public users only see the public/nearby
          endpoint. Government/Admin can use all.
        */
        const projectPath =
          user?.role === 'GOVERNMENT' ||
          user?.role === 'ADMIN'
            ? '/projects/all'
            : location
              ? `/projects/nearby?lat=${encodeURIComponent(
                  location.lat
                )}&lon=${encodeURIComponent(
                  location.lon
                )}&radius=10`
              : '/projects/public';

        const [
          projectResponse,
          complaintResponse,
          evidenceResponse,
        ] = await Promise.all([
          api<{ data: Project[] }>(
            projectPath
          ),

          api<{ data: Complaint[] }>(
            '/complaints'
          ),

          api<{ data: Evidence[] }>(
            '/evidence'
          ),
        ]);

        setProjects(
          Array.isArray(
            projectResponse.data
          )
            ? projectResponse.data
            : []
        );

        setComplaints(
          Array.isArray(
            complaintResponse.data
          )
            ? complaintResponse.data
            : []
        );

        setEvidence(
          Array.isArray(
            evidenceResponse.data
          )
            ? evidenceResponse.data
            : []
        );

        if (user) {
          try {
            const n =
              await api<{
                data: Notice[];
              }>(
                '/notifications'
              );

            setNotices(
              Array.isArray(n.data)
                ? n.data
                : []
            );
          } catch {
            setNotices([]);
          }
        } else {
          setNotices([]);
        }
      } catch (error) {
        console.error(
          'CivicTrack load error:',
          error
        );

        setApiState('offline');
      } finally {
        setRefreshing(false);
      }
    },
    [location, user]
  );

  /*
    Restore existing session.
  */
  useEffect(() => {
    let cancelled = false;

    async function restoreSession() {
      try {
        let response =
          await fetch(
            `${API}/auth/me`,
            {
              credentials: 'include',
              cache: 'no-store',
            }
          );

        if (!response.ok) {
          const refresh =
            await fetch(
              `${API}/auth/refresh`,
              {
                method: 'POST',
                credentials: 'include',
              }
            );

          if (refresh.ok) {
            response =
              await fetch(
                `${API}/auth/me`,
                {
                  credentials: 'include',
                  cache: 'no-store',
                }
              );
          }
        }

        if (
          response.ok &&
          !cancelled
        ) {
          const data =
            await response.json();

          if (data?.user) {
            setUser(data.user);
          }
        }
      } catch (error) {
        console.error(
          'Session restore failed:',
          error
        );
      } finally {
        if (!cancelled) {
          setAuthLoading(false);
        }
      }
    }

    restoreSession();

    return () => {
      cancelled = true;
    };
  }, []);

  /*
    Initial / subsequent data loading.
  */
  useEffect(() => {
    if (!authLoading) {
      load();
    }
  }, [
    authLoading,
    load,
  ]);

  /*
    Admin data.
  */
  useEffect(() => {
    if (
      user &&
      view === 'Admin' &&
      user.role === 'ADMIN'
    ) {
      Promise.all([
        api<{ data: User[] }>(
          '/admin/users'
        ),
        api<{ data: Audit[] }>(
          '/audit'
        ),
      ])
        .then(([u, a]) => {
          setUsers(
            Array.isArray(u.data)
              ? u.data
              : []
          );

          setAudit(
            Array.isArray(a.data)
              ? a.data
              : []
          );
        })
        .catch(error => {
          console.error(
            'Admin load failed:',
            error
          );
        });
    }
  }, [user, view]);

  /*
    Location preference.
  */
  useEffect(() => {
    const asked =
      localStorage.getItem(
        'ct_location_asked'
      );

    setLocationAsked(
      asked === '1'
    );
  }, []);

  /*
    Ctrl + K search.
  */
  useEffect(() => {
    function onKeyDown(
      event: KeyboardEvent
    ) {
      if (
        (event.ctrlKey ||
          event.metaKey) &&
        event.key.toLowerCase() ===
          'k'
      ) {
        event.preventDefault();

        const input =
          document.querySelector<HTMLInputElement>(
            '.searchbox input'
          );

        input?.focus();
      }

      if (event.key === 'Escape') {
        setAuthOpen(false);
        setModal(null);
        setSelected(null);
      }
    }

    window.addEventListener(
      'keydown',
      onKeyDown
    );

    return () =>
      window.removeEventListener(
        'keydown',
        onKeyDown
      );
  }, []);

  if (authLoading) {
    return (
      <div className="loading-screen">
        <div className="brand-mark">
          <Icon
            name="shield"
            size={19}
          />
        </div>

        <b>
          Starting CivicTrack…
        </b>

        <span>
          Connecting to the real API
        </span>
      </div>
    );
  }

  const filtered =
    projects.filter(
      project =>
        `${project.name} ${project.project_code} ${project.status} ${
          project.contractor_name ?? ''
        }`
          .toLowerCase()
          .includes(
            query.toLowerCase()
          )
    );

  const metrics = {
    public: projects.filter(
      p =>
        p.status === 'PUBLIC'
    ).length,

    active: projects.filter(
      p =>
        p.status === 'ACTIVE' ||
        p.status === 'ASSIGNED'
    ).length,

    completed:
      projects.filter(
        p =>
          p.status ===
          'COMPLETED'
      ).length,

    issues:
      complaints.filter(
        c =>
          c.status === 'OPEN' ||
          c.status ===
            'UNDER_REVIEW'
      ).length,

    evidence:
      evidence.length,
  };

  async function logout() {
    try {
      await api(
        '/auth/logout',
        {
          method: 'POST',
        }
      );
    } catch {
      // Session may already be expired.
    }

    setUser(null);
    setView('Dashboard');
    setNotices([]);
    notify('Signed out');
  }

  function askLocation() {
    if (
      !navigator.geolocation
    ) {
      notify(
        'Geolocation is not supported by this browser.'
      );

      return;
    }

    navigator.geolocation.getCurrentPosition(
      position => {
        const value = {
          lat:
            position.coords
              .latitude,

          lon:
            position.coords
              .longitude,
        };

        setLocation(value);

        localStorage.setItem(
          'ct_location_asked',
          '1'
        );

        setLocationAsked(true);

        notify(
          'Location enabled for nearby project search.'
        );
      },

      error => {
        console.error(
          'Location error:',
          error
        );

        localStorage.setItem(
          'ct_location_asked',
          '1'
        );

        setLocationAsked(true);

        notify(
          'Location permission was not granted.'
        );
      },

      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  }

  function protectedModal(
    action: ProtectedAction
  ) {
    if (
      requireAuth(action)
    ) {
      setModal(action);
    }
  }

  function handleAuth(
    authenticatedUser: User
  ) {
    setUser(
      authenticatedUser
    );

    setAuthOpen(false);

    const action = pending;

    setPending(null);

    if (
      action === 'complaint'
    ) {
      setModal('complaint');
    }

    if (
      action === 'evidence'
    ) {
      setModal('evidence');
    }

    if (
      action === 'comment'
    ) {
      setModal('comment');
    }

    notify(
      'Signed in. You can continue your action.'
    );
  }

  return (
    <div className="app-shell">
      <aside
        className={`sidebar ${
          mobile ? 'open' : ''
        }`}
      >
        <div className="brand">
          <div className="brand-mark">
            <Icon
              name="shield"
              size={19}
            />
          </div>

          <div>
            <strong>
              CivicTrack
            </strong>

            <span>
              Infrastructure transparency
            </span>
          </div>
        </div>

        <div className="workspace-label">
          PUBLIC WORKSPACE
        </div>

        <nav className="side-nav">
          {nav
            .filter(
              item =>
                item.label !==
                'Notifications'
            )
            .map(item => (
              <button
                key={item.label}
                className={
                  view === item.label
                    ? 'active'
                    : ''
                }
                onClick={() => {
                  setView(
                    item.label
                  );

                  setMobile(false);
                }}
              >
                <Icon
                  name={item.icon}
                />

                <span>
                  {item.label}
                </span>
              </button>
            ))}

          {user && (
            <button
              className={
                view ===
                'Notifications'
                  ? 'active'
                  : ''
              }
              onClick={() => {
                setView(
                  'Notifications'
                );

                setMobile(false);
              }}
            >
              <Icon name="bell" />

              <span>
                Notifications
              </span>

              {notices.filter(
                n => !n.read_at
              ).length >
                0 && (
                <b className="nav-badge">
                  {Math.min(
                    notices.filter(
                      n =>
                        !n.read_at
                    ).length,
                    9
                  )}
                </b>
              )}
            </button>
          )}

          {user?.role ===
            'ADMIN' && (
            <button
              className={
                view === 'Admin'
                  ? 'active'
                  : ''
              }
              onClick={() => {
                setView('Admin');
                setMobile(false);
              }}
            >
              <Icon name="users2" />

              <span>
                Admin console
              </span>
            </button>
          )}
        </nav>

        <div className="side-spacer" />

        <div className="trust-card">
          <Icon
            name="shield"
            size={17}
          />

          <div>
            <b>
              Real records only
            </b>

            <p>
              CivicTrack does not create
              demo civic records in the
              frontend.
            </p>
          </div>
        </div>

        {user && (
          <div className="profile-mini">
            <span className="avatar">
              {user.name[0]?.toUpperCase()}
            </span>

            <div>
              <b>{user.name}</b>

              <small>
                {user.role}
              </small>
            </div>

            <button
              onClick={logout}
              title="Sign out"
            >
              ↪
            </button>
          </div>
        )}
      </aside>

      <main className="main">
        <header className="topbar">
          <button
            className="mobile-menu"
            onClick={() =>
              setMobile(
                value => !value
              )
            }
          >
            <Icon name="menu" />
          </button>

          <div className="searchbox">
            <Icon
              name="search"
              size={17}
            />

            <input
              value={query}
              onChange={event =>
                setQuery(
                  event.target.value
                )
              }
              placeholder="Search real public projects, issue IDs, contractors…"
            />

            <kbd>
              Ctrl K
            </kbd>
          </div>

          <div className="top-actions">
            <button
              className={`api-pill ${apiState}`}
              onClick={load}
              disabled={refreshing}
            >
              <span />

              {apiState ===
                'online'
                ? 'API + DB live'
                : apiState ===
                    'offline'
                  ? 'Backend unavailable'
                  : 'Checking'}
            </button>

            {user && (
              <button
                className="icon-button"
                onClick={() =>
                  setView(
                    'Notifications'
                  )
                }
              >
                <Icon
                  name="bell"
                  size={19}
                />

                {notices.some(
                  n => !n.read_at
                ) && <i />}
              </button>
            )}

            <div className="identity">
              {user ? (
                <>
                  <span className="avatar">
                    {user.name[0]?.toUpperCase()}
                  </span>

                  <span>
                    <b>
                      {user.name}
                    </b>

                    <small>
                      {user.role}
                    </small>
                  </span>
                </>
              ) : (
                <span className="public-badge">
                  Public browsing
                </span>
              )}
            </div>
          </div>
        </header>

        {!locationAsked && (
          <div className="location-banner">
            <div>
              <b>
                Use your location for nearby projects
              </b>

              <span>
                Location is optional. CivicTrack
                never invents a location if permission
                is denied.
              </span>
            </div>

            <button
              className="primary"
              onClick={askLocation}
            >
              <Icon name="locate" />
              Enable location
            </button>

            <button
              className="ghost"
              onClick={() => {
                localStorage.setItem(
                  'ct_location_asked',
                  '1'
                );

                setLocationAsked(
                  true
                );
              }}
            >
              Not now
            </button>
          </div>
        )}

        <div className="page">
          {view ===
            'Dashboard' && (
            <Dashboard
              user={activeUser}
              authenticated={!!user}
              metrics={metrics}
              projects={projects}
              complaints={
                complaints
              }
              evidence={evidence}
              apiState={apiState}
              setView={setView}
              setModal={(value: any) => {
                if (
                  value ===
                    'complaint' ||
                  value ===
                    'evidence'
                ) {
                  protectedModal(
                    value
                  );
                } else {
                  setModal(value);
                }
              }}
              setSelected={
                setSelected
              }
              load={load}
            />
          )}

          {view ===
            'Projects' && (
            <Projects
              user={activeUser}
              projects={filtered}
              allProjects={
                projects
              }
              setSelected={
                setSelected
              }
              setModal={setModal}
              load={load}
            />
          )}

          {view === 'Map' && (
            <MapView
              projects={projects}
              location={location}
              setSelected={
                setSelected
              }
              askLocation={
                askLocation
              }
            />
          )}

          {view ===
            'Complaints' && (
            <Complaints
              user={activeUser}
              authenticated={!!user}
              complaints={
                complaints
              }
              projects={projects}
              setModal={(value: any) =>
                value ===
                'complaint'
                  ? protectedModal(
                      'complaint'
                    )
                  : setModal(value)
              }
              load={load}
              notify={notify}
              requireAuth={() =>
                requireAuth(
                  'complaint'
                )
              }
            />
          )}

          {view ===
            'Evidence' && (
            <EvidenceView
              evidence={evidence}
              setModal={() =>
                protectedModal(
                  'evidence'
                )
              }
              notify={notify}
            />
          )}

          {view ===
            'Notifications' &&
            user && (
              <Notifications
                notices={notices}
                load={load}
              />
            )}

          {view === 'Admin' &&
            user?.role ===
              'ADMIN' && (
              <Admin
                users={users}
                audit={audit}
                setModal={setModal}
                load={async () => {
                  const [
                    u,
                    a,
                  ] =
                    await Promise.all([
                      api<{
                        data: User[];
                      }>(
                        '/admin/users'
                      ),

                      api<{
                        data: Audit[];
                      }>(
                        '/audit'
                      ),
                    ]);

                  setUsers(
                    u.data ?? []
                  );

                  setAudit(
                    a.data ?? []
                  );
                }}
              />
            )}
        </div>
      </main>

      {selected && (
        <ProjectDrawer
          project={selected}
          user={activeUser}
          authenticated={!!user}
          onAuthRequired={() => {
            setPending(
              'comment'
            );

            setAuthOpen(true);
          }}
          onComment={() => {
            if (
              requireAuth(
                'comment'
              )
            ) {
              setModal(
                'comment'
              );
            }
          }}
          onComplaint={() => {
            if (
              requireAuth(
                'complaint'
              )
            ) {
              setModal(
                'complaint'
              );
            }
          }}
          onClose={() =>
            setSelected(null)
          }
          notify={notify}
          load={load}
        />
      )}

      {modal ===
        'complaint' &&
        user && (
          <ComplaintModal
            projects={projects}
            onClose={() =>
              setModal(null)
            }
            onSaved={() => {
              setModal(null);
              load();
              notify(
                'Complaint submitted'
              );
            }}
          />
        )}

      {modal ===
        'evidence' &&
        user && (
          <EvidenceModal
            projects={projects}
            onClose={() =>
              setModal(null)
            }
            onSaved={() => {
              setModal(null);
              load();
              notify(
                'Evidence submitted and verified by the API'
              );
            }}
          />
        )}

      {modal ===
        'comment' &&
        user &&
        selected && (
          <CommentModal
            project={selected}
            onClose={() =>
              setModal(null)
            }
            onSaved={() => {
              setModal(null);
              setSelected(null);
              load();

              notify(
                'Comment published'
              );
            }}
          />
        )}

      {modal ===
        'project' &&
        user && (
          <ProjectModal
            onClose={() =>
              setModal(null)
            }
            onSaved={() => {
              setModal(null);
              load();

              notify(
                'Project created'
              );
            }}
          />
        )}

      {modal ===
        'account' &&
        user && (
          <AccountModal
            onClose={() =>
              setModal(null)
            }
            onSaved={() => {
              setModal(null);

              load();

              notify(
                'Account created'
              );
            }}
          />
        )}

      {authOpen && (
        <AuthModal
          onClose={() =>
            setAuthOpen(false)
          }
          onAuth={handleAuth}
        />
      )}

      {toast && (
        <div className="toast">
          <Icon
            name="check"
            size={16}
          />

          {toast}
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------
   AUTH
--------------------------------------------------------- */

function AuthModal({
  onAuth,
  onClose,
}: {
  onAuth: (user: User) => void;
  onClose: () => void;
}) {
  const [mode, setMode] =
    useState<
      'login' | 'register'
    >('login');

  const [name, setName] =
    useState('');

  const [email, setEmail] =
    useState('');

  const [password, setPassword] =
    useState('');

  const [busy, setBusy] =
    useState(false);

  const [error, setError] =
    useState('');

  async function submit() {
    if (!email.trim()) {
      setError(
        'Email is required.'
      );

      return;
    }

    if (
      password.length < 8
    ) {
      setError(
        'Password must contain at least 8 characters.'
      );

      return;
    }

    if (
      mode === 'register' &&
      !name.trim()
    ) {
      setError(
        'Full name is required.'
      );

      return;
    }

    setBusy(true);
    setError('');

    try {
      const endpoint =
        mode === 'login'
          ? '/auth/login'
          : '/auth/register';

      const payload =
        mode === 'login'
          ? {
              email:
                email.trim(),
              password,
            }
          : {
              name: name.trim(),
              email:
                email.trim(),
              password,
            };

      const data =
        await api<{
          user: User;
        }>(
          endpoint,
          {
            method: 'POST',
            body: JSON.stringify(
              payload
            ),
          }
        );

      if (!data?.user) {
        throw new Error(
          'Authentication succeeded but the API did not return a user.'
        );
      }

      onAuth(data.user);
    } catch (error) {
      console.error(
        'Authentication error:',
        error
      );

      setError(
        error instanceof Error
          ? error.message
          : 'Authentication failed. Check the backend.'
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="modal-backdrop"
      onMouseDown={event => {
        if (
          event.currentTarget ===
          event.target
        ) {
          onClose();
        }
      }}
    >
      <div className="modal auth-modal">
        <div className="modal-head">
          <div>
            <span className="eyebrow">
              {mode ===
              'login'
                ? 'PROTECTED ACTION'
                : 'PUBLIC REGISTRATION'}
            </span>

            <h2>
              {mode ===
              'login'
                ? 'Sign in to continue'
                : 'Create your citizen account'}
            </h2>
          </div>

          <button
            className="icon-button"
            onClick={onClose}
          >
            <Icon name="close" />
          </button>
        </div>

        <p className="modal-copy">
          Projects, maps, public issues and
          public evidence remain browseable
          without an account. Authentication
          is requested only when you perform a
          protected action.
        </p>

        {mode ===
          'register' && (
          <label>
            Full name

            <input
              value={name}
              onChange={event =>
                setName(
                  event.target.value
                )
              }
              placeholder="Your name"
            />
          </label>
        )}

        <label>
          Email

          <input
            type="email"
            value={email}
            onChange={event =>
              setEmail(
                event.target.value
              )
            }
            placeholder="you@example.com"
            autoComplete="email"
          />
        </label>

        <label>
          Password

          <input
            type="password"
            value={password}
            onChange={event =>
              setPassword(
                event.target.value
              )
            }
            placeholder="Minimum 8 characters"
            autoComplete={
              mode ===
              'login'
                ? 'current-password'
                : 'new-password'
            }
            onKeyDown={event => {
              if (
                event.key ===
                'Enter'
              ) {
                submit();
              }
            }}
          />
        </label>

        {error && (
          <div className="form-error">
            {error}
          </div>
        )}

        <button
          className="primary wide"
          disabled={busy}
          onClick={submit}
        >
          {busy
            ? 'Connecting…'
            : mode === 'login'
              ? 'Sign in'
              : 'Create account'}
        </button>

        <button
          className="auth-switch"
          onClick={() => {
            setMode(
              mode === 'login'
                ? 'register'
                : 'login'
            );

            setError('');
          }}
        >
          {mode === 'login'
            ? "Don't have an account? Create one"
            : 'Already registered? Sign in'}
        </button>

        <small className="auth-note">
          <Icon
            name="lock"
            size={13}
          />

          No role selector is exposed.
          Public registration creates
          citizen access only.
        </small>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------
   DASHBOARD
--------------------------------------------------------- */

function Dashboard({
  user,
  authenticated,
  metrics,
  projects,
  complaints,
  evidence,
  apiState,
  setView,
  setModal,
  setSelected,
  load,
}: {
  user: User;
  authenticated: boolean;
  metrics: any;
  projects: Project[];
  complaints: Complaint[];
  evidence: Evidence[];
  apiState: string;
  setView: (v: View) => void;
  setModal: (m: any) => void;
  setSelected: (
    p: Project
  ) => void;
  load: () => void;
}) {
  return (
    <>
      <section className="hero hero-clean">
        <div className="hero-copy">
          <span className="eyebrow">
            <span className="live-dot" />
            LIVE CIVIC WORKSPACE
          </span>

          <h1>
            Infrastructure claims
            should leave an{' '}
            <em>
              evidence trail.
            </em>
          </h1>

          <p>
            Browse real public
            infrastructure records,
            inspect evidence and
            challenge what you see.
            Sign-in is requested only
            when a protected action
            requires it.
          </p>

          <div className="hero-actions">
            <button
              className="primary"
              onClick={() =>
                setView(
                  'Projects'
                )
              }
            >
              Explore projects
              <Icon
                name="chevron"
                size={15}
              />
            </button>

            <button
              className="ghost"
              onClick={() =>
                setModal(
                  'complaint'
                )
              }
            >
              <Icon name="plus" />
              Report issue
            </button>

            <button
              className="ghost"
              onClick={() =>
                setModal(
                  'evidence'
                )
              }
            >
              <Icon name="camera" />
              Capture evidence
            </button>
          </div>

          <div className="browse-note">
            <Icon
              name="shield"
              size={15}
            />

            <span>
              Public browsing does not
              require an account.
            </span>
          </div>
        </div>

        <div className="hero-status">
          <div
            className={`status-orb ${apiState}`}
          >
            <span />
          </div>

          <span className="eyebrow">
            SYSTEM STATUS
          </span>

          <h3>
            {apiState ===
            'online'
              ? 'API + database connected'
              : apiState ===
                  'offline'
                ? 'Backend unavailable'
                : 'Checking backend'}
          </h3>

          <p>
            {apiState ===
            'online'
              ? 'Live records are being read from CivicTrack.'
              : apiState ===
                  'offline'
                ? 'No frontend demo records are being used.'
                : 'Checking the CivicTrack API.'}
          </p>

          <button
            className="ghost wide"
            onClick={load}
          >
            <Icon name="refresh" />
            Refresh connection
          </button>
        </div>
      </section>

      <section className="metric-grid">
        <Metric
          label="Public projects"
          value={metrics.public}
          icon="folder"
        />

        <Metric
          label="Active work"
          value={metrics.active}
          icon="activity"
        />

        <Metric
          label="Completed"
          value={
            metrics.completed
          }
          icon="check"
        />

        <Metric
          label="Open issues"
          value={metrics.issues}
          icon="alert"
        />

        <Metric
          label="Evidence records"
          value={
            metrics.evidence
          }
          icon="camera"
        />
      </section>

      <section className="two-col">
        <div className="panel">
          <PanelHead
            eyebrow="LIVE REGISTRY"
            title="Recent public projects"
            action={
              <button
                className="icon-button small"
                onClick={load}
              >
                <Icon name="refresh" />
              </button>
            }
          />

          {projects
            .slice(0, 5)
            .map(project => (
              <button
                className="project-row"
                key={project.id}
                onClick={() =>
                  setSelected(
                    project
                  )
                }
              >
                <span className="project-symbol">
                  <Icon name="folder" />
                </span>

                <span>
                  <b>
                    {project.name}
                  </b>

                  <small>
                    {
                      project.project_code
                    }{' '}
                    ·{' '}
                    {project.contractor_name ||
                      'Contractor not assigned'}
                  </small>
                </span>

                <Status
                  value={
                    project.status
                  }
                />

                <Icon
                  name="chevron"
                  size={15}
                />
              </button>
            ))}

          {projects.length ===
            0 && (
            <Empty
              title="No project records returned"
              text="The API returned no project records. No demo records are being inserted."
            />
          )}
        </div>

        <div className="panel evidence-panel">
          <span className="eyebrow">
            EVIDENCE CENTER
          </span>

          <h2>
            Capture proof from the browser
          </h2>

          <p>
            Camera/image + GPS +
            timestamp + SHA-256 are
            submitted to the API.
          </p>

          <div className="proof-stack">
            <Proof
              icon="camera"
              title="Camera / image"
            />

            <Proof
              icon="locate"
              title="GPS coordinates"
            />

            <Proof
              icon="clock"
              title="Capture timestamp"
            />

            <Proof
              icon="shield"
              title="Server-verified SHA-256"
            />
          </div>

          <button
            className="primary wide"
            onClick={() =>
              setModal(
                'evidence'
              )
            }
          >
            <Icon name="camera" />
            Open capture studio
          </button>
        </div>
      </section>
    </>
  );
}

function Metric({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: string;
}) {
  return (
    <div className="metric">
      <div className="metric-icon">
        <Icon name={icon} />
      </div>

      <span>{label}</span>

      <strong>{value}</strong>
    </div>
  );
}

function Proof({
  icon,
  title,
}: {
  icon: string;
  title: string;
}) {
  return (
    <div>
      <Icon
        name={icon}
        size={16}
      />

      <span>{title}</span>
    </div>
  );
}

function PanelHead({
  eyebrow,
  title,
  action,
}: {
  eyebrow: string;
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="panel-head">
      <div>
        <span className="eyebrow">
          {eyebrow}
        </span>

        <h2>{title}</h2>
      </div>

      {action}
    </div>
  );
}

function Empty({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  return (
    <div className="empty">
      <div className="empty-icon">
        <Icon
          name="folder"
          size={22}
        />
      </div>

      <h3>{title}</h3>

      <p>{text}</p>
    </div>
  );
}

function Status({
  value,
}: {
  value: string;
}) {
  return (
    <span
      className={`status ${statusClass(
        value
      )}`}
    >
      {value.replaceAll(
        '_',
        ' '
      )}
    </span>
  );
}

/* ---------------------------------------------------------
   PROJECTS
--------------------------------------------------------- */

function Projects({
  user,
  projects,
  allProjects,
  setSelected,
  setModal,
  load,
}: {
  user: User;
  projects: Project[];
  allProjects: Project[];
  setSelected: (
    p: Project
  ) => void;
  setModal: (m: any) => void;
  load: () => void;
}) {
  const [filter, setFilter] =
    useState('ALL');

  const [mine, setMine] =
    useState(false);

  const [myProjects, setMyProjects] =
    useState<Project[]>([]);

  const visible =
    useMemo(() => {
      const source = mine
        ? myProjects
        : projects;

      return source.filter(
        project =>
          filter === 'ALL' ||
          project.status ===
            filter
      );
    }, [
      mine,
      myProjects,
      projects,
      filter,
    ]);

  async function loadMine() {
    try {
      const response =
        await api<{
          data: Project[];
        }>('/projects/mine');

      setMyProjects(
        response.data ?? []
      );

      setMine(true);
    } catch (error) {
      console.error(
        'My projects failed:',
        error
      );

      setMine(false);
    }
  }

  return (
    <>
      <PageHeading
        eyebrow="PROJECT REGISTRY"
        title="Projects"
        text="Project records shown here come from CivicTrack. The frontend does not manufacture project data."
        actions={
          <>
            {user.role ===
              'CONTRACTOR' && (
              <button
                className="ghost"
                onClick={loadMine}
              >
                <Icon name="folder" />
                My assignments
              </button>
            )}

            {(user.role ===
              'GOVERNMENT' ||
              user.role ===
                'ADMIN') && (
              <button
                className="primary"
                onClick={() =>
                  setModal(
                    'project'
                  )
                }
              >
                <Icon name="plus" />
                Create project
              </button>
            )}

            <button
              className="ghost"
              onClick={load}
            >
              <Icon name="refresh" />
              Refresh
            </button>
          </>
        }
      />

      <div className="filterbar">
        <div className="segmented">
          {[
            'ALL',
            'DRAFT',
            'ASSIGNED',
            'ACTIVE',
            'PUBLIC',
            'COMPLETED',
            'ARCHIVED',
          ].map(status => (
            <button
              key={status}
              className={
                filter ===
                status
                  ? 'active'
                  : ''
              }
              onClick={() =>
                setFilter(
                  status
                )
              }
            >
              {status}
            </button>
          ))}
        </div>

        <span>
          {visible.length}{' '}
          records
        </span>
      </div>

      {visible.length ===
      0 ? (
        <Empty
          title={
            mine
              ? 'No assignments returned'
              : 'No matching projects'
          }
          text={
            mine
              ? 'No project has been assigned to this contractor account.'
              : 'The API returned no matching project records.'
          }
        />
      ) : (
        <div className="project-grid">
          {visible.map(
            project => (
              <button
                className="project-card"
                key={
                  project.id
                }
                onClick={() =>
                  setSelected(
                    project
                  )
                }
              >
                <div className="card-top">
                  <span className="project-code">
                    {
                      project.project_code
                    }
                  </span>

                  <Status
                    value={
                      project.status
                    }
                  />
                </div>

                <h3>
                  {project.name}
                </h3>

                <p>
                  {project.description ||
                    'No description returned by the API.'}
                </p>

                <div className="card-meta">
                  <span>
                    {project.contractor_name ||
                      'Contractor not assigned'}
                  </span>

                  <span>
                    {money(
                      project.budget
                    )}
                  </span>
                </div>

                <div className="card-foot">
                  <span>
                    {project.start_date
                      ? date(
                          project.start_date
                        )
                      : 'Start date —'}
                  </span>

                  <span>
                    Open
                    <Icon
                      name="chevron"
                      size={14}
                    />
                  </span>
                </div>
              </button>
            )
          )}
        </div>
      )}
    </>
  );
}

/* ---------------------------------------------------------
   PAGE HEADING
--------------------------------------------------------- */

function PageHeading({
  eyebrow,
  title,
  text,
  actions,
}: {
  eyebrow: string;
  title: string;
  text: string;
  actions?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <span className="eyebrow">
          {eyebrow}
        </span>

        <h1>{title}</h1>

        <p>{text}</p>
      </div>

      <div className="heading-actions">
        {actions}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------
   MAP
--------------------------------------------------------- */

function MapView({
  projects,
  location,
  setSelected,
  askLocation,
}: {
  projects: Project[];
  location: {
    lat: number;
    lon: number;
  } | null;
  setSelected: (
    p: Project
  ) => void;
  askLocation: () => void;
}) {
  const points =
    projects.filter(
      project =>
        project.latitude !=
          null &&
        project.longitude !=
          null
    );

  /*
    IMPORTANT:
    There is NO hardcoded map center.
    If there are no real coordinates,
    the map says so.
  */
  if (points.length === 0) {
    return (
      <>
        <PageHeading
          eyebrow="GEO VIEW"
          title="Nearby projects"
          text="Only project coordinates returned by CivicTrack are displayed."
          actions={
            <button
              className="primary"
              onClick={askLocation}
            >
              <Icon name="locate" />
              Use my location
            </button>
          }
        />

        <div className="panel empty-map">
          <div className="empty-icon">
            <Icon
              name="map"
              size={28}
            />
          </div>

          <h3>
            No mapped project records
          </h3>

          <p>
            The API has not returned
            projects with coordinates.
            CivicTrack will not create
            placeholder locations.
          </p>
        </div>
      </>
    );
  }

  const center =
    location ??
    points.reduce(
      (
        accumulator,
        project
      ) => ({
        lat:
          accumulator.lat +
          project.latitude! /
            points.length,

        lon:
          accumulator.lon +
          project.longitude! /
            points.length,
      }),
      {
        lat: 0,
        lon: 0,
      }
    );

  const latitudes =
    points.map(
      p => p.latitude!
    );

  const longitudes =
    points.map(
      p => p.longitude!
    );

  const minLat =
    Math.min(
      ...latitudes,
      center.lat
    ) - 0.02;

  const maxLat =
    Math.max(
      ...latitudes,
      center.lat
    ) + 0.02;

  const minLon =
    Math.min(
      ...longitudes,
      center.lon
    ) - 0.02;

  const maxLon =
    Math.max(
      ...longitudes,
      center.lon
    ) + 0.02;

  const latRange =
    maxLat - minLat || 1;

  const lonRange =
    maxLon - minLon || 1;

  function position(
    project: Project
  ) {
    return {
      left: `${
        ((project.longitude! -
          minLon) /
          lonRange) *
        100
      }%`,

      top: `${
        100 -
        ((project.latitude! -
          minLat) /
          latRange) *
          100
      }%`,
    };
  }

  const userPoint: Project =
    location
      ? {
          id: 'current-user',
          project_code: '',
          name: 'Current location',
          description: '',
          status: 'LOCATION',
          visibility: 'PRIVATE',
          budget: null,
          latitude:
            location.lat,
          longitude:
            location.lon,
          contractor_name:
            null,
          start_date: null,
          expected_completion_date:
            null,
          created_at: '',
          updated_at: '',
        }
      : {
          id: '',
          project_code: '',
          name: '',
          description: '',
          status: '',
          visibility: '',
          budget: null,
          latitude: null,
          longitude: null,
          contractor_name: null,
          start_date: null,
          expected_completion_date:
            null,
          created_at: '',
          updated_at: '',
        };

  return (
    <>
      <PageHeading
        eyebrow="GEO VIEW"
        title="Nearby projects"
        text="Project markers are based only on coordinates returned by the CivicTrack API."
        actions={
          <button
            className="primary"
            onClick={askLocation}
          >
            <Icon name="locate" />
            {location
              ? 'Refresh location'
              : 'Use my location'}
          </button>
        }
      />

      <div className="map-layout">
        <div className="map-canvas">
          <div className="map-grid" />

          {points.map(
            project => (
              <button
                key={project.id}
                className={`map-pin ${statusClass(
                  project.status
                )}`}
                style={position(
                  project
                )}
                onClick={() =>
                  setSelected(
                    project
                  )
                }
                title={
                  project.name
                }
              >
                <span>
                  {
                    project.project_code
                  }
                </span>
              </button>
            )
          )}

          {location &&
            userPoint.latitude !=
              null &&
            userPoint.longitude !=
              null && (
              <div
                className="you-pin"
                style={position(
                  userPoint
                )}
              >
                <span>
                  You
                </span>
              </div>
            )}

          <div className="map-legend">
            <b>
              API project records
            </b>

            {[
              'PUBLIC',
              'ACTIVE',
              'COMPLETED',
            ].map(status => (
              <span
                key={status}
              >
                <i
                  className={statusClass(
                    status
                  )}
                />

                {status}
              </span>
            ))}
          </div>
        </div>

        <div className="map-list panel">
          <PanelHead
            eyebrow="VISIBLE RECORDS"
            title={`${points.length} mapped projects`}
          />

          {points.map(
            project => (
              <button
                className="project-row"
                key={
                  project.id
                }
                onClick={() =>
                  setSelected(
                    project
                  )
                }
              >
                <span className="pin-dot" />

                <span>
                  <b>
                    {
                      project.name
                    }
                  </b>

                  <small>
                    {
                      project.project_code
                    }{' '}
                    ·{' '}
                    {
                      project.latitude
                    }
                    ,{' '}
                    {
                      project.longitude
                    }
                  </small>
                </span>

                <Status
                  value={
                    project.status
                  }
                />
              </button>
            )
          )}
        </div>
      </div>
    </>
  );
}

/* ---------------------------------------------------------
   COMPLAINTS
--------------------------------------------------------- */

function Complaints({
  user,
  authenticated,
  complaints,
  projects,
  setModal,
  load,
  notify,
  requireAuth,
}: {
  user: User;
  authenticated: boolean;
  complaints: Complaint[];
  projects: Project[];
  setModal: (m: any) => void;
  load: () => void;
  notify: (
    message: string
  ) => void;
  requireAuth: () => boolean;
}) {
  const [status, setStatus] =
    useState('ALL');

  async function support(
    id: string
  ) {
    if (!authenticated) {
      requireAuth();
      return;
    }

    try {
      await api(
        `/complaints/${id}/support`,
        {
          method: 'POST',
        }
      );

      await load();

      notify(
        'Issue support recorded'
      );
    } catch (error) {
      notify(
        error instanceof Error
          ? error.message
          : 'Could not support issue'
      );
    }
  }

  async function update(
    id: string,
    next: string
  ) {
    try {
      await api(
        `/complaints/${id}`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            status: next,
          }),
        }
      );

      await load();

      notify(
        `Issue marked ${next.toLowerCase()}`
      );
    } catch (error) {
      notify(
        error instanceof Error
          ? error.message
          : 'Update failed'
      );
    }
  }

  const list =
    complaints.filter(
      complaint =>
        status === 'ALL' ||
        complaint.status ===
          status
    );

  return (
    <>
      <PageHeading
        eyebrow="PUBLIC ISSUES"
        title="Complaints & issues"
        text="Public issue records returned by the CivicTrack API. Sign-in is requested only when submitting or supporting an issue."
        actions={
          <button
            className="primary"
            onClick={() =>
              setModal(
                'complaint'
              )
            }
          >
            <Icon name="plus" />
            Report issue
          </button>
        }
      />

      <div className="filterbar">
        <div className="segmented">
          {[
            'ALL',
            'OPEN',
            'UNDER_REVIEW',
            'RESOLVED',
            'REJECTED',
          ].map(value => (
            <button
              key={value}
              className={
                status ===
                value
                  ? 'active'
                  : ''
              }
              onClick={() =>
                setStatus(
                  value
                )
              }
            >
              {value.replace(
                '_',
                ' '
              )}
            </button>
          ))}
        </div>

        <span>
          {list.length} issues
        </span>
      </div>

      <div className="issue-list">
        {list.map(
          complaint => (
            <article
              className="issue-card"
              key={
                complaint.id
              }
            >
              <div className="issue-top">
                <span className="issue-code">
                  {
                    complaint.issue_code
                  }
                </span>

                <Status
                  value={
                    complaint.status
                  }
                />

                <span
                  className={`severity ${complaint.severity.toLowerCase()}`}
                >
                  {
                    complaint.severity
                  }
                </span>
              </div>

              <h3>
                {
                  complaint.title
                }
              </h3>

              <p>
                {
                  complaint.description
                }
              </p>

              <div className="issue-meta">
                <span>
                  {complaint.project_name ||
                    'General civic issue'}
                </span>

                <span>
                  {date(
                    complaint.created_at
                  )}
                </span>

                <b>
                  {
                    complaint.support_count
                  }{' '}
                  supporter
                  {complaint.support_count ===
                  1
                    ? ''
                    : 's'}
                </b>
              </div>

              <div className="issue-actions">
                <button
                  className="ghost"
                  onClick={() =>
                    support(
                      complaint.id
                    )
                  }
                >
                  Support issue
                </button>

                {(user.role ===
                  'GOVERNMENT' ||
                  user.role ===
                    'ADMIN') && (
                  <>
                    <button
                      className="ghost"
                      onClick={() =>
                        update(
                          complaint.id,
                          'UNDER_REVIEW'
                        )
                      }
                    >
                      Review
                    </button>

                    <button
                      className="primary"
                      onClick={() =>
                        update(
                          complaint.id,
                          'RESOLVED'
                        )
                      }
                    >
                      Resolve
                    </button>
                  </>
                )}
              </div>
            </article>
          )
        )}

        {list.length === 0 && (
          <Empty
            title="No issue records"
            text="The API returned no complaints for the selected filter."
          />
        )}
      </div>
    </>
  );
}

/* ---------------------------------------------------------
   EVIDENCE
--------------------------------------------------------- */

function EvidenceView({
  evidence,
  setModal,
  notify,
}: {
  evidence: Evidence[];
  setModal: (
    m: ModalType
  ) => void;
  notify: (
    message: string
  ) => void;
}) {
  return (
    <>
      <PageHeading
        eyebrow="PROOF CENTER"
        title="Evidence"
        text="Only evidence records returned by the CivicTrack API are displayed."
        actions={
          <button
            className="primary"
            onClick={() =>
              setModal(
                'evidence'
              )
            }
          >
            <Icon name="camera" />
            Capture evidence
          </button>
        }
      />

      <div className="evidence-grid">
        {evidence.map(
          item => (
            <EvidenceCard
              key={item.id}
              evidence={item}
              notify={notify}
            />
          )
        )}

        {evidence.length ===
          0 && (
          <Empty
            title="No evidence records"
            text="The API returned no evidence records. No placeholder images are displayed."
          />
        )}
      </div>
    </>
  );
}

function EvidenceCard({
  evidence,
  notify,
}: {
  evidence: Evidence;
  notify: (
    message: string
  ) => void;
}) {
  const [url, setUrl] =
    useState<string | null>(
      null
    );

  const [loading, setLoading] =
    useState(false);

  async function openEvidence() {
    setLoading(true);

    try {
      const response =
        await api<{
          url: string;
        }>(
          `/evidence/${evidence.id}/url`
        );

      if (!response.url) {
        throw new Error(
          'The API did not return an evidence URL.'
        );
      }

      setUrl(
        response.url
      );

      window.open(
        response.url,
        '_blank',
        'noopener,noreferrer'
      );
    } catch (error) {
      notify(
        error instanceof Error
          ? error.message
          : 'Evidence preview unavailable'
      );
    } finally {
      setLoading(false);
    }
  }

  const isImage =
    evidence.mime_type?.startsWith(
      'image/'
    );

  return (
    <article className="evidence-card">
      <div className="evidence-thumb">
        {url && isImage ? (
          <img
            src={url}
            alt={
              evidence.file_name
            }
          />
        ) : (
          <Icon
            name="camera"
            size={28}
          />
        )}

        <span>
          {evidence.mime_type}
        </span>
      </div>

      <div className="evidence-body">
        <div className="card-top">
          <span>
            {
              evidence.file_name
            }
          </span>

          <Status
            value={
              evidence.status
            }
          />
        </div>

        <b>
          {evidence.project_name ||
            'Unlinked evidence'}
        </b>

        <small>
          {date(
            evidence.captured_at
          )}{' '}
          ·{' '}
          {
            evidence.source
          }
        </small>

        <code>
          {evidence.sha256}
        </code>

        <div className="evidence-meta">
          <span>
            {evidence.latitude !=
              null &&
            evidence.longitude !=
              null
              ? `${evidence.latitude.toFixed(
                  5
                )}, ${evidence.longitude.toFixed(
                  5
                )}`
              : 'GPS not captured'}
          </span>

          <button
            className="ghost small"
            disabled={loading}
            onClick={
              openEvidence
            }
          >
            {loading
              ? 'Opening…'
              : 'Open file'}
          </button>
        </div>
      </div>
    </article>
  );
}

/* ---------------------------------------------------------
   NOTIFICATIONS
--------------------------------------------------------- */

function Notifications({
  notices,
  load,
}: {
  notices: Notice[];
  load: () => void;
}) {
  async function read(
    id: string
  ) {
    try {
      await api(
        `/notifications/${id}/read`,
        {
          method: 'PATCH',
        }
      );

      load();
    } catch (error) {
      console.error(
        'Notification update failed:',
        error
      );
    }
  }

  return (
    <>
      <PageHeading
        eyebrow="ACTIVITY"
        title="Notifications"
        text="Notifications returned by the authenticated CivicTrack account."
        actions={
          <button
            className="ghost"
            onClick={load}
          >
            <Icon name="refresh" />
            Refresh
          </button>
        }
      />

      <div className="notification-list">
        {notices.map(
          notice => (
            <button
              key={notice.id}
              className={`notification-row ${
                notice.read_at
                  ? 'read'
                  : ''
              }`}
              onClick={() =>
                read(
                  notice.id
                )
              }
            >
              <span className="notice-dot" />

              <div>
                <b>
                  {notice.title}
                </b>

                <p>
                  {notice.body}
                </p>

                <small>
                  {date(
                    notice.created_at
                  )}{' '}
                  ·{' '}
                  {notice.type}
                </small>
              </div>

              {!notice.read_at && (
                <span className="unread">
                  NEW
                </span>
              )}
            </button>
          )
        )}

        {!notices.length && (
          <Empty
            title="No notifications"
            text="The API has not returned any notifications for this account."
          />
        )}
      </div>
    </>
  );
}

/* ---------------------------------------------------------
   ADMIN
--------------------------------------------------------- */

function Admin({
  users,
  audit,
  setModal,
  load,
}: {
  users: User[];
  audit: Audit[];
  setModal: (
    m: ModalType
  ) => void;
  load: () => Promise<any>;
}) {
  async function change(
    id: string,
    field:
      | 'role'
      | 'status',
    value: string
  ) {
    try {
      await api(
        `/admin/users/${id}`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            [field]: value,
          }),
        }
      );

      await load();
    } catch (error) {
      console.error(
        'Admin update failed:',
        error
      );
    }
  }

  return (
    <>
      <PageHeading
        eyebrow="ADMINISTRATION"
        title="Control center"
        text="Administrative actions are enforced by the CivicTrack API."
        actions={
          <button
            className="primary"
            onClick={() =>
              setModal(
                'account'
              )
            }
          >
            <Icon name="plus" />
            Create account
          </button>
        }
      />

      <section className="admin-grid">
        <div className="panel">
          <PanelHead
            eyebrow="IDENTITY & ACCESS"
            title={`${users.length} accounts`}
          />

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>
                    User
                  </th>

                  <th>
                    Role
                  </th>

                  <th>
                    Status
                  </th>

                  <th>
                    Created
                  </th>
                </tr>
              </thead>

              <tbody>
                {users.map(
                  account => (
                    <tr
                      key={
                        account.id
                      }
                    >
                      <td>
                        <b>
                          {
                            account.name
                          }
                        </b>

                        <small>
                          {
                            account.email
                          }
                        </small>
                      </td>

                      <td>
                        <select
                          value={
                            account.role
                          }
                          onChange={event =>
                            change(
                              account.id,
                              'role',
                              event
                                .target
                                .value
                            )
                          }
                        >
                          <option>
                            CITIZEN
                          </option>

                          <option>
                            CONTRACTOR
                          </option>

                          <option>
                            GOVERNMENT
                          </option>

                          <option>
                            ADMIN
                          </option>
                        </select>
                      </td>

                      <td>
                        <select
                          value={
                            account.status
                          }
                          onChange={event =>
                            change(
                              account.id,
                              'status',
                              event
                                .target
                                .value
                            )
                          }
                        >
                          <option>
                            ACTIVE
                          </option>

                          <option>
                            SUSPENDED
                          </option>
                        </select>
                      </td>

                      <td>
                        {date(
                          account.created_at
                        )}
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="panel">
          <PanelHead
            eyebrow="APPEND-ONLY"
            title="Audit trail"
          />

          <div className="audit-list">
            {audit.map(
              item => (
                <div
                  className="audit-row"
                  key={
                    item.id
                  }
                >
                  <span>
                    <Icon
                      name="shield"
                      size={15}
                    />
                  </span>

                  <div>
                    <b>
                      {
                        item.action
                      }
                    </b>

                    <small>
                      {item.actor_name ||
                        'System'}{' '}
                      ·{' '}
                      {
                        item.entity_type
                      }{' '}
                      ·{' '}
                      {
                        item.entity_id ||
                        '—'
                      }
                    </small>
                  </div>

                  <time>
                    {date(
                      item.created_at
                    )}
                  </time>
                </div>
              )
            )}

            {!audit.length && (
              <Empty
                title="No audit records"
                text="The API has not returned audit records."
              />
            )}
          </div>
        </div>
      </section>
    </>
  );
}

/* ---------------------------------------------------------
   PROJECT DRAWER
--------------------------------------------------------- */

function ProjectDrawer({
  project,
  user,
  authenticated,
  onAuthRequired,
  onComment,
  onComplaint,
  onClose,
  notify,
  load,
}: {
  project: Project;
  user: User;
  authenticated: boolean;
  onAuthRequired: () => void;
  onComment: () => void;
  onComplaint: () => void;
  onClose: () => void;
  notify: (
    message: string
  ) => void;
  load: () => void;
}) {
  const [
    detail,
    setDetail,
  ] = useState<{
    project: Project;
    evidence: Evidence[];
    complaints: Complaint[];
    comments: Comment[];
  } | null>(null);

  const [
    contractors,
    setContractors,
  ] = useState<User[]>([]);

  const [
    contractor,
    setContractor,
  ] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadDetail() {
      try {
        const response =
          await api<{
            project: Project;
            evidence: Evidence[];
            complaints: Complaint[];
            comments: Comment[];
          }>(
            `/projects/${project.id}`
          );

        if (!cancelled) {
          setDetail(response);
        }
      } catch (error) {
        console.error(
          'Project detail failed:',
          error
        );
      }

      if (
        user.role ===
          'GOVERNMENT' ||
        user.role === 'ADMIN'
      ) {
        try {
          const response =
            await api<{
              data: User[];
            }>(
              '/users/contractors'
            );

          if (!cancelled) {
            setContractors(
              response.data ?? []
            );
          }
        } catch (error) {
          console.error(
            'Contractor lookup failed:',
            error
          );
        }
      }
    }

    loadDetail();

    return () => {
      cancelled = true;
    };
  }, [
    project.id,
    user.role,
  ]);

  async function assign() {
    if (!contractor) {
      notify(
        'Select a contractor first.'
      );

      return;
    }

    try {
      await api(
        `/projects/${project.id}/assign`,
        {
          method: 'POST',
          body: JSON.stringify({
            contractor_user_id:
              contractor,
          }),
        }
      );

      notify(
        'Contractor assigned'
      );

      load();
      onClose();
    } catch (error) {
      notify(
        error instanceof Error
          ? error.message
          : 'Assignment failed'
      );
    }
  }

  async function updateStatus(
    next: string
  ) {
    try {
      const body: any = {
        status: next,
      };

      if (next === 'PUBLIC') {
        body.visibility =
          'PUBLIC';
      }

      await api(
        `/projects/${project.id}`,
        {
          method: 'PATCH',
          body: JSON.stringify(
            body
          ),
        }
      );

      notify(
        `Project updated to ${next}`
      );

      load();
      onClose();
    } catch (error) {
      notify(
        error instanceof Error
          ? error.message
          : 'Project update failed'
      );
    }
  }

  return (
    <div
      className="drawer-backdrop"
      onClick={onClose}
    >
      <aside
        className="drawer"
        onClick={event =>
          event.stopPropagation()
        }
      >
        <div className="drawer-head">
          <div>
            <span className="eyebrow">
              {
                project.project_code
              }
            </span>

            <h2>
              {project.name}
            </h2>
          </div>

          <button
            className="icon-button"
            onClick={onClose}
          >
            <Icon name="close" />
          </button>
        </div>

        <Status
          value={
            project.status
          }
        />

        <p className="drawer-description">
          {project.description ||
            'No description returned by the API.'}
        </p>

        <div className="detail-grid">
          <div>
            <span>
              Budget
            </span>

            <b>
              {money(
                project.budget
              )}
            </b>
          </div>

          <div>
            <span>
              Contractor
            </span>

            <b>
              {project.contractor_name ||
                'Not assigned'}
            </b>
          </div>

          <div>
            <span>
              Start
            </span>

            <b>
              {project.start_date
                ? date(
                    project.start_date
                  )
                : '—'}
            </b>
          </div>

          <div>
            <span>
              Expected completion
            </span>

            <b>
              {project.expected_completion_date
                ? date(
                    project.expected_completion_date
                  )
                : '—'}
            </b>
          </div>
        </div>

        <div className="button-row">
          <button
            className="ghost"
            onClick={() => {
              if (
                authenticated
              ) {
                onComment();
              } else {
                onAuthRequired();
              }
            }}
          >
            Write comment
          </button>

          <button
            className="ghost"
            onClick={onComplaint}
          >
            Report an issue
          </button>
        </div>

        {(user.role ===
          'GOVERNMENT' ||
          user.role ===
            'ADMIN') && (
          <div className="drawer-section">
            <span className="eyebrow">
              PROJECT CONTROL
            </span>

            <div className="form-grid">
              <select
                value={
                  contractor
                }
                onChange={event =>
                  setContractor(
                    event.target
                      .value
                  )
                }
              >
                <option value="">
                  Select contractor
                </option>

                {contractors.map(
                  account => (
                    <option
                      key={
                        account.id
                      }
                      value={
                        account.id
                      }
                    >
                      {
                        account.name
                      }{' '}
                      ·{' '}
                      {
                        account.email
                      }
                    </option>
                  )
                )}
              </select>

              <button
                className="ghost"
                onClick={assign}
              >
                Assign
              </button>
            </div>

            <div className="button-row">
              <button
                className="ghost"
                onClick={() =>
                  updateStatus(
                    'ACTIVE'
                  )
                }
              >
                Mark active
              </button>

              <button
                className="primary"
                onClick={() =>
                  updateStatus(
                    'PUBLIC'
                  )
                }
              >
                Publish public
              </button>

              <button
                className="ghost"
                onClick={() =>
                  updateStatus(
                    'COMPLETED'
                  )
                }
              >
                Complete
              </button>
            </div>
          </div>
        )}

        {detail && (
          <>
            <div className="drawer-section">
              <span className="eyebrow">
                EVIDENCE
              </span>

              <b>
                {
                  detail.evidence
                    .length
                }{' '}
                records
              </b>

              {detail.evidence
                .slice(0, 5)
                .map(item => (
                  <div
                    className="mini-row"
                    key={
                      item.id
                    }
                  >
                    <Icon
                      name="camera"
                      size={15}
                    />

                    <span>
                      {
                        item.file_name
                      }
                    </span>

                    <Status
                      value={
                        item.status
                      }
                    />
                  </div>
                ))}

              {!detail.evidence
                .length && (
                <p className="modal-copy">
                  No evidence records
                  were returned for
                  this project.
                </p>
              )}
            </div>

            <div className="drawer-section">
              <span className="eyebrow">
                ISSUES
              </span>

              <b>
                {
                  detail
                    .complaints
                    .length
                }{' '}
                linked complaints
              </b>

              {detail.complaints
                .slice(0, 5)
                .map(item => (
                  <div
                    className="mini-row"
                    key={
                      item.id
                    }
                  >
                    <Icon
                      name="alert"
                      size={15}
                    />

                    <span>
                      {item.title}
                    </span>

                    <Status
                      value={
                        item.status
                      }
                    />
                  </div>
                ))}

              {!detail
                .complaints
                .length && (
                <p className="modal-copy">
                  No complaints were
                  returned for this
                  project.
                </p>
              )}
            </div>

            <div className="drawer-section">
              <span className="eyebrow">
                PUBLIC COMMENTS
              </span>

              <b>
                {
                  detail.comments
                    ?.length ??
                  0
                }{' '}
                comments
              </b>

              {(detail.comments ??
                [])
                .slice(0, 8)
                .map(
                  comment => (
                    <div
                      className="comment-row"
                      key={
                        comment.id
                      }
                    >
                      <span className="avatar tiny">
                        {(
                          comment.author_name ||
                          'C'
                        )[0].toUpperCase()}
                      </span>

                      <div>
                        <b>
                          {comment.author_name ||
                            'Citizen'}
                        </b>

                        <p>
                          {
                            comment.body
                          }
                        </p>

                        <small>
                          {date(
                            comment.created_at
                          )}
                        </small>
                      </div>
                    </div>
                  )
                )}

              {!detail.comments
                ?.length && (
                <p className="modal-copy">
                  No comments have been
                  published for this project.
                </p>
              )}
            </div>
          </>
        )}
      </aside>
    </div>
  );
}

/* ---------------------------------------------------------
   GENERIC MODAL
--------------------------------------------------------- */

function Modal({
  title,
  eyebrow,
  children,
  onClose,
}: {
  title: string;
  eyebrow?: string;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className="modal-backdrop"
      onMouseDown={event => {
        if (
          event.currentTarget ===
          event.target
        ) {
          onClose();
        }
      }}
    >
      <div className="modal">
        <div className="modal-head">
          <div>
            {eyebrow && (
              <span className="eyebrow">
                {eyebrow}
              </span>
            )}

            <h2>{title}</h2>
          </div>

          <button
            className="icon-button"
            onClick={onClose}
          >
            <Icon name="close" />
          </button>
        </div>

        {children}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------
   COMPLAINT MODAL
--------------------------------------------------------- */

function ComplaintModal({
  projects,
  onClose,
  onSaved,
}: {
  projects: Project[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [project, setProject] =
    useState('');

  const [title, setTitle] =
    useState('');

  const [
    description,
    setDescription,
  ] = useState('');

  const [severity, setSeverity] =
    useState('MEDIUM');

  const [error, setError] =
    useState('');

  const [busy, setBusy] =
    useState(false);

  async function submit() {
    if (!title.trim()) {
      setError(
        'Title is required.'
      );

      return;
    }

    if (
      description.trim()
        .length < 5
    ) {
      setError(
        'Please provide a useful description.'
      );

      return;
    }

    setBusy(true);
    setError('');

    try {
      await api(
        '/complaints',
        {
          method: 'POST',
          body: JSON.stringify({
            project_id:
              project || null,
            title:
              title.trim(),
            description:
              description.trim(),
            severity,
          }),
        }
      );

      onSaved();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : 'Could not submit issue'
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      title="Report a civic issue"
      eyebrow="PUBLIC CHALLENGE"
      onClose={onClose}
    >
      <div className="form-grid">
        <label>
          Project

          <select
            value={project}
            onChange={event =>
              setProject(
                event.target
                  .value
              )
            }
          >
            <option value="">
              General issue
            </option>

            {projects.map(
              item => (
                <option
                  key={item.id}
                  value={item.id}
                >
                  {
                    item.project_code
                  }{' '}
                  · {item.name}
                </option>
              )
            )}
          </select>
        </label>

        <label>
          Severity

          <select
            value={severity}
            onChange={event =>
              setSeverity(
                event.target
                  .value
              )
            }
          >
            <option>
              LOW
            </option>

            <option>
              MEDIUM
            </option>

            <option>
              HIGH
            </option>

            <option>
              CRITICAL
            </option>
          </select>
        </label>
      </div>

      <label>
        Title

        <input
          value={title}
          onChange={event =>
            setTitle(
              event.target
                .value
            )
          }
          placeholder="What did you observe?"
        />
      </label>

      <label>
        Description

        <textarea
          value={description}
          onChange={event =>
            setDescription(
              event.target
                .value
            )
          }
          placeholder="Describe what you observed and where."
        />
      </label>

      {error && (
        <div className="form-error">
          {error}
        </div>
      )}

      <div className="modal-foot">
        <span>
          <Icon
            name="shield"
            size={14}
          />
          Authenticated API submission
        </span>

        <button
          className="primary"
          disabled={busy}
          onClick={submit}
        >
          {busy
            ? 'Submitting…'
            : 'Submit issue'}
        </button>
      </div>
    </Modal>
  );
}

/* ---------------------------------------------------------
   EVIDENCE MODAL
--------------------------------------------------------- */

function EvidenceModal({
  projects,
  onClose,
  onSaved,
}: {
  projects: Project[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const video =
    useRef<HTMLVideoElement>(
      null
    );

  const stream =
    useRef<MediaStream | null>(
      null
    );

  const [cameraOn, setCameraOn] =
    useState(false);

  const [blob, setBlob] =
    useState<Blob | null>(
      null
    );

  const [preview, setPreview] =
    useState('');

  const [name, setName] =
    useState('');

  const [hash, setHash] =
    useState('');

  const [coords, setCoords] =
    useState<{
      lat: number;
      lon: number;
    } | null>(null);

  const [project, setProject] =
    useState('');

  const [notes, setNotes] =
    useState('');

  const [source, setSource] =
    useState('WEB_CAMERA');

  const [error, setError] =
    useState('');

  const [busy, setBusy] =
    useState(false);

  useEffect(() => {
    return () => {
      stream.current
        ?.getTracks()
        .forEach(track =>
          track.stop()
        );

      if (preview) {
        URL.revokeObjectURL(
          preview
        );
      }
    };
  }, [preview]);

  async function digest(
    file: Blob
  ) {
    const buffer =
      await file.arrayBuffer();

    const hashBuffer =
      await crypto.subtle.digest(
        'SHA-256',
        buffer
      );

    return Array.from(
      new Uint8Array(
        hashBuffer
      )
    )
      .map(value =>
        value
          .toString(16)
          .padStart(2, '0')
      )
      .join('');
  }

  async function accept(
    file: Blob,
    filename: string,
    sourceType: string
  ) {
    const calculated =
      await digest(file);

    setBlob(file);
    setName(filename);
    setSource(sourceType);
    setHash(calculated);

    if (preview) {
      URL.revokeObjectURL(
        preview
      );
    }

    setPreview(
      URL.createObjectURL(
        file
      )
    );

    setError('');
  }

  async function startCamera() {
    setError('');

    if (
      typeof window ===
        'undefined' ||
      !navigator.mediaDevices ||
      !navigator.mediaDevices
        .getUserMedia
    ) {
      setError(
        'Camera access is unavailable in this browser. Use the image picker instead.'
      );

      return;
    }

    try {
      /*
        First attempt:
        rear/environment camera.
      */
      let cameraStream: MediaStream;

      try {
        cameraStream =
          await navigator.mediaDevices.getUserMedia(
            {
              video: {
                facingMode: {
                  ideal:
                    'environment',
                },

                width: {
                  ideal: 1280,
                },

                height: {
                  ideal: 720,
                },
              },

              audio: false,
            }
          );
      } catch {
        /*
          Fallback:
          any available camera.
        */
        cameraStream =
          await navigator.mediaDevices.getUserMedia(
            {
              video: true,
              audio: false,
            }
          );
      }

      stream.current =
        cameraStream;

      if (!video.current) {
        cameraStream
          .getTracks()
          .forEach(track =>
            track.stop()
          );

        throw new Error(
          'Camera preview element was not available.'
        );
      }

      video.current.srcObject =
        cameraStream;

      video.current.muted =
        true;

      video.current.playsInline =
        true;

      await video.current.play();

      setCameraOn(true);
    } catch (error) {
      console.error(
        'Camera error:',
        error
      );

      setCameraOn(false);

      setError(
        'Camera could not be opened. Check Chrome camera permission for localhost, close other apps using the camera, or use Choose image file.'
      );
    }
  }

  function stopCamera() {
    stream.current
      ?.getTracks()
      .forEach(track =>
        track.stop()
      );

    stream.current = null;

    if (video.current) {
      video.current.srcObject =
        null;
    }

    setCameraOn(false);
  }

  function captureFrame() {
    const element =
      video.current;

    if (
      !element ||
      !cameraOn
    ) {
      setError(
        'Start the camera before capturing a frame.'
      );

      return;
    }

    if (
      element.videoWidth === 0 ||
      element.videoHeight === 0
    ) {
      setError(
        'Camera is not ready yet. Wait for the preview and try again.'
      );

      return;
    }

    const canvas =
      document.createElement(
        'canvas'
      );

    canvas.width =
      element.videoWidth;

    canvas.height =
      element.videoHeight;

    const context =
      canvas.getContext(
        '2d'
      );

    if (!context) {
      setError(
        'Could not create image capture surface.'
      );

      return;
    }

    context.drawImage(
      element,
      0,
      0,
      canvas.width,
      canvas.height
    );

    canvas.toBlob(
      file => {
        if (file) {
          accept(
            file,
            `camera-${Date.now()}.jpg`,
            'WEB_CAMERA'
          );

          stopCamera();
        }
      },
      'image/jpeg',
      0.92
    );
  }

  function pickFile(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    if (
      ![
        'image/jpeg',
        'image/png',
        'image/webp',
      ].includes(
        file.type
      )
    ) {
      setError(
        'Only JPG, PNG and WebP images are supported.'
      );

      return;
    }

    const maxSize =
      15 * 1024 * 1024;

    if (
      file.size >
      maxSize
    ) {
      setError(
        'Image must be smaller than 15 MB.'
      );

      return;
    }

    accept(
      file,
      file.name,
      'WEB_UPLOAD'
    );
  }

  function locate() {
    if (
      !navigator.geolocation
    ) {
      setError(
        'Geolocation is unavailable in this browser.'
      );

      return;
    }

    navigator.geolocation.getCurrentPosition(
      position => {
        setCoords({
          lat:
            position.coords
              .latitude,

          lon:
            position.coords
              .longitude,
        });

        setError('');
      },

      error => {
        console.error(
          'Evidence GPS error:',
          error
        );

        setError(
          'Location permission was denied or unavailable.'
        );
      },

      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  }

  async function submit() {
    if (!blob) {
      setError(
        'Capture or select an image first.'
      );

      return;
    }

    if (!hash) {
      setError(
        'The image hash has not been generated yet.'
      );

      return;
    }

    setBusy(true);
    setError('');

    try {
      const form =
        new FormData();

      form.append(
        'file',
        blob,
        name
      );

      if (project) {
        form.append(
          'project_id',
          project
        );
      }

      if (coords) {
        form.append(
          'latitude',
          String(
            coords.lat
          )
        );

        form.append(
          'longitude',
          String(
            coords.lon
          )
        );
      }

      form.append(
        'captured_at',
        new Date().toISOString()
      );

      form.append(
        'source',
        source
      );

      form.append(
        'sha256',
        hash
      );

      form.append(
        'notes',
        notes
      );

      await api(
        '/evidence',
        {
          method: 'POST',
          body: form,
        }
      );

      stopCamera();

      onSaved();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : 'Could not upload evidence'
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      title="Evidence capture studio"
      eyebrow="PROOF CENTER"
      onClose={() => {
        stopCamera();
        onClose();
      }}
    >
      <div className="capture-grid">
        <div className="capture-stage">
          {preview ? (
            <img
              src={preview}
              alt="Captured evidence preview"
            />
          ) : (
            <video
              ref={video}
              muted
              playsInline
              autoPlay
            />
          )}

          <div className="capture-overlay">
            <span>
              {cameraOn
                ? 'CAMERA LIVE'
                : blob
                  ? 'CAPTURE READY'
                  : 'CAMERA / IMAGE SURFACE'}
            </span>

            {cameraOn && (
              <i />
            )}
          </div>
        </div>

        <div className="capture-controls">
          <div className="button-row">
            {!cameraOn ? (
              <button
                className="primary"
                onClick={
                  startCamera
                }
              >
                <Icon name="camera" />
                Start camera
              </button>
            ) : (
              <>
                <button
                  className="primary"
                  onClick={
                    captureFrame
                  }
                >
                  <Icon name="camera" />
                  Capture frame
                </button>

                <button
                  className="ghost"
                  onClick={
                    stopCamera
                  }
                >
                  Stop
                </button>
              </>
            )}
          </div>

          <label className="file-drop">
            <Icon
              name="upload"
              size={22}
            />

            <b>
              Choose image file
            </b>

            <span>
              PNG, JPG, WebP · max 15 MB
            </span>

            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              capture="environment"
              onChange={
                pickFile
              }
            />
          </label>

          <button
            className="ghost wide"
            onClick={locate}
          >
            <Icon name="locate" />

            {coords
              ? `GPS ${coords.lat.toFixed(
                  5
                )}, ${coords.lon.toFixed(
                  5
                )}`
              : 'Capture GPS coordinates'}
          </button>
        </div>
      </div>

      <div className="form-grid">
        <label>
          Project

          <select
            value={project}
            onChange={event =>
              setProject(
                event.target
                  .value
              )
            }
          >
            <option value="">
              Not linked
            </option>

            {projects.map(
              item => (
                <option
                  key={item.id}
                  value={item.id}
                >
                  {
                    item.project_code
                  }{' '}
                  · {item.name}
                </option>
              )
            )}
          </select>
        </label>

        <label>
          Source

          <input
            value={source}
            readOnly
          />
        </label>
      </div>

      <label>
        SHA-256

        <input
          value={
            hash ||
            'Generated after capture'
          }
          readOnly
        />
      </label>

      <label>
        Notes

        <textarea
          value={notes}
          onChange={event =>
            setNotes(
              event.target
                .value
            )
          }
          placeholder="Optional field notes…"
        />
      </label>

      {error && (
        <div className="form-error">
          {error}
        </div>
      )}

      <div className="integrity-box">
        <Icon name="shield" />

        <div>
          <b>
            Server integrity check
          </b>

          <span>
            The API should calculate
            SHA-256 again from the
            uploaded bytes. A mismatch
            should be rejected by the
            backend.
          </span>
        </div>
      </div>

      <div className="modal-foot">
        <span>
          {blob
            ? 'Image ready'
            : 'Waiting for capture'}
        </span>

        <button
          className="primary"
          disabled={
            busy || !blob
          }
          onClick={submit}
        >
          {busy
            ? 'Uploading…'
            : 'Submit evidence'}
        </button>
      </div>
    </Modal>
  );
}

/* ---------------------------------------------------------
   COMMENT
--------------------------------------------------------- */

function CommentModal({
  project,
  onClose,
  onSaved,
}: {
  project: Project;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [body, setBody] =
    useState('');

  const [error, setError] =
    useState('');

  const [busy, setBusy] =
    useState(false);

  async function submit() {
    if (
      body.trim().length <
      2
    ) {
      setError(
        'Write at least 2 characters.'
      );

      return;
    }

    setBusy(true);
    setError('');

    try {
      await api(
        '/comments',
        {
          method: 'POST',
          body: JSON.stringify({
            project_id:
              project.id,
            body:
              body.trim(),
          }),
        }
      );

      onSaved();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : 'Could not publish comment'
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      title="Write a project comment"
      eyebrow="PUBLIC DISCUSSION"
      onClose={onClose}
    >
      <p className="modal-copy">
        Comments are attached to this
        project and stored through the
        CivicTrack API.
      </p>

      <label>
        Comment

        <textarea
          value={body}
          onChange={event =>
            setBody(
              event.target
                .value
            )
          }
          placeholder="Share a factual observation about this project…"
        />
      </label>

      {error && (
        <div className="form-error">
          {error}
        </div>
      )}

      <div className="modal-foot">
        <span>
          <Icon
            name="shield"
            size={14}
          />
          Authenticated + auditable
        </span>

        <button
          className="primary"
          disabled={busy}
          onClick={submit}
        >
          {busy
            ? 'Publishing…'
            : 'Publish comment'}
        </button>
      </div>
    </Modal>
  );
}

/* ---------------------------------------------------------
   PROJECT CREATE
--------------------------------------------------------- */

function ProjectModal({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: () => void;
}) {
  const [
    form,
    setForm,
  ] = useState({
    project_code: '',
    name: '',
    description: '',
    status: 'DRAFT',
    visibility: 'PRIVATE',
    budget: '',
    latitude: '',
    longitude: '',
    contractor_name: '',
    start_date: '',
    expected_completion_date:
      '',
  });

  const [error, setError] =
    useState('');

  const [busy, setBusy] =
    useState(false);

  function setField(
    key: string,
    value: string
  ) {
    setForm(current => ({
      ...current,
      [key]: value,
    }));
  }

  async function submit() {
    if (
      !form.project_code.trim() ||
      !form.name.trim()
    ) {
      setError(
        'Project code and name are required.'
      );

      return;
    }

    setBusy(true);
    setError('');

    try {
      await api(
        '/projects',
        {
          method: 'POST',
          body: JSON.stringify({
            ...form,

            project_code:
              form.project_code.trim(),

            name:
              form.name.trim(),

            description:
              form.description.trim(),

            budget: form.budget
              ? Number(
                  form.budget
                )
              : null,

            latitude:
              form.latitude
                ? Number(
                    form.latitude
                  )
                : null,

            longitude:
              form.longitude
                ? Number(
                    form.longitude
                  )
                : null,
          }),
        }
      );

      onSaved();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : 'Could not create project'
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      title="Create project"
      eyebrow="GOVERNMENT / ADMIN"
      onClose={onClose}
    >
      <div className="form-grid">
        <label>
          Project code

          <input
            value={
              form.project_code
            }
            onChange={event =>
              setField(
                'project_code',
                event.target
                  .value
              )
            }
            placeholder="Enter official project code"
          />
        </label>

        <label>
          Status

          <select
            value={
              form.status
            }
            onChange={event =>
              setField(
                'status',
                event.target
                  .value
              )
            }
          >
            <option>
              DRAFT
            </option>

            <option>
              ASSIGNED
            </option>

            <option>
              ACTIVE
            </option>

            <option>
              PUBLIC
            </option>
          </select>
        </label>
      </div>

      <label>
        Name

        <input
          value={form.name}
          onChange={event =>
            setField(
              'name',
              event.target
                .value
            )
          }
          placeholder="Official project name"
        />
      </label>

      <label>
        Description

        <textarea
          value={
            form.description
          }
          onChange={event =>
            setField(
              'description',
              event.target
                .value
            )
          }
        />
      </label>

      <div className="form-grid">
        <label>
          Budget

          <input
            type="number"
            value={
              form.budget
            }
            onChange={event =>
              setField(
                'budget',
                event.target
                  .value
              )
            }
          />
        </label>

        <label>
          Contractor display name

          <input
            value={
              form.contractor_name
            }
            onChange={event =>
              setField(
                'contractor_name',
                event.target
                  .value
              )
            }
          />
        </label>
      </div>

      <div className="form-grid">
        <label>
          Latitude

          <input
            value={
              form.latitude
            }
            onChange={event =>
              setField(
                'latitude',
                event.target
                  .value
              )
            }
            placeholder="Official latitude"
          />
        </label>

        <label>
          Longitude

          <input
            value={
              form.longitude
            }
            onChange={event =>
              setField(
                'longitude',
                event.target
                  .value
              )
            }
            placeholder="Official longitude"
          />
        </label>
      </div>

      <div className="form-grid">
        <label>
          Start date

          <input
            type="date"
            value={
              form.start_date
            }
            onChange={event =>
              setField(
                'start_date',
                event.target
                  .value
              )
            }
          />
        </label>

        <label>
          Expected completion

          <input
            type="date"
            value={
              form.expected_completion_date
            }
            onChange={event =>
              setField(
                'expected_completion_date',
                event.target
                  .value
              )
            }
          />
        </label>
      </div>

      {error && (
        <div className="form-error">
          {error}
        </div>
      )}

      <div className="modal-foot">
        <span>
          <Icon
            name="shield"
            size={14}
          />
          API + audit backed
        </span>

        <button
          className="primary"
          disabled={busy}
          onClick={submit}
        >
          {busy
            ? 'Creating…'
            : 'Create project'}
        </button>
      </div>
    </Modal>
  );
}

/* ---------------------------------------------------------
   ADMIN ACCOUNT
--------------------------------------------------------- */

function AccountModal({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] =
    useState('');

  const [email, setEmail] =
    useState('');

  const [password, setPassword] =
    useState('');

  const [role, setRole] =
    useState<Role>(
      'GOVERNMENT'
    );

  const [error, setError] =
    useState('');

  const [busy, setBusy] =
    useState(false);

  async function submit() {
    if (!name.trim()) {
      setError(
        'Name is required.'
      );

      return;
    }

    if (!email.trim()) {
      setError(
        'Email is required.'
      );

      return;
    }

    if (
      password.length < 8
    ) {
      setError(
        'Password must contain at least 8 characters.'
      );

      return;
    }

    setBusy(true);
    setError('');

    try {
      await api(
        '/admin/users',
        {
          method: 'POST',
          body: JSON.stringify({
            name: name.trim(),
            email:
              email.trim(),
            password,
            role,
          }),
        }
      );

      onSaved();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : 'Could not create account'
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      title="Create controlled account"
      eyebrow="ADMIN"
      onClose={onClose}
    >
      <p className="modal-copy">
        Elevated roles are created by
        authorized administrators through
        the backend.
      </p>

      <label>
        Name

        <input
          value={name}
          onChange={event =>
            setName(
              event.target
                .value
            )
          }
        />
      </label>

      <label>
        Email

        <input
          type="email"
          value={email}
          onChange={event =>
            setEmail(
              event.target
                .value
            )
          }
        />
      </label>

      <label>
        Password

        <input
          type="password"
          value={password}
          onChange={event =>
            setPassword(
              event.target
                .value
            )
          }
          placeholder="Minimum 8 characters"
        />
      </label>

      <label>
        Role

        <select
          value={role}
          onChange={event =>
            setRole(
              event.target
                .value as Role
            )
          }
        >
          <option>
            CONTRACTOR
          </option>

          <option>
            GOVERNMENT
          </option>

          <option>
            ADMIN
          </option>

          <option>
            CITIZEN
          </option>
        </select>
      </label>

      {error && (
        <div className="form-error">
          {error}
        </div>
      )}

      <div className="modal-foot">
        <span>
          Server-enforced RBAC
        </span>

        <button
          className="primary"
          disabled={busy}
          onClick={submit}
        >
          {busy
            ? 'Creating…'
            : 'Create account'}
        </button>
      </div>
    </Modal>
  );
}