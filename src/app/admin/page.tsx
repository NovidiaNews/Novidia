"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Users, FileText, Terminal, LogOut, Shield, Save, X, Eye, EyeOff,
  RefreshCw, Search, Check, AlertTriangle, ArrowUpDown, ArrowUp, ArrowDown,
  ChevronDown, ChevronRight, UserPlus, Trash2, Edit3, Filter,
  AlertCircle, Info, AlertOctagon, Bug, List,
} from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

type Tab = "users" | "articles" | "logs";

interface StoredUser {
  id: string;
  username: string;
  email: string;
  role: number;
  firstName?: string;
  lastName?: string;
  profilePicture?: string;
}

interface UserRecord {
  id: string;
  username: string;
  email: string;
  role: number;
  firstName: string | null;
  lastName: string | null;
  isBanned: boolean;
  isVerified: boolean;
  isOnboarded: boolean;
  strikes: number;
  profilePicture: string | null;
  bio: string | null;
  theme: string;
  notificationsEnabled: boolean;
  createdAt: string;
  password?: string;
  [key: string]: unknown;
}

interface ArticleRecord {
  id: string;
  title: string;
  content: string;
  status: string;
  authorId: string;
  author: { id: string; username: string; email: string };
  createdAt: string;
  updatedAt: string;
}

interface LogEntry {
  level: string;
  time: number;
  msg: string;
  pid?: number;
  url?: string;
  [key: string]: unknown;
}

type SortDir = "asc" | "desc";

const levelIcon = (level: string) => {
  switch (level) {
    case "error": return <AlertCircle size={12} className="text-red-500" />;
    case "warn": return <AlertOctagon size={12} className="text-amber-500" />;
    case "fatal": return <AlertTriangle size={12} className="text-red-600" />;
    case "debug": return <Bug size={12} className="text-blue-500" />;
    default: return <Info size={12} className="text-zinc-400" />;
  }
};

export default function AdminPage() {
  const router = useRouter();
  const [authUser, setAuthUser] = useState<StoredUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("users");

  useEffect(() => {
    const storedUser = localStorage.getItem("novidia_user");
    const storedToken = localStorage.getItem("novidia_token");
    if (storedUser && storedToken) {
      try {
        const parsed = JSON.parse(storedUser);
        if (parsed.role < 90) { router.push("/"); return; }
        setAuthUser(parsed);
        setToken(storedToken);
      } catch { router.push("/login"); }
    } else { router.push("/login"); }
    setLoading(false);
  }, [router]);

  if (loading) return (
    <div className="min-h-screen bg-zinc-100 flex items-center justify-center">
      <div className="animate-spin h-8 w-8 border-4 border-main border-t-transparent rounded-full" />
    </div>
  );
  if (!authUser) return null;

  return (
    <div className="min-h-screen bg-zinc-100">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold font-fraunces text-zinc-800">Panel administracyjny</h1>
          </div>
          <button onClick={() => router.push("/")}
            className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500 hover:text-zinc-700 transition-colors cursor-pointer"
          >
            <LogOut size={14} /> Wróć
          </button>
        </div>
        <TabNav activeTab={activeTab} onTabChange={setActiveTab} />
        {activeTab === "users" ? (
          <UsersPanel token={token!} currentUserId={authUser.id} />
        ) : activeTab === "articles" ? (
          <ArticlesPanel token={token!} />
        ) : (
          <LogsPanel token={token!} />
        )}
      </div>
    </div>
  );
}

