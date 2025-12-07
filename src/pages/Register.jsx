import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { Sparkles, Loader2, Shield } from 'lucide-react';

export default function Register() {
  const [form, setForm] = useState({ username: '', password: '', email: '' });
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasUsers, setHasUsers] = useState(true);
  const [siteName, setSiteName] = useState('MchengFlow');
  const { register } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // 检查是否已有用户 & 获取网站名称
    const init = async () => {
      try {
        const [usersRes, settingsRes] = await Promise.all([
          api.get('/auth/has-users').catch(() => ({ data: { hasUsers: true } })),
          api.get('/settings/public').catch(() => ({ data: {} }))
        ]);
        setHasUsers(usersRes.data.hasUsers);
        if (settingsRes.data.siteName) setSiteName(settingsRes.data.siteName);
      } catch (err) {
        console.log('Init error');
      }
    };
    init();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const data = await register(form.username, form.password, form.email);
      setMessage(data.message);
      setTimeout(() => navigate('/app'), 1500);
    } catch (err) {
      setError(err.response?.data?.error || '注册失败，请稍后重试');
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

        <h2 className="text-xl font-bold text-slate-800 text-center mb-2">创建账户</h2>
        
        {!hasUsers && (
          <div className="flex items-center justify-center gap-2 text-amber-600 bg-amber-50 px-3 py-2 rounded-lg text-sm mb-6">
            <Shield size={16} />
            <span>首位注册用户将成为管理员</span>
          </div>
        )}
        
        {error && (
          <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm mb-4 border border-red-100">
            {error}
          </div>
        )}
        {message && (
          <div className="bg-emerald-50 text-emerald-600 px-4 py-3 rounded-lg text-sm mb-4 border border-emerald-100">
            {message}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">用户名</label>
            <input 
              type="text"
              placeholder="请输入用户名" 
              value={form.username} 
              onChange={(e) => setForm({ ...form, username: e.target.value })} 
              required 
              className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 transition-all"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">邮箱</label>
            <input 
              type="email" 
              placeholder="请输入邮箱地址" 
              value={form.email} 
              onChange={(e) => setForm({ ...form, email: e.target.value })} 
              required 
              className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 transition-all"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">密码</label>
            <input 
              type="password" 
              placeholder="请设置密码" 
              value={form.password} 
              onChange={(e) => setForm({ ...form, password: e.target.value })} 
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
            {loading ? '注册中...' : '注册'}
          </button>
        </form>
        
        <p className="text-center mt-6 text-slate-500 text-sm">
          已有账号？<Link to="/login" className="text-indigo-600 font-medium hover:underline">立即登录</Link>
        </p>
      </div>
    </div>
  );
}
