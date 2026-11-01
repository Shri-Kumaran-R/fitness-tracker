const { useState, useEffect, useRef } = React;

const DEFAULT_HABITS = [
  { id: '1', title: 'Daily Walk / Run', target: 1, unit: 'sessions', category: 'Cardio', icon: 'Flame', streak: 3 },
  { id: '2', title: 'Strength Training', target: 45, unit: 'mins', category: 'Gym', icon: 'Dumbbell', streak: 5 },
  { id: '3', title: 'Drink 3L Water', target: 3000, unit: 'ml', category: 'Hydration', icon: 'Droplets', streak: 12 },
  { id: '4', title: '8 Hours Sleep', target: 8, unit: 'hrs', category: 'Recovery', icon: 'Moon', streak: 1 }
];

function App() {
  const [habits, setHabits] = useState(() => {
    const saved = localStorage.getItem('pwa_habits');
    return saved ? JSON.parse(saved) : DEFAULT_HABITS;
  });

  const [logs, setLogs] = useState(() => {
    const saved = localStorage.getItem('pwa_habit_logs');
    return saved ? JSON.parse(saved) : {};
  });

  const [activeTab, setActiveTab] = useState('dashboard');
  const [newHabit, setNewHabit] = useState({ title: '', unit: 'mins', category: 'General' });

  useEffect(() => {
    localStorage.setItem('pwa_habits', JSON.stringify(habits));
    localStorage.setItem('pwa_habit_logs', JSON.stringify(logs));
    const channel = new BroadcastChannel('habit_tracker_sync');
    channel.postMessage({ habits, logs });
    return () => channel.close();
  }, [habits, logs]);

  useEffect(() => {
    const channel = new BroadcastChannel('habit_tracker_sync');
    channel.onmessage = (e) => {
      if (e.data.habits) setHabits(e.data.habits);
      if (e.data.logs) setLogs(e.data.logs);
    };
    return () => channel.close();
  }, []);

  const todayStr = new Date().toISOString().split('T')[0];

  const triggerFeedback = () => {
    if ('vibrate' in navigator) navigator.vibrate(50);
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    } catch (e) {}
  };

  const toggleHabit = (id) => {
    triggerFeedback();
    const key = `${todayStr}_${id}`;
    setLogs(prev => {
      const updated = { ...prev };
      if (updated[key]) {
        delete updated[key];
      } else {
        updated[key] = { completed: true, timestamp: new Date().toISOString() };
      }
      return updated;
    });
  };

  const addHabit = (e) => {
    e.preventDefault();
    if (!newHabit.title.trim()) return;
    const created = {
      id: Date.now().toString(),
      title: newHabit.title,
      target: 1,
      unit: newHabit.unit,
      category: newHabit.category,
      icon: 'Activity',
      streak: 0
    };
    setHabits([...habits, created]);
    setNewHabit({ title: '', unit: 'mins', category: 'General' });
    setActiveTab('dashboard');
  };

  const exportData = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({ habits, logs }));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `fitness_backup_${todayStr}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const importData = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        if (parsed.habits && parsed.logs) {
          setHabits(parsed.habits);
          setLogs(parsed.logs);
          alert('Backup restored successfully!');
        }
      } catch (err) {
        alert('Invalid backup JSON file.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="flex h-screen bg-slate-900 text-slate-100 overflow-hidden">
      
      {/* Desktop Sidebar (Hidden on Mobile) */}
      <aside className="hidden md:flex flex-col w-64 border-r border-slate-800 bg-slate-900 p-6 space-y-8 z-10">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
            Tracker
          </h1>
          <span className="inline-block mt-2 px-2.5 py-1 text-[10px] uppercase tracking-wider font-semibold bg-emerald-500/10 text-emerald-400 rounded-full border border-emerald-500/20">
            Offline PWA
          </span>
        </div>
        <nav className="flex flex-col space-y-2">
          <button onClick={() => setActiveTab('dashboard')} className={`text-left px-4 py-3 rounded-xl transition font-medium ${activeTab === 'dashboard' ? 'bg-indigo-600/20 text-indigo-400' : 'text-slate-400 hover:bg-slate-800'}`}>
            Dashboard
          </button>
          <button onClick={() => setActiveTab('add')} className={`text-left px-4 py-3 rounded-xl transition font-medium ${activeTab === 'add' ? 'bg-indigo-600/20 text-indigo-400' : 'text-slate-400 hover:bg-slate-800'}`}>
            + Add Habit
          </button>
          <button onClick={() => setActiveTab('settings')} className={`text-left px-4 py-3 rounded-xl transition font-medium ${activeTab === 'settings' ? 'bg-indigo-600/20 text-indigo-400' : 'text-slate-400 hover:bg-slate-800'}`}>
            Settings
          </button>
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        
        {/* Mobile Header (Hidden on Desktop) */}
        <header className="md:hidden flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/90 backdrop-blur-md z-10">
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
              Fitness Tracker
            </h1>
            <p className="text-xs text-slate-400">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</p>
          </div>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-10 pb-24 md:pb-10">
          <div className="max-w-6xl mx-auto space-y-6">
            
            {/* Desktop Greeting (Hidden on Mobile) */}
            <div className="hidden md:block mb-8">
              <h2 className="text-3xl font-bold text-slate-100">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</h2>
              <p className="text-slate-400 mt-2 text-sm">Welcome back. Here is your activity for today.</p>
            </div>

            {activeTab === 'dashboard' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between md:hidden">
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Today's Habits</h2>
                </div>
                
                {/* Responsive Grid: 1 col on mobile, 2 on tablet, 3 on wide desktop */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {habits.map(habit => {
                    const isDone = !!logs[`${todayStr}_${habit.id}`];
                    return (
                      <div 
                        key={habit.id}
                        onClick={() => toggleHabit(habit.id)}
                        className={`p-5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between shadow-sm hover:scale-[1.02] active:scale-[0.98] ${
                          isDone 
                            ? 'bg-indigo-950/40 border-indigo-500/50 text-slate-200' 
                            : 'bg-slate-800/40 border-slate-700/50 text-slate-300 hover:border-slate-600'
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg shadow-inner ${
                            isDone ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-400'
                          }`}>
                            {isDone ? '✓' : habit.title.charAt(0)}
                          </div>
                          <div>
                            <h3 className={`font-semibold text-base ${isDone ? 'line-through text-slate-400' : ''}`}>
                              {habit.title}
                            </h3>
                            <span className="text-xs text-slate-500 font-medium">{habit.category}</span>
                          </div>
                        </div>
                        <div className="text-right flex flex-col items-end">
                          <span className="text-xs font-bold text-amber-400 bg-amber-400/10 px-2.5 py-1 rounded-lg">🔥 {habit.streak}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {activeTab === 'add' && (
              <div className="max-w-md md:max-w-lg">
                <form onSubmit={addHabit} className="bg-slate-800/40 p-6 md:p-8 rounded-3xl border border-slate-700/50 space-y-5 shadow-lg">
                  <h2 className="text-lg font-bold text-slate-200 border-b border-slate-700/50 pb-3">Create New Habit</h2>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">Habit Title</label>
                    <input 
                      type="text" 
                      value={newHabit.title}
                      onChange={(e) => setNewHabit({ ...newHabit, title: e.target.value })}
                      placeholder="e.g. Morning Pushups" 
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-100 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1.5">Category</label>
                      <select 
                        value={newHabit.category}
                        onChange={(e) => setNewHabit({ ...newHabit, category: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-100 focus:outline-none focus:border-indigo-500 transition-all appearance-none"
                      >
                        <option>General</option>
                        <option>Cardio</option>
                        <option>Gym</option>
                        <option>Hydration</option>
                        <option>Recovery</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1.5">Unit (Optional)</label>
                      <input 
                        type="text" 
                        value={newHabit.unit}
                        onChange={(e) => setNewHabit({ ...newHabit, unit: e.target.value })}
                        placeholder="e.g. mins, reps" 
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-100 focus:outline-none focus:border-indigo-500 transition-all"
                      />
                    </div>
                  </div>
                  <button 
                    type="submit" 
                    className="w-full bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-semibold py-3.5 rounded-xl text-sm transition-colors mt-4 shadow-lg shadow-indigo-900/20"
                  >
                    Save Habit
                  </button>
                </form>
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="max-w-md md:max-w-2xl space-y-4">
                <div className="bg-slate-800/40 p-6 md:p-8 rounded-3xl border border-slate-700/50 space-y-4 shadow-lg">
                  <h2 className="text-lg font-bold text-slate-200">Data & Backup</h2>
                  <p className="text-sm text-slate-400 leading-relaxed">Your data stays 100% locally on this device. You can export a JSON backup to transfer your streaks and logs to another phone or computer.</p>
                  
                  <div className="flex gap-4 pt-4">
                    <button 
                      onClick={exportData}
                      className="flex-1 bg-slate-700 hover:bg-slate-600 text-sm font-semibold py-3 px-4 rounded-xl text-slate-200 transition-colors"
                    >
                      Export Data
                    </button>
                    <label className="flex-1 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 text-sm font-semibold py-3 px-4 rounded-xl text-center cursor-pointer transition-colors">
                      Import Data
                      <input type="file" accept=".json" onChange={importData} className="hidden" />
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Bottom Navigation (Hidden on Desktop) */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900/90 backdrop-blur-md border-t border-slate-800 p-2 flex justify-around z-20 pb-safe">
          <button onClick={() => setActiveTab('dashboard')} className={`p-2 text-xs font-medium flex flex-col items-center gap-1.5 ${activeTab === 'dashboard' ? 'text-indigo-400' : 'text-slate-500'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>
            <span>Dashboard</span>
          </button>
          <button onClick={() => setActiveTab('add')} className={`p-2 text-xs font-medium flex flex-col items-center gap-1.5 ${activeTab === 'add' ? 'text-indigo-400' : 'text-slate-500'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
            <span>Add</span>
          </button>
          <button onClick={() => setActiveTab('settings')} className={`p-2 text-xs font-medium flex flex-col items-center gap-1.5 ${activeTab === 'settings' ? 'text-indigo-400' : 'text-slate-500'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
            <span>Settings</span>
          </button>
        </nav>
      </main>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
