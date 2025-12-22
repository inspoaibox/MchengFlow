import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { Sparkles, Loader2, Github } from 'lucide-react';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [siteName, setSiteName] = useState('MchengFlow');
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/settings/public').then(res => {
      if (res.data.siteName) setSiteName(res.data.siteName);
    }).catch(() => {});
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(username, password);
      navigate('/app');
    } catch (err) {
      setError(err.response?.data?.error || '登录失败，请检查用户名和密码');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
            <Sparkles size={22} />
          </div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
            {siteName}
          </h1>
        </div>

        <h2 className="text-xl font-bold text-slate-800 text-center mb-2">欢迎回来</h2>
        <p className="text-slate-500 text-center mb-6">登录您的账户继续使用</p>
        
        {error && (
          <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm mb-4 border border-red-100">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">用户名</label>
            <input 
              type="text"
              placeholder="请输入用户名" 
              value={username} 
              onChange={(e) => setUsername(e.target.value)} 
              required 
              className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 transition-all"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">密码</label>
            <input 
              type="password" 
              placeholder="请输入密码" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
              className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 transition-all"
            />
          </div>
          
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 text-white py-3 rounded-xl font-medium hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-70"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : null}
            {loading ? '登录中...' : '登录'}
          </button>
        </form>
        
        <p className="text-center mt-6 text-slate-500 text-sm">
          还没有账号？<Link to="/register" className="text-indigo-600 font-medium hover:underline">立即注册</Link>
        </p>
      </div>
      
      <a 
        href="https://github.com/inspoaibox/MchengFlow" 
        target="_blank" 
        rel="noopener noreferrer"
        className="fixed bottom-3 left-1/2 -translate-x-1/2 text-white/60 hover:text-white transition-colors"
      >
        <Github size={18} />
      </a>
    </div>
  );
}
