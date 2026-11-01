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

  // LocalStorage Persistence & Cross-Tab Sync
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

  // Audio & Vibration Feedback
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
    } catch (e) {
      // Audio fallback gracefully handled
    }
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
    <div className="max-w-md mx-auto min-h-screen flex flex-col justify-between pb-20 p-4">
      {/* Top Header */}
      <header className="flex items-center justify-between py-4 border-b border-slate-800 mb-6">
        <div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
            Fitness Tracker
          </h1>
          <p className="text-xs text-slate-400">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</p>
        </div>
        <span className="px-2.5 py-1 text-xs font-semibold bg-emerald-500/10 text-emerald-400 rounded-full border border-emerald-500/20">
          Offline Ready
        </span>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 space-y-6">
        {activeTab === 'dashboard' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Today's Habits</h2>
              <span className="text-xs text-slate-500">Tap to toggle</span>
            </div>

            {habits.map(habit => {
              const isDone = !!logs[`${todayStr}_${habit.id}`];
              return (
                <div 
                  key={habit.id}
                  onClick={() => toggleHabit(habit.id)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                    isDone 
                      ? 'bg-indigo-950/30 border-indigo-500/40 text-slate-200' 
                      : 'bg-slate-800/50 border-slate-700/50 text-slate-300 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm ${
                      isDone ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-400'
                    }`}>
                      {isDone ? '✓' : habit.title.charAt(0)}
                    </div>
                    <div>
                      <h3 className={`font-semibold text-sm ${isDone ? 'line-through text-slate-400' : ''}`}>
                        {habit.title}
                      </h3>
                      <span className="text-xs text-slate-500">{habit.category}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-medium text-amber-400">🔥 {habit.streak}d streak</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'add' && (
          <form onSubmit={addHabit} className="bg-slate-800/40 p-5 rounded-2xl border border-slate-700/50 space-y-4">
            <h2 className="text-base font-bold text-slate-200">Create New Habit</h2>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Habit Title</label>
              <input 
                type="text" 
                value={newHabit.title}
                onChange={(e) => setNewHabit({ ...newHabit, title: e.target.value })}
                placeholder="e.g. Morning Pushups" 
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Category</label>
                <select 
                  value={newHabit.category}
                  onChange={(e) => setNewHabit({ ...newHabit, category: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none"
                >
                  <option>General</option>
                  <option>Cardio</option>
                  <option>Gym</option>
                  <option>Hydration</option>
                  <option>Recovery</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Unit</label>
                <input 
                  type="text" 
                  value={newHabit.unit}
                  onChange={(e) => setNewHabit({ ...newHabit, unit: e.target.value })}
                  placeholder="e.g. mins, reps" 
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none"
                />
              </div>
            </div>
            <button 
              type="submit" 
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors mt-2"
            >
              Save Habit
            </button>
          </form>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-4">
            <div className="bg-slate-800/40 p-5 rounded-2xl border border-slate-700/50 space-y-3">
              <h2 className="text-base font-bold text-slate-200">Data & Backup</h2>
              <p className="text-xs text-slate-400">Your data stays 100% locally on your device. Export to JSON for manual backup across devices.</p>
              
              <div className="flex gap-3 pt-2">
                <button 
                  onClick={exportData}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 text-xs font-semibold py-2 px-3 rounded-lg text-slate-200"
                >
                  Export Backup
                </button>
                <label className="flex-1 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 text-xs font-semibold py-2 px-3 rounded-lg text-center cursor-pointer">
                  Import Backup
                  <input type="file" accept=".json" onChange={importData} className="hidden" />
                </label>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-slate-900/90 backdrop-blur-md border-t border-slate-800 p-2 flex justify-around">
        <button 
          onClick={() => setActiveTab('dashboard')} 
          className={`p-2 text-xs font-medium flex flex-col items-center gap-1 ${activeTab === 'dashboard' ? 'text-indigo-400' : 'text-slate-500'}`}
        >
          <span>Dashboard</span>
        </button>
        <button 
          onClick={() => setActiveTab('add')} 
          className={`p-2 text-xs font-medium flex flex-col items-center gap-1 ${activeTab === 'add' ? 'text-indigo-400' : 'text-slate-500'}`}
        >
          <span>+ Add Habit</span>
        </button>
        <button 
          onClick={() => setActiveTab('settings')} 
          className={`p-2 text-xs font-medium flex flex-col items-center gap-1 ${activeTab === 'settings' ? 'text-indigo-400' : 'text-slate-500'}`}
        >
          <span>Settings</span>
        </button>
      </nav>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
