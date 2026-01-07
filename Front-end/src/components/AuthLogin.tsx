import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import '../styles.css';

const AuthLogin = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const isHistoryLogin = location.pathname === '/login/history' || location.pathname === '/history-login';

  useEffect(() => {
    const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
    const isHistoryAuthenticated = localStorage.getItem('isHistoryAuthenticated') === 'true';

    if (isAuthenticated && !isHistoryLogin) {
      navigate('/dashboard');
    } else if (isHistoryAuthenticated && isHistoryLogin) {
      navigate('/history');
    }
  }, [navigate, location, isHistoryLogin]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isHistoryLogin) {
      if (username === 'VCET' && password === 'cyshis') {
        localStorage.setItem('isHistoryAuthenticated', 'true');
        navigate('/history');
      } else {
        setError('Invalid username or password');
      }
    } else {
      if (username === 'AdminAttendance' && password === 'cysdas') {
        localStorage.setItem('isAuthenticated', 'true');
        navigate('/dashboard');
      } else {
        setError('Invalid username or password');
      }
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#0f0f1a] bg-mesh flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="gradient-border">
          <div className="glass-effect p-8 rounded-xl relative">
            <div className="spotlight"></div>
            <h2 className="text-2xl font-bold text-center text-gradient mb-8">
              {isHistoryLogin ? 'View Attendance History' : 'Login'}
            </h2>
            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label className="block text-indigo-300 text-sm font-medium mb-2">
                  Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-[#11111b]/50 text-white border border-indigo-500/20 rounded-lg px-4 py-2
                    focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                  placeholder="Enter username"
                />
              </div>
              <div>
                <label className="block text-indigo-300 text-sm font-medium mb-2">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#11111b]/50 text-white border border-indigo-500/20 rounded-lg px-4 py-2
                    focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                  placeholder="Enter password"
                />
              </div>
              {error && (
                <p className="text-red-400 text-sm">{error}</p>
              )}
              <div className="flex gap-4">
                <button
                  type="submit"
                  className="flex-1 button-gradient text-white px-6 py-2 rounded-lg hover-glow"
                >
                  {isHistoryLogin ? 'View History' : 'Login'}
                </button>
                {isHistoryLogin && (
                  <button
                    type="button"
                    onClick={() => navigate('/')}
                    className="flex-1 bg-[#11111b]/50 text-indigo-300 border border-indigo-500/20 px-6 py-2 rounded-lg 
                      hover:bg-indigo-500/20 transition-all duration-200"
                  >
                    Back to Dashboard
                  </button>
                )}
                
              </div>
            </form>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default AuthLogin; 
