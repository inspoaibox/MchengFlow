import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { 
  Users, Settings, Shield, Trash2, ArrowLeft, 
  Database, Save, Loader2, CheckCircle, Plus,
  Cpu, RefreshCw, ToggleLeft, ToggleRight, X, Edit2
} from 'lucide-react';

export default function Admin() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [channels, setChannels] = useState([]);
  const [allModels, setAllModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  
  // 渠道表单
  const [showChannelModal, setShowChannelModal] = useState(false);
  const [editingChannel, setEditingChannel] = useState(null);
  const [channelForm, setChannelForm] = useState({
    name: '', type: 'openai', base_url: '', api_key: ''
  });
  const [fetchingModels, setFetchingModels] = useState(null);
  
  // 系统设置
  const [settings, setSettings] = useState({
    siteName: 'GeminiFlow',
    allowRegistration: true,
    defaultRole: 'user',
    defaultModel: '',
    allowedFileTypes: '.pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.gif,.zip',
    maxFileSize: 10
  });

  useEffect(() => {
    if (user?.role !== 'admin') {
      navigate('/app');
      return;
    }
    loadData();
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    await Promise.all([loadUsers(), loadChannels(), loadSettings(), loadAllModels()]);
    setLoading(false);
  };

  const loadUsers = async () => {
    try {
      const { data } = await api.get('/users');
      setUsers(data);
    } catch (err) { console.error(err); }
  };

  const loadChannels = async () => {
    try {
      const { data } = await api.get('/channels');
      setChannels(data);
    } catch (err) { console.error(err); }
  };

  const loadAllModels = async () => {
    try {
      const { data } = await api.get('/channels/all-models');
      setAllModels(data);
    } catch (err) { console.error(err); }
  };

  const loadSettings = async () => {
    try {
      const { data } = await api.get('/settings');
      if (data) setSettings(data);
    } catch (err) { console.error(err); }
  };

  const handleRoleChange = async (userId, role) => {
    try {
      await api.put(`/users/${userId}/role`, { role });
      loadUsers();
      showMsg('角色更新成功');
    } catch (err) {
      showMsg(err.response?.data?.error || '更新失败', true);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!confirm('确定删除此用户？')) return;
    try {
      await api.delete(`/users/${userId}`);
      loadUsers();
      showMsg('用户已删除');
    } catch (err) {
      showMsg(err.response?.data?.error || '删除失败', true);
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      await api.put('/settings', settings);
      showMsg('设置已保存');
    } catch (err) {
      showMsg('保存失败', true);
    } finally {
      setSaving(false);
    }
  };

  // 渠道管理
  const openChannelModal = (channel = null) => {
    if (channel) {
      setEditingChannel(channel);
      setChannelForm({
        name: channel.name,
        type: channel.type,
        base_url: channel.base_url || '',
        api_key: channel.api_key
      });
    } else {
      setEditingChannel(null);
      setChannelForm({ name: '', type: 'openai', base_url: '', api_key: '' });
    }
    setShowChannelModal(true);
  };

  const handleSaveChannel = async () => {
    if (!channelForm.name || !channelForm.api_key) {
      showMsg('请填写名称和 API Key', true);
      return;
    }
    
    try {
      if (editingChannel) {
        await api.put(`/channels/${editingChannel.id}`, channelForm);
        showMsg('渠道更新成功');
      } else {
        await api.post('/channels', channelForm);
        showMsg('渠道添加成功');
      }
      setShowChannelModal(false);
      loadChannels();
      loadAllModels();
    } catch (err) {
      showMsg(err.response?.data?.error || '操作失败', true);
    }
  };

  const handleDeleteChannel = async (id) => {
    if (!confirm('确定删除此渠道？')) return;
    try {
      await api.delete(`/channels/${id}`);
      loadChannels();
      loadAllModels();
      showMsg('渠道已删除');
    } catch (err) {
      showMsg('删除失败', true);
    }
  };

  const handleToggleChannel = async (channel) => {
    try {
      await api.put(`/channels/${channel.id}`, { ...channel, enabled: !channel.enabled });
      loadChannels();
      loadAllModels();
    } catch (err) {
      showMsg('操作失败', true);
    }
  };

  const handleFetchModels = async (channelId) => {
    setFetchingModels(channelId);
    try {
      const { data } = await api.post(`/channels/${channelId}/fetch-models`);
      showMsg(data.message);
      loadChannels();
      loadAllModels();
    } catch (err) {
      showMsg(err.response?.data?.error || '获取模型失败', true);
    } finally {
      setFetchingModels(null);
    }
  };

  const handleRemoveModel = async (channel, modelId) => {
    const newModels = channel.models.filter(m => m.id !== modelId);
    try {
      await api.put(`/channels/${channel.id}`, { ...channel, models: newModels });
      loadChannels();
      loadAllModels();
    } catch (err) {
      showMsg('删除模型失败', true);
    }
  };

  const showMsg = (text, isError = false) => {
    setMessage({ text, isError });
    setTimeout(() => setMessage(''), 3000);
  };

  const tabs = [
    { id: 'users', label: '用户管理', icon: Users },
    { id: 'channels', label: '渠道管理', icon: Cpu },
    { id: 'settings', label: '系统设置', icon: Settings },
  ];

  const channelTypes = [
    { id: 'openai', name: 'OpenAI', placeholder: 'https://api.openai.com/v1' },
    { id: 'openai-compatible', name: 'OpenAI 兼容 (第三方中转)', placeholder: 'https://your-proxy.com/v1' },
    { id: 'gemini', name: 'Google Gemini', placeholder: '' },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/app')} className="flex items-center gap-2 text-slate-600 hover:text-slate-800">
            <ArrowLeft size={20} />
            <span className="font-medium">返回应用</span>
          </button>
          <div className="h-6 w-px bg-slate-200" />
          <div className="flex items-center gap-2">
            <Shield size={20} className="text-indigo-600" />
            <h1 className="text-lg font-bold text-slate-800">后台管理</h1>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-500">管理员: <span className="font-medium text-slate-700">{user?.username}</span></span>
          <button onClick={logout} className="text-sm text-red-600 hover:text-red-700 font-medium">退出登录</button>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r border-slate-200 min-h-[calc(100vh-65px)] p-4">
          <nav className="space-y-1">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all ${
                  activeTab === tab.id ? 'bg-indigo-50 text-indigo-600 font-medium' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <tab.icon size={20} />
                {tab.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-8">
          {message && (
            <div className={`fixed top-20 right-6 px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-in z-50 ${
              message.isError ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white'
            }`}>
              <CheckCircle size={18} />
              {message.text}
            </div>
          )}

          {/* Users Tab */}
          {activeTab === 'users' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-slate-800">用户管理</h2>
                  <p className="text-slate-500 text-sm mt-1">管理系统中的所有用户账户</p>
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase">用户</th>
                      <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase">邮箱</th>
                      <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase">角色</th>
                      <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase">注册时间</th>
                      <th className="text-right px-6 py-4 text-xs font-semibold text-slate-500 uppercase">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {users.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-violet-500 rounded-full flex items-center justify-center text-white font-semibold">
                              {u.username.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-medium text-slate-800">{u.username}</div>
                              {u.id === user.id && <span className="text-xs text-indigo-600">(当前用户)</span>}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-slate-600">{u.email}</td>
                        <td className="px-6 py-4">
                          <select 
                            value={u.role} 
                            onChange={(e) => handleRoleChange(u.id, e.target.value)}
                            disabled={u.id === user.id}
                            className={`px-3 py-1.5 rounded-lg border text-sm font-medium ${
                              u.role === 'admin' ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-slate-50 border-slate-200 text-slate-600'
                            } ${u.id === user.id ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                          >
                            <option value="user">普通用户</option>
                            <option value="admin">管理员</option>
                          </select>
                        </td>
                        <td className="px-6 py-4 text-slate-500 text-sm">{new Date(u.created_at).toLocaleDateString('zh-CN')}</td>
                        <td className="px-6 py-4 text-right">
                          {u.id !== user.id && (
                            <button onClick={() => handleDeleteUser(u.id)} className="text-slate-400 hover:text-red-500 p-2 hover:bg-red-50 rounded-lg">
                              <Trash2 size={18} />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Channels Tab */}
          {activeTab === 'channels' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-slate-800">渠道管理</h2>
                  <p className="text-slate-500 text-sm mt-1">配置 AI 模型接口，支持 OpenAI、Gemini 及第三方中转</p>
                </div>
                <button onClick={() => openChannelModal()} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700">
                  <Plus size={18} /> 添加渠道
                </button>
              </div>

              <div className="space-y-4">
                {channels.length === 0 ? (
                  <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                    <Cpu size={48} className="mx-auto text-slate-300 mb-4" />
                    <h3 className="text-lg font-medium text-slate-700 mb-2">暂无渠道</h3>
                    <p className="text-slate-500 text-sm">点击上方按钮添加您的第一个 AI 渠道</p>
                  </div>
                ) : (
                  channels.map(channel => (
                    <div key={channel.id} className={`bg-white rounded-xl border shadow-sm overflow-hidden ${channel.enabled ? 'border-slate-200' : 'border-slate-200 opacity-60'}`}>
                      <div className="p-5 flex items-center justify-between border-b border-slate-100">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            channel.type === 'gemini' ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600'
                          }`}>
                            <Cpu size={20} />
                          </div>
                          <div>
                            <h3 className="font-semibold text-slate-800">{channel.name}</h3>
                            <p className="text-xs text-slate-500">
                              {channelTypes.find(t => t.id === channel.type)?.name} 
                              {channel.base_url && ` • ${channel.base_url}`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleFetchModels(channel.id)}
                            disabled={fetchingModels === channel.id}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 disabled:opacity-50"
                          >
                            <RefreshCw size={14} className={fetchingModels === channel.id ? 'animate-spin' : ''} />
                            获取模型
                          </button>
                          <button onClick={() => openChannelModal(channel)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg">
                            <Edit2 size={16} />
                          </button>
                          <button onClick={() => handleToggleChannel(channel)} className="p-2 text-slate-400 hover:text-slate-600">
                            {channel.enabled ? <ToggleRight size={24} className="text-emerald-500" /> : <ToggleLeft size={24} />}
                          </button>
                          <button onClick={() => handleDeleteChannel(channel.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                      
                      {channel.models.length > 0 && (
                        <div className="p-4 bg-slate-50">
                          <div className="text-xs font-medium text-slate-500 mb-2">可用模型 ({channel.models.length})</div>
                          <div className="flex flex-wrap gap-2">
                            {channel.models.map(model => (
                              <span key={model.id} className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs text-slate-600">
                                {model.name || model.id}
                                <button onClick={() => handleRemoveModel(channel, model.id)} className="text-slate-400 hover:text-red-500">
                                  <X size={12} />
                                </button>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div>
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-slate-800">系统设置</h2>
                <p className="text-slate-500 text-sm mt-1">配置系统全局参数</p>
              </div>

              <div className="space-y-6 max-w-2xl">
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                  <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                    <Database size={20} className="text-indigo-600" />
                    基本设置
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">站点名称</label>
                      <input 
                        type="text"
                        value={settings.siteName}
                        onChange={(e) => setSettings({ ...settings, siteName: e.target.value })}
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500"
                      />
                    </div>
                    <div className="flex items-center justify-between py-3 border-t border-slate-100">
                      <div>
                        <div className="font-medium text-slate-700">允许新用户注册</div>
                        <div className="text-sm text-slate-500">关闭后只有管理员可以创建账户</div>
                      </div>
                      <button
                        onClick={() => setSettings({ ...settings, allowRegistration: !settings.allowRegistration })}
                        className={`relative w-12 h-6 rounded-full transition-colors ${settings.allowRegistration ? 'bg-indigo-600' : 'bg-slate-300'}`}
                      >
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${settings.allowRegistration ? 'translate-x-7' : 'translate-x-1'}`} />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                  <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                    <Cpu size={20} className="text-indigo-600" />
                    默认 AI 模型
                  </h3>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">系统调用模型</label>
                    <select
                      value={settings.defaultModel}
                      onChange={(e) => setSettings({ ...settings, defaultModel: e.target.value })}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 bg-white"
                    >
                      <option value="">未配置</option>
                      {allModels.map(m => (
                        <option key={m.fullId} value={m.fullId}>
                          [{m.channelName}] {m.modelName}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-slate-500 mt-1">选择一个模型作为前端 AI 功能的统一调用出口</p>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                  <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                    <Database size={20} className="text-indigo-600" />
                    附件设置
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">允许的文件格式</label>
                      <input 
                        type="text"
                        value={settings.allowedFileTypes}
                        onChange={(e) => setSettings({ ...settings, allowedFileTypes: e.target.value })}
                        placeholder=".pdf,.doc,.docx,.png,.jpg"
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500"
                      />
                      <p className="text-xs text-slate-500 mt-1">用逗号分隔，例如：.pdf,.doc,.docx,.png,.jpg</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">最大文件大小 (MB)</label>
                      <input 
                        type="number"
                        value={settings.maxFileSize}
                        onChange={(e) => setSettings({ ...settings, maxFileSize: parseInt(e.target.value) || 10 })}
                        min="1"
                        max="100"
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500"
                      />
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleSaveSettings}
                  disabled={saving}
                  className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 text-white py-3 rounded-xl font-medium hover:shadow-lg flex items-center justify-center gap-2 disabled:opacity-70"
                >
                  {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                  {saving ? '保存中...' : '保存设置'}
                </button>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Channel Modal */}
      {showChannelModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-800">{editingChannel ? '编辑渠道' : '添加渠道'}</h3>
              <button onClick={() => setShowChannelModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">渠道名称</label>
                <input
                  type="text"
                  value={channelForm.name}
                  onChange={(e) => setChannelForm({ ...channelForm, name: e.target.value })}
                  placeholder="例如：OpenAI 官方、中转站A"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">渠道类型</label>
                <select
                  value={channelForm.type}
                  onChange={(e) => setChannelForm({ ...channelForm, type: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 bg-white"
                >
                  {channelTypes.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
              {channelForm.type !== 'gemini' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Base URL</label>
                  <input
                    type="text"
                    value={channelForm.base_url}
                    onChange={(e) => setChannelForm({ ...channelForm, base_url: e.target.value })}
                    placeholder={channelTypes.find(t => t.id === channelForm.type)?.placeholder}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500"
                  />
                  <p className="text-xs text-slate-500 mt-1">OpenAI 官方可留空，第三方中转需填写</p>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">API Key</label>
                <input
                  type="password"
                  value={channelForm.api_key}
                  onChange={(e) => setChannelForm({ ...channelForm, api_key: e.target.value })}
                  placeholder="输入 API Key"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500"
                />
              </div>
            </div>
            <div className="p-6 border-t border-slate-100 flex gap-3">
              <button onClick={() => setShowChannelModal(false)} className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 font-medium">
                取消
              </button>
              <button onClick={handleSaveChannel} className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium">
                {editingChannel ? '保存修改' : '添加渠道'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
