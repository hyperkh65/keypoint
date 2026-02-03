'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Settings, Save, Loader2, CheckCircle,
  AlertCircle, ExternalLink, Sparkles, Database,
  Lock, Trash2, Globe, Image as ImageIcon, FileText,
  Clock, Hash, ArrowRight, Zap
} from 'lucide-react';

export default function Dashboard() {
  const [keyword, setKeyword] = useState('');
  const [jobs, setJobs] = useState<any[]>([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<any>({});
  const [isLoading, setIsLoading] = useState(false);

  // Passcode state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [passError, setPassError] = useState(false);

  useEffect(() => {
    const auth = sessionStorage.getItem('merger_auth');
    if (auth === 'true') setIsAuthenticated(true);
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchJobs();
      fetchSettings();
      const interval = setInterval(fetchJobs, 3000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  const fetchJobs = async () => {
    try {
      const res = await fetch('/api/jobs');
      if (!res.ok) throw new Error('API Error');
      const data = await res.json();
      setJobs(data);
    } catch (e) { console.error('Fetch Jobs Failed', e); }
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      setSettings(data);
    } catch (e) { }
  };

  const handleDeleteJob = async (id: string) => {
    if (!confirm('이 기록을 삭제하시겠습니까?')) return;
    try {
      const res = await fetch(`/api/jobs/${id}`, { method: 'DELETE' });
      if (res.ok) fetchJobs();
    } catch (e) { alert('삭제 실패'); }
  };

  const handleLogin = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (passcode === '7759') {
      setIsAuthenticated(true);
      sessionStorage.setItem('merger_auth', 'true');
      setPassError(false);
    } else {
      setPassError(true);
      setPasscode('');
    }
  };

  const handleStart = async () => {
    if (!keyword.trim()) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword }),
      });

      if (!res.ok) throw new Error(`Job creation failed`);

      // Backend automatically starts the job, no need to call /api/jobs/run
      setKeyword('');
      fetchJobs();
    } catch (e: any) {
      alert(`오류 발생: ${e.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const saveSettings = async () => {
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      setIsSettingsOpen(false);
    } catch (e) { alert('설정 저장 실패'); }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center p-6 font-[family-name:var(--font-geist-sans)]">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/10 blur-[120px] rounded-full"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/10 blur-[120px] rounded-full"></div>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="w-full max-w-md bg-white/[0.03] backdrop-blur-2xl border border-white/10 rounded-[3rem] p-12 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)] relative overflow-hidden"
        >
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-indigo-500 to-transparent"></div>

          <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl flex items-center justify-center mb-10 mx-auto shadow-2xl shadow-indigo-500/20">
            <Lock className="text-white" size={36} />
          </div>

          <h1 className="text-3xl font-bold text-center mb-3 bg-clip-text text-transparent bg-gradient-to-b from-white to-white/60">Secure Access</h1>
          <p className="text-slate-500 text-center mb-10 text-sm leading-relaxed">Antigravity Premium Content Merger에 오신 것을 환영합니다. <br />계속하려면 패스코드를 입력하세요.</p>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="group relative">
              <input
                type="password"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                placeholder="••••"
                className={`w-full bg-black/40 border ${passError ? 'border-red-500/50' : 'border-white/10'} group-hover:border-white/20 rounded-2xl px-6 py-5 focus:border-indigo-500 outline-none text-center text-3xl tracking-[1em] transition-all font-mono`}
                autoFocus
              />
            </div>
            {passError && <p className="text-red-400 text-xs text-center font-medium animate-pulse">패코드가 올바르지 않습니다.</p>}

            <button
              type="submit"
              className="w-full bg-white text-black font-bold py-5 rounded-2xl transition-all hover:scale-[1.02] active:scale-[0.98] shadow-xl shadow-white/5 flex items-center justify-center gap-2 group"
            >
              Access System <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-slate-200 p-8 font-[family-name:var(--font-geist-sans)] selection:bg-indigo-500/30">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[10%] left-[20%] w-[30%] h-[30%] bg-indigo-600/5 blur-[150px] rounded-full"></div>
        <div className="absolute bottom-[20%] right-[20%] w-[30%] h-[30%] bg-purple-600/5 blur-[150px] rounded-full"></div>
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <header className="flex justify-between items-center mb-20">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-5"
          >
            <div className="w-14 h-14 bg-white/5 backdrop-blur-md rounded-[1.25rem] border border-white/10 flex items-center justify-center shadow-2xl relative group cursor-pointer overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <Sparkles className="text-white relative z-10 transition-transform group-hover:rotate-12" size={32} />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-4xl font-black tracking-tight text-white">Content Merger <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400 italic">2.0</span></h1>
                <div className="px-2 py-0.5 bg-indigo-500/10 border border-indigo-500/20 rounded-md text-[10px] uppercase font-black text-indigo-400 tracking-tighter">Gemini Ready</div>
              </div>
              <p className="text-slate-500 text-sm font-medium flex items-center gap-2">
                <Zap size={14} className="text-amber-400" /> Professional Grade Large-Scale Content Aggregator
              </p>
            </div>
          </motion.div>

          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 transition-all hover:bg-white/10 text-slate-400 hover:text-white group"
          >
            <Settings size={22} className="group-hover:rotate-90 transition-transform duration-500" />
          </button>
        </header>

        {/* Main Action Area */}
        <section className="max-w-4xl mx-auto mb-24 relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500/20 to-purple-600/20 rounded-[2.5rem] blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-1000"></div>
          <div className="relative bg-white/[0.03] backdrop-blur-3xl border border-white/10 p-3 rounded-[2.8rem] flex items-center shadow-[0_12px_48px_-12px_rgba(0,0,0,0.5)] transition-all group-hover:border-white/20">
            <div className="pl-6 text-slate-500">
              <Search size={26} className="text-indigo-500/50" />
            </div>
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleStart()}
              placeholder="무엇을 수집하고 5,000자로 머지할까요?"
              className="flex-1 bg-transparent border-none focus:ring-0 text-xl px-4 py-6 placeholder:text-slate-600 text-white font-medium"
            />
            <button
              onClick={handleStart}
              disabled={isLoading || !keyword}
              className="bg-white text-black font-black px-10 py-5 rounded-[1.8rem] transition-all shadow-xl hover:scale-[1.02] active:scale-[0.98] disabled:bg-white/10 disabled:text-white/20 disabled:scale-100 flex items-center gap-3 group relative overflow-hidden"
            >
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <Zap size={20} className="fill-black" />
                  <span>Generate Report</span>
                </>
              )}
            </button>
          </div>
          <div className="mt-6 flex justify-center gap-8 text-[11px] font-bold text-slate-600 uppercase tracking-[0.2em]">
            <span className="flex items-center gap-2"><CheckCircle size={12} /> TISTORY IMAGES</span>
            <span className="flex items-center gap-2"><CheckCircle size={12} /> GEMINI AI 2.0</span>
            <span className="flex items-center gap-2"><CheckCircle size={12} /> 5,000+ CHARS</span>
          </div>
        </section>

        {/* Jobs List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <AnimatePresence mode="popLayout">
            {jobs.map((job) => (
              <motion.div
                key={job.id}
                layout
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                transition={{ type: 'spring', damping: 20, stiffness: 100 }}
                className="bg-white/[0.02] border border-white/5 rounded-[2.5rem] p-8 hover:bg-white/[0.04] transition-all group relative"
              >
                <div className="flex justify-between items-start mb-6">
                  <div className="flex gap-2">
                    <StatusBadge status={job.status} />
                  </div>
                  <button
                    onClick={() => handleDeleteJob(job.id)}
                    className="p-2 rounded-xl text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>

                <h3 className="text-2xl font-bold mb-3 text-white tracking-tight leading-tight group-hover:text-indigo-400 transition-colors">
                  {job.keyword}
                </h3>

                <p className="text-sm text-slate-500 mb-8 min-h-[48px] leading-relaxed font-medium">
                  {job.currentStep || 'Ready to start...'}
                </p>

                <div className="flex items-center gap-4 text-[10px] font-black text-slate-600 uppercase mb-8 border-t border-white/5 pt-6">
                  <span className="flex items-center gap-1"><Clock size={12} /> {new Date(job.createdAt).toLocaleDateString()}</span>
                  <span className="flex items-center gap-1"><Hash size={12} /> {job.id.substring(0, 6)}</span>
                </div>

                {job.status === 'COMPLETED' ? (
                  <a
                    href={job.notionUrl}
                    target="_blank"
                    className="w-full flex items-center justify-center gap-3 bg-white text-black py-4 rounded-2xl transition-all font-bold hover:scale-[1.02] active:scale-[0.98] shadow-2xl relative overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-600 opacity-0 hover:opacity-10 transition-opacity"></div>
                    Open in Notion <ExternalLink size={16} />
                  </a>
                ) : job.status === 'FAILED' ? (
                  <div className="w-full bg-red-500/5 text-red-400 p-4 rounded-2xl text-xs font-semibold border border-red-500/20 leading-relaxed italic">
                    <AlertCircle size={14} className="inline mr-2" />
                    {job.errorMessage || 'Unknown system failure'}
                  </div>
                ) : (
                  <div className="w-full h-14 bg-black/40 rounded-2xl overflow-hidden relative border border-white/10 flex items-center px-4">
                    <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-indigo-500 to-purple-500 animate-progress" style={{ width: '10%' }}></div>
                    <span className="relative z-10 text-[10px] font-black text-slate-300 uppercase tracking-widest mx-auto flex items-center gap-2">
                      <Loader2 size={12} className="animate-spin" /> Deep Processing In Progress
                    </span>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Empty State */}
        {jobs.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-40 text-center opacity-30"
          >
            <div className="w-32 h-32 border-2 border-dashed border-white/20 rounded-full flex items-center justify-center mb-6">
              <Database size={48} />
            </div>
            <h2 className="text-xl font-bold mb-2">No Reports Generated</h2>
            <p className="text-sm">Enter a keyword above to start the professional AI merging process.</p>
          </motion.div>
        )}
      </div>

      {/* Settings Modal */}
      <AnimatePresence>
        {isSettingsOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSettingsOpen(false)}
              className="absolute inset-0 bg-black/95 backdrop-blur-xl"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              className="relative w-full max-w-xl bg-white/[0.02] border border-white/10 rounded-[3.5rem] p-12 shadow-[0_48px_96px_-24px_rgba(0,0,0,1)]"
            >
              <div className="flex justify-between items-center mb-10">
                <h2 className="text-3xl font-black flex items-center gap-4 text-white">
                  <div className="w-12 h-12 bg-indigo-500/10 rounded-2xl flex items-center justify-center">
                    <Settings className="text-indigo-500" />
                  </div>
                  System Config
                </h2>
                <button onClick={() => setIsSettingsOpen(false)} className="text-slate-500 hover:text-white transition-colors">
                  Close
                </button>
              </div>

              <div className="space-y-8">
                <SettingInput
                  label="Gemini API Key"
                  value={settings.GEMINI_API_KEY}
                  onChange={(v: string) => setSettings({ ...settings, GEMINI_API_KEY: v })}
                  placeholder="AIzaSy..."
                  type="password"
                  icon={<Sparkles size={16} />}
                />
                <SettingInput
                  label="Notion Integration Token"
                  value={settings.NOTION_TOKEN}
                  onChange={(v: string) => setSettings({ ...settings, NOTION_TOKEN: v })}
                  placeholder="secret_..."
                  type="password"
                  icon={<Database size={16} />}
                />
                <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
                  <SettingInput
                    label="Notion Target DB ID"
                    value={settings.NOTION_DATABASE_ID}
                    onChange={(v: string) => setSettings({ ...settings, NOTION_DATABASE_ID: v })}
                    placeholder="32-digit string"
                    icon={<Globe size={16} />}
                  />
                </div>
              </div>

              <div className="bg-white/5 border border-white/5 rounded-2xl p-6 mt-10 text-[11px] text-slate-500 leading-relaxed italic">
                <AlertCircle size={14} className="inline mr-2 text-indigo-400" />
                API 키는 로컬 데이터베이스에 암호화되어 저장됩니다. Notion 데이터베이스에 'Sources', 'Tags' 속성이 있는지 반드시 확인해 주세요.
              </div>

              <button
                onClick={saveSettings}
                className="w-full mt-12 bg-white text-black font-black py-5 rounded-[1.8rem] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 shadow-2xl shadow-white/5"
              >
                <Save size={20} /> Update System Settings
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <footer className="mt-40 py-20 border-t border-white/5 text-center relative z-10">
        <p className="text-slate-700 text-[10px] font-black uppercase tracking-[0.4em]">Antigravity Intelligence &copy; 2026 Content Merger Suite</p>
      </footer>

      <style jsx global>{`
        @keyframes progress {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(400%); }
        }
        .animate-progress { animation: progress 3s infinite cubic-bezier(0.65, 0, 0.35, 1); }
      `}</style>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const configs: any = {
    PENDING: { color: 'bg-white/5 text-slate-500 border-white/10', icon: <Loader2 size={10} className="animate-spin" /> },
    SCRAPING: { color: 'bg-amber-500/10 text-amber-400 border-amber-500/20', icon: <Globe size={10} /> },
    MERGING: { color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20', icon: <Sparkles size={10} /> },
    SAVING: { color: 'bg-blue-500/10 text-blue-400 border-blue-500/20', icon: <Database size={10} /> },
    COMPLETED: { color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', icon: <CheckCircle size={10} /> },
    FAILED: { color: 'bg-red-500/10 text-red-400 border-red-500/20', icon: <AlertCircle size={10} /> },
  };
  const config = configs[status] || configs.PENDING;
  return (
    <span className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${config.color}`}>
      {config.icon} {status}
    </span>
  );
}

function SettingInput({ label, value, onChange, placeholder, type = "text", icon }: any) {
  return (
    <div className="group">
      <label className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3 ml-1 group-focus-within:text-indigo-400 transition-colors">
        {icon} {label}
      </label>
      <input
        type={type}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-black/40 border border-white/10 group-hover:border-white/20 rounded-2xl px-6 py-4.5 focus:border-indigo-500 outline-none text-white transition-all text-sm font-medium"
      />
    </div>
  );
}