function TabNav({ activeTab, onTabChange }: { activeTab: Tab; onTabChange: (t: Tab) => void }) {
  const tabs: { id: Tab; label: string; icon: typeof Users }[] = [
    { id: "users", label: "Użytkownicy", icon: Users },
    { id: "articles", label: "Artykuły", icon: FileText },
    { id: "logs", label: "Logi", icon: Terminal },
  ];
  return (
    <div className="flex gap-1 mb-6 bg-zinc-200/50 rounded-xl p-1 w-fit">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        return (
          <button key={tab.id} onClick={() => onTabChange(tab.id)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
              activeTab === tab.id ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700"
            }`}
          >
            <Icon size={16} /> {tab.label}
          </button>
        );
      })}
    </div>
  );
}

function SortHeader({ label, field, currentField, direction, onSort }: {
  label: string; field: string; currentField: string; direction: SortDir; onSort: (f: string) => void;
}) {
  const active = currentField === field;
  const Icon = active ? (direction === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;
  return (
    <th className="text-left px-4 py-3 font-semibold text-zinc-500 cursor-pointer select-none hover:text-zinc-700 transition-colors"
      onClick={() => onSort(field)}
    >
      <div className="flex items-center gap-1.5">
        {label}
        <Icon size={13} className={active ? "text-main" : "text-zinc-300"} />
      </div>
    </th>
  );
}

function UsersPanel({ token, currentUserId }: { token: string; currentUserId: string }) {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null);
  const [editJson, setEditJson] = useState("");
  const [editError, setEditError] = useState("");
  const [saving, setSaving] = useState(false);
  const [showPasswords, setShowPasswords] = useState(false);
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [sortField, setSortField] = useState("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const showNotification = (type: "success" | "error", message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
    if (type === "error") console.error(`[Admin Error] ${message}`);
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/admin/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Nie udało się pobrać użytkowników");
      setUsers(await res.json());
    } catch (err: any) { showNotification("error", err.message); }
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, [token]);

  const handleSort = (field: string) => {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortField(field); setSortDir("asc"); }
  };

  const sortedUsers = useMemo(() => {
    const filtered = users.filter(
      (u) => u.username.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase())
    );
    return [...filtered].sort((a, b) => {
      let aVal: any = a[sortField as keyof UserRecord];
      let bVal: any = b[sortField as keyof UserRecord];
      if (sortField === "createdAt") { aVal = new Date(aVal).getTime(); bVal = new Date(bVal).getTime(); }
      if (typeof aVal === "string") aVal = aVal.toLowerCase();
      if (typeof bVal === "string") bVal = bVal.toLowerCase();
      if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [users, search, sortField, sortDir]);

  const openEditor = (user: UserRecord) => {
    const { password, ...rest } = user;
    setEditingUser(user);
    setEditJson(JSON.stringify(rest, null, 2));
    setEditError("");
  };

  const saveUser = async () => {
    if (!editingUser) return;
    setSaving(true); setEditError("");
    try {
      let parsed;
      try { parsed = JSON.parse(editJson); } catch { setEditError("Nieprawidłowy JSON"); setSaving(false); return; }
      const res = await fetch(`${API_URL}/admin/users/${editingUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(parsed),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.message || "Nie udało się zapisać użytkownika"); }
      showNotification("success", "Użytkownik zapisany pomyślnie");
      setEditingUser(null); fetchUsers();
    } catch (err: any) { setEditError(err.message); }
    setSaving(false);
  };

  const deleteUser = async (id: string) => {
    if (!confirm("Czy na pewno chcesz usunąć tego użytkownika?")) return;
    try {
      const res = await fetch(`${API_URL}/admin/users/${id}`, {
        method: "DELETE", headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Nie udało się usunąć użytkownika");
      showNotification("success", "Użytkownik usunięty"); fetchUsers();
    } catch (err: any) { showNotification("error", err.message); }
  };

  return (
    <div>
      {notification && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-semibold flex items-center gap-2 ${
          notification.type === "success" ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-red-50 text-red-800 border border-red-200"
        }`}>
          {notification.type === "success" ? <Check size={16} /> : <AlertTriangle size={16} />}
          {notification.message}
        </div>
      )}

      <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
        <div className="relative flex-1 max-w-md min-w-48">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input type="text" placeholder="Szukaj użytkowników..." value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-zinc-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-main/30"
          />
        </div>
        <button onClick={fetchUsers}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-zinc-200 text-sm font-semibold text-zinc-600 hover:bg-zinc-50 transition-colors cursor-pointer"
        >
          <RefreshCw size={14} /> Odśwież
        </button>
      </div>

      {loading ? (
        <div className="grid gap-3">{[1, 2, 3].map((i) => <div key={i} className="h-16 bg-zinc-200 rounded-xl animate-pulse" />)}</div>
      ) : (
        <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50">
                  <SortHeader label="Nazwa" field="username" currentField={sortField} direction={sortDir} onSort={handleSort} />
                  <SortHeader label="Email" field="email" currentField={sortField} direction={sortDir} onSort={handleSort} />
                  <SortHeader label="Ranga" field="role" currentField={sortField} direction={sortDir} onSort={handleSort} />
                  <th className="text-left px-4 py-3 font-semibold text-zinc-500">Status</th>
                  <SortHeader label="Utworzono" field="createdAt" currentField={sortField} direction={sortDir} onSort={handleSort} />
                  <th className="text-right px-4 py-3 font-semibold text-zinc-500">Akcje</th>
                </tr>
              </thead>
              <tbody>
                {sortedUsers.map((user) => {
                  const isSelf = user.id === currentUserId;
                  return (
                    <tr key={user.id} className={`border-b border-zinc-100 transition-colors ${isSelf ? "bg-zinc-50" : "hover:bg-zinc-50"}`}>
                      <td className="px-4 py-3 font-medium text-zinc-800">
                        <div className="flex items-center gap-2">
                          <UserPlus size={14} className="text-zinc-400 shrink-0" />
                          {user.username}
                          {isSelf && <span className="text-xs text-zinc-400 font-normal">(ty)</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-zinc-600">{user.email}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          user.role >= 100 ? "bg-purple-100 text-purple-700" : user.role >= 90 ? "bg-blue-100 text-blue-700" : user.role >= 30 ? "bg-amber-100 text-amber-700" : "bg-zinc-100 text-zinc-600"
                        }`}>{user.role}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {user.isBanned && <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full flex items-center gap-1"><AlertCircle size={11} />Zablokowany</span>}
                          {!user.isVerified && <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full flex items-center gap-1"><AlertTriangle size={11} />Niezweryfikowany</span>}
                          {!user.isBanned && user.isVerified && <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-1"><Check size={11} />Aktywny</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-zinc-500 text-xs">{new Date(user.createdAt).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => !isSelf && openEditor(user)}
                            disabled={isSelf}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 ${
                              isSelf ? "text-zinc-300 cursor-not-allowed" : "text-main hover:bg-main/10 cursor-pointer"
                            }`}
                            title={isSelf ? "Nie możesz edytować siebie" : "Edytuj użytkownika"}
                          ><Edit3 size={12} /> Edytuj</button>
                          <button onClick={() => !isSelf && deleteUser(user.id)}
                            disabled={isSelf}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 ${
                              isSelf ? "text-zinc-300 cursor-not-allowed" : "text-red-600 hover:bg-red-50 cursor-pointer"
                            }`}
                            title={isSelf ? "Nie możesz usunąć siebie" : "Usuń użytkownika"}
                          ><Trash2 size={12} /> Usuń</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {sortedUsers.length === 0 && <div className="text-center py-12 text-zinc-500 text-sm">Nie znaleziono użytkowników</div>}
        </div>
      )}

      {editingUser && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200">
              <h3 className="text-lg font-bold text-zinc-800 font-fraunces flex items-center gap-2">
                <Edit3 size={18} className="text-main" /> Edytuj użytkownika: {editingUser.username}
              </h3>
              <button onClick={() => setEditingUser(null)} className="text-zinc-400 hover:text-zinc-600 cursor-pointer"><X size={20} /></button>
            </div>
            <div className="flex-1 overflow-auto p-6">
              {editingUser.id === currentUserId && (
                <div className="mb-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-700 font-semibold flex items-center gap-2">
                  <AlertTriangle size={16} /> Edytujesz swoje własne konto. Edytor został zablokowany.
                </div>
              )}
              <div className="mb-4 flex items-center gap-3">
                <button onClick={() => setShowPasswords(!showPasswords)}
                  className="flex items-center gap-2 text-xs font-semibold text-zinc-500 hover:text-zinc-700 transition-colors cursor-pointer bg-zinc-100 px-3 py-1.5 rounded-lg"
                >
                  {showPasswords ? <EyeOff size={14} /> : <Eye size={14} />}
                  {showPasswords ? "Ukryj JSON" : "Edytor JSON"}
                </button>
                <span className="text-xs text-zinc-400">
                  Dodaj pole <code className="bg-zinc-100 px-1 rounded">&quot;password&quot;</code> aby zmienić hasło
                </span>
              </div>
              <textarea value={editJson} onChange={(e) => setEditJson(e.target.value)}
                readOnly={editingUser.id === currentUserId}
                className={`w-full h-96 font-mono text-xs leading-relaxed p-4 rounded-xl border resize-none ${
                  editingUser.id === currentUserId ? "border-zinc-100 bg-zinc-50 text-zinc-400 cursor-not-allowed" : "border-zinc-200 focus:outline-none focus:ring-2 focus:ring-main/30"
                }`} spellCheck={false}
              />
              {editError && <p className="mt-2 text-sm text-red-600 font-semibold">{editError}</p>}
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-zinc-200 bg-zinc-50 rounded-b-2xl">
              <button onClick={() => setEditingUser(null)}
                className="px-5 py-2.5 rounded-xl border border-zinc-200 text-sm font-semibold text-zinc-600 hover:bg-zinc-100 transition-colors cursor-pointer"
              >Anuluj</button>
              <button onClick={saveUser} disabled={saving || editingUser.id === currentUserId}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                  editingUser.id === currentUserId ? "bg-zinc-200 text-zinc-400" : "bg-main text-white hover:brightness-110"
                }`}
              >{saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />} Zapisz</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ArticlesPanel({ token }: { token: string }) {
  const [articles, setArticles] = useState<ArticleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editingArticle, setEditingArticle] = useState<ArticleRecord | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editStatus, setEditStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [sortField, setSortField] = useState("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const showNotification = (type: "success" | "error", message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
    if (type === "error") console.error(`[Admin Error] ${message}`);
  };

  const fetchArticles = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/admin/articles`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Nie udało się pobrać artykułów");
      setArticles(await res.json());
    } catch (err: any) { showNotification("error", err.message); }
    setLoading(false);
  };

  useEffect(() => { fetchArticles(); }, [token]);

  const handleSort = (field: string) => {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortField(field); setSortDir("asc"); }
  };

  const sortedArticles = useMemo(() => {
    const filtered = articles.filter(
      (a) => a.title.toLowerCase().includes(search.toLowerCase()) || a.author?.username.toLowerCase().includes(search.toLowerCase())
    );
    return [...filtered].sort((a, b) => {
      let aVal: any, bVal: any;
      if (sortField === "createdAt" || sortField === "updatedAt") {
        aVal = new Date(a[sortField]).getTime(); bVal = new Date(b[sortField]).getTime();
      } else if (sortField === "author") {
        aVal = (a.author?.username || "").toLowerCase(); bVal = (b.author?.username || "").toLowerCase();
      } else {
        aVal = (a[sortField as keyof ArticleRecord] || "").toString().toLowerCase();
        bVal = (b[sortField as keyof ArticleRecord] || "").toString().toLowerCase();
      }
      if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [articles, search, sortField, sortDir]);

  const openEditor = (article: ArticleRecord) => {
    setEditingArticle(article); setEditTitle(article.title); setEditContent(article.content); setEditStatus(article.status);
  };

  const saveArticle = async () => {
    if (!editingArticle) return; setSaving(true);
    try {
      const res = await fetch(`${API_URL}/admin/articles/${editingArticle.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: editTitle, content: editContent, status: editStatus }),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.message || "Nie udało się zapisać artykułu"); }
      showNotification("success", "Artykuł zapisany"); setEditingArticle(null); fetchArticles();
    } catch (err: any) { showNotification("error", err.message); }
    setSaving(false);
  };

  const deleteArticle = async (id: string) => {
    if (!confirm("Czy na pewno chcesz usunąć ten artykuł?")) return;
    try {
      const res = await fetch(`${API_URL}/admin/articles/${id}`, {
        method: "DELETE", headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Nie udało się usunąć artykułu");
      showNotification("success", "Artykuł usunięty"); fetchArticles();
    } catch (err: any) { showNotification("error", err.message); }
  };

  const statusBadge = (status: string) => {
    const map: Record<string, { label: string; cls: string }> = {
      PUBLISHED: { label: "Opublikowany", cls: "bg-emerald-100 text-emerald-700" },
      DRAFT: { label: "Szkic", cls: "bg-zinc-100 text-zinc-600" },
      ARCHIVED: { label: "Zarchiwizowany", cls: "bg-blue-100 text-blue-700" },
    };
    const s = map[status] || { label: status, cls: "bg-zinc-100 text-zinc-600" };
    return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${s.cls}`}>{s.label}</span>;
  };

  return (
    <div>
      {notification && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-semibold flex items-center gap-2 ${
          notification.type === "success" ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-red-50 text-red-800 border border-red-200"
        }`}>
          {notification.type === "success" ? <Check size={16} /> : <AlertTriangle size={16} />}
          {notification.message}
        </div>
      )}

      <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
        <div className="relative flex-1 max-w-md min-w-48">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input type="text" placeholder="Szukaj artykułów..." value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-zinc-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-main/30"
          />
        </div>
        <button onClick={fetchArticles}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-zinc-200 text-sm font-semibold text-zinc-600 hover:bg-zinc-50 transition-colors cursor-pointer"
        ><RefreshCw size={14} /> Odśwież</button>
      </div>

      {loading ? (
        <div className="grid gap-3">{[1, 2, 3].map((i) => <div key={i} className="h-16 bg-zinc-200 rounded-xl animate-pulse" />)}</div>
      ) : (
        <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50">
                  <SortHeader label="Tytuł" field="title" currentField={sortField} direction={sortDir} onSort={handleSort} />
                  <SortHeader label="Autor" field="author" currentField={sortField} direction={sortDir} onSort={handleSort} />
                  <SortHeader label="Status" field="status" currentField={sortField} direction={sortDir} onSort={handleSort} />
                  <SortHeader label="Utworzono" field="createdAt" currentField={sortField} direction={sortDir} onSort={handleSort} />
                  <SortHeader label="Zaktualizowano" field="updatedAt" currentField={sortField} direction={sortDir} onSort={handleSort} />
                  <th className="text-right px-4 py-3 font-semibold text-zinc-500">Akcje</th>
                </tr>
              </thead>
              <tbody>
                {sortedArticles.map((article) => (
                  <tr key={article.id} className="border-b border-zinc-100 hover:bg-zinc-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-zinc-800 max-w-xs truncate">
                      <div className="flex items-center gap-2">
                        <FileText size={14} className="text-zinc-400 shrink-0" />
                        {article.title}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-zinc-600">{article.author?.username}</td>
                    <td className="px-4 py-3">{statusBadge(article.status)}</td>
                    <td className="px-4 py-3 text-zinc-500 text-xs">{new Date(article.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-zinc-500 text-xs">{new Date(article.updatedAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEditor(article)}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold text-main hover:bg-main/10 transition-colors cursor-pointer flex items-center gap-1"
                        ><Edit3 size={12} /> Edytuj</button>
                        <button onClick={() => deleteArticle(article.id)}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors cursor-pointer flex items-center gap-1"
                        ><Trash2 size={12} /> Usuń</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {sortedArticles.length === 0 && <div className="text-center py-12 text-zinc-500 text-sm">Nie znaleziono artykułów</div>}
        </div>
      )}

      {editingArticle && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200">
              <h3 className="text-lg font-bold text-zinc-800 font-fraunces flex items-center gap-2">
                <Edit3 size={18} className="text-main" /> Edytuj artykuł
              </h3>
              <button onClick={() => setEditingArticle(null)} className="text-zinc-400 hover:text-zinc-600 cursor-pointer"><X size={20} /></button>
            </div>
            <div className="flex-1 overflow-auto p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-500 mb-1 flex items-center gap-1"><FileText size={12} /> Tytuł</label>
                <input type="text" value={editTitle} onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-main/30"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-500 mb-1 flex items-center gap-1"><Filter size={12} /> Status</label>
                <select value={editStatus} onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-main/30 bg-white"
                >
                  <option value="DRAFT">Szkic</option>
                  <option value="PUBLISHED">Opublikowany</option>
                  <option value="ARCHIVED">Zarchiwizowany</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-500 mb-1 flex items-center gap-1"><Terminal size={12} /> Treść</label>
                <textarea value={editContent} onChange={(e) => setEditContent(e.target.value)}
                  className="w-full h-64 px-4 py-3 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-main/30 resize-none font-mono leading-relaxed"
                  spellCheck={false}
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-zinc-200 bg-zinc-50 rounded-b-2xl">
              <button onClick={() => setEditingArticle(null)}
                className="px-5 py-2.5 rounded-xl border border-zinc-200 text-sm font-semibold text-zinc-600 hover:bg-zinc-100 transition-colors cursor-pointer"
              >Anuluj</button>
              <button onClick={saveArticle} disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-main text-white text-sm font-semibold hover:brightness-110 transition-all cursor-pointer disabled:opacity-50"
              >{saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />} Zapisz</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function LogsPanel({ token }: { token: string }) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [includeAdmin, setIncludeAdmin] = useState(false);
  const [levelFilter, setLevelFilter] = useState<string | null>(null);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  const fetchLogs = async () => {
    try {
      const params = new URLSearchParams();
      if (includeAdmin) params.set("includeAdmin", "true");
      if (logs.length > 0) params.set("since", String(logs[0].time));
      const res = await fetch(`${API_URL}/admin/logs?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Nie udało się pobrać logów");
      const data = await res.json();
      setLogs((prev) => {
        const existing = new Set(prev.map((l) => l.time + l.msg));
        const newEntries = data.filter((l: LogEntry) => !existing.has(l.time + l.msg));
        return [...newEntries, ...prev].slice(0, 500);
      });
    } catch (err: any) {
      console.error(err);
    }
    setLoading(false);
  };

  useEffect(() => { fetchLogs(); }, [token, includeAdmin]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchLogs, 3000);
    return () => clearInterval(interval);
  }, [autoRefresh, logs.length, includeAdmin, token]);

  const filteredLogs = useMemo(() => {
    let result = logs;
    result = result.filter((l) => !l.url?.startsWith("/admin/logs"));
    if (!includeAdmin) result = result.filter((l) => !l.url?.startsWith("/admin"));
    if (levelFilter) result = result.filter((l) => l.level === levelFilter);
    return result;
  }, [logs, includeAdmin, levelFilter]);

  const levelColor = (level: string) => {
    switch (level) {
      case "error": return "text-red-700 bg-red-50 border-red-200";
      case "warn": return "text-amber-700 bg-amber-50 border-amber-200";
      case "fatal": return "text-red-800 bg-red-100 border-red-300";
      case "debug": return "text-blue-700 bg-blue-50 border-blue-200";
      default: return "text-zinc-600 bg-zinc-50 border-zinc-200";
    }
  };

  const levels = ["error", "warn", "info", "debug", "fatal"] as const;
  const levelCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const l of levels) counts[l] = logs.filter((log) => log.level === l).length;
    return counts;
  }, [logs]);

  return (
    <div>
      <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <label className="flex items-center gap-2 text-sm font-medium text-zinc-600 cursor-pointer select-none">
            <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded border-zinc-300 text-main focus:ring-main/30"
            />
            <RefreshCw size={13} /> Auto
          </label>
          <label className="flex items-center gap-2 text-sm font-medium text-zinc-600 cursor-pointer select-none">
            <input type="checkbox" checked={includeAdmin} onChange={(e) => setIncludeAdmin(e.target.checked)}
              className="rounded border-zinc-300 text-main focus:ring-main/30"
            />
            <Shield size={13} /> Admin
          </label>
          <div className="w-px h-5 bg-zinc-200 mx-1" />
          <span className="flex items-center gap-1 text-xs font-medium text-zinc-500"><Filter size={13} /> Poziom:</span>
          {levels.map((l) => (
            <button key={l} onClick={() => setLevelFilter(levelFilter === l ? null : l)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer border ${
                levelFilter === l ? "ring-2 ring-main/40 " : ""
              }${levelColor(l)}`}
            >
              {levelIcon(l)}
              {l}
              <span className="opacity-60">({levelCounts[l] || 0})</span>
            </button>
          ))}
          {levelFilter && (
            <button onClick={() => setLevelFilter(null)}
              className="text-xs text-zinc-400 hover:text-zinc-600 transition-colors cursor-pointer"
            ><X size={14} /></button>
          )}
        </div>
        <button onClick={fetchLogs}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-zinc-200 text-sm font-semibold text-zinc-600 hover:bg-zinc-50 transition-colors cursor-pointer"
        ><RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Odśwież</button>
      </div>

      <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden shadow-sm">
        <div className="h-[65vh] overflow-y-auto">
          {loading && filteredLogs.length === 0 ? (
            <div className="flex items-center justify-center h-full text-zinc-500">
              <RefreshCw size={16} className="animate-spin mr-2" /> Ładowanie logów...
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="flex items-center justify-center h-full text-zinc-500">
              <Terminal size={16} className="mr-2" /> Brak logów
            </div>
          ) : (
            filteredLogs.map((log, i) => {
              const expanded = expandedIdx === i;
              const entryUrl = (log as any).url;
              return (
                <div key={i} className="border-b border-zinc-100 last:border-b-0">
                  <button onClick={() => setExpandedIdx(expanded ? null : i)}
                    className="w-full flex items-start gap-3 px-4 py-2.5 hover:bg-zinc-50 transition-colors text-left cursor-pointer"
                  >
                    <span className="shrink-0 font-mono text-xs text-zinc-400 w-20 pt-0.5">
                      {new Date(log.time).toLocaleTimeString()}
                    </span>
                    <span className={`shrink-0 w-16 text-center rounded text-[10px] font-bold uppercase leading-5 flex items-center justify-center gap-1 border ${levelColor(log.level)}`}>
                      {levelIcon(log.level)}
                      {log.level}
                    </span>
                    <span className="flex-1 text-xs text-zinc-700 truncate min-w-0">{log.msg}</span>
                    <span className="shrink-0 text-zinc-300 pt-0.5">{expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</span>
                  </button>
                  {expanded && (
                    <div className="px-4 pb-3 ml-[7.5rem] font-mono text-xs space-y-1.5">
                      {entryUrl && (
                        <div className="flex items-start gap-2 text-zinc-500">
                          <span className="font-semibold shrink-0">URL:</span>
                          <span className="break-all text-zinc-600">{entryUrl}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-zinc-500">
                        <span className="font-semibold shrink-0">Czas:</span>
                        <span className="text-zinc-600">{new Date(log.time).toLocaleString()}</span>
                      </div>
                      {log.pid && (
                        <div className="flex items-center gap-2 text-zinc-500">
                          <span className="font-semibold shrink-0">PID:</span>
                          <span className="text-zinc-600">{log.pid}</span>
                        </div>
                      )}
                      <div className="pt-1 border-t border-zinc-100">
                        <div className="flex items-start gap-2 text-zinc-500">
                          <span className="font-semibold shrink-0">Treść:</span>
                          <span className="text-zinc-700 break-all whitespace-pre-wrap">{log.msg}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
        <div className="border-t border-zinc-200 px-4 py-2 text-xs text-zinc-500 flex justify-between items-center bg-zinc-50">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1"><List size={12} /> Linie: {filteredLogs.length} / {logs.length}</span>
            {levelFilter && <span className="text-main font-semibold flex items-center gap-1"><Filter size={12} /> Filtrowane</span>}
          </div>
          {autoRefresh && <span className="text-emerald-600 flex items-center gap-1"><RefreshCw size={12} /> Live</span>}
        </div>
      </div>
    </div>
  );
}
