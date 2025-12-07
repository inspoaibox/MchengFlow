import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import TaskList from '../components/TaskList';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editProject, setEditProject] = useState(null);
  const [form, setForm] = useState({ name: '', description: '' });
  const [activeTab, setActiveTab] = useState('projects');
  const [selectedProject, setSelectedProject] = useState(null);

  useEffect(() => {
    loadProjects();
    if (user?.role === 'admin') loadUsers();
  }, [user]);

  const loadProjects = async () => {
    const { data } = await api.get('/projects');
    setProjects(data);
  };

  const loadUsers = async () => {
    try {
      const { data } = await api.get('/users');
      setUsers(data);
    } catch {}
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (editProject) {
      await api.put(`/projects/${editProject.id}`, form);
    } else {
      await api.post('/projects', form);
    }
    setForm({ name: '', description: '' });
    setShowModal(false);
    setEditProject(null);
    loadProjects();
  };

  const handleDelete = async (id) => {
    if (confirm('确定删除此项目及其所有任务？')) {
      await api.delete(`/projects/${id}`);
      if (selectedProject?.id === id) setSelectedProject(null);
      loadProjects();
    }
  };

  const handleRoleChange = async (userId, role) => {
    await api.put(`/users/${userId}/role`, { role });
    loadUsers();
  };

  const handleDeleteUser = async (userId) => {
    if (confirm('确定删除此用户？')) {
      await api.delete(`/users/${userId}`);
      loadUsers();
    }
  };

  const openEditModal = (project) => {
    setEditProject(project);
    setForm({ name: project.name, description: project.description || '' });
    setShowModal(true);
  };

  const openCreateModal = () => {
    setEditProject(null);
    setForm({ name: '', description: '' });
    setShowModal(true);
  };

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="logo">
          <div className="logo-icon">P</div>
          <h1>项目管理系统</h1>
        </div>
        <div className="user-menu">
          <div className="user-info">
            <div className="user-avatar">{user?.username?.charAt(0).toUpperCase()}</div>
            <div className="user-details">
              <span className="user-name">{user?.username}</span>
              <span className="user-role">{user?.role === 'admin' ? '管理员' : '普通用户'}</span>
            </div>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={logout}>退出登录</button>
        </div>
      </header>

      <div className="dashboard-content">
        {/* Stats */}
        <div className="stats-grid">
          <div className="stat-card primary">
            <h4>项目总数</h4>
            <div className="value">{projects.length}</div>
          </div>
          <div className="stat-card success">
            <h4>用户总数</h4>
            <div className="value">{users.length || '-'}</div>
          </div>
          <div className="stat-card warning">
            <h4>我的角色</h4>
            <div className="value">{user?.role === 'admin' ? '管理员' : '用户'}</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="tabs">
          <button 
            className={`tab-btn ${activeTab === 'projects' ? 'active' : ''}`} 
            onClick={() => setActiveTab('projects')}
          >
            📁 项目管理
          </button>
          {user?.role === 'admin' && (
            <button 
              className={`tab-btn ${activeTab === 'users' ? 'active' : ''}`} 
              onClick={() => setActiveTab('users')}
            >
              👥 用户管理
            </button>
          )}
        </div>

        {/* Projects Tab */}
        {activeTab === 'projects' && (
          <>
            <div style={{ marginBottom: '24px' }}>
              <button className="btn btn-primary" onClick={openCreateModal}>
                + 新建项目
              </button>
            </div>

            {projects.length === 0 ? (
              <div className="card">
                <div className="empty-state">
                  <h3>暂无项目</h3>
                  <p>点击上方按钮创建您的第一个项目</p>
                </div>
              </div>
            ) : (
              <div className="project-grid">
                {projects.map((p) => (
                  <div 
                    key={p.id} 
                    className={`project-card ${selectedProject?.id === p.id ? 'selected' : ''}`}
                  >
                    <div className="project-card-header">
                      <h3 onClick={() => setSelectedProject(selectedProject?.id === p.id ? null : p)}>
                        {p.name}
                      </h3>
                      <p>{p.description || '暂无描述'}</p>
                    </div>
                    <div className="project-card-body">
                      <div className="project-meta">
                        <span>👤 {p.owner_name}</span>
                        <span>•</span>
                        <span>📅 {new Date(p.created_at).toLocaleDateString()}</span>
                      </div>
                      <div className="project-actions">
                        <button className="btn btn-secondary btn-sm" onClick={() => openEditModal(p)}>
                          编辑
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(p.id)}>
                          删除
                        </button>
                        <button 
                          className="btn btn-primary btn-sm" 
                          onClick={() => setSelectedProject(selectedProject?.id === p.id ? null : p)}
                        >
                          {selectedProject?.id === p.id ? '收起任务' : '查看任务'}
                        </button>
                      </div>
                      
                      {selectedProject?.id === p.id && (
                        <TaskList project={p} users={users} />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && user?.role === 'admin' && (
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">用户列表</h3>
              <span className="badge badge-admin">共 {users.length} 位用户</span>
            </div>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>用户名</th>
                    <th>邮箱</th>
                    <th>角色</th>
                    <th>注册时间</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div className="user-avatar">{u.username.charAt(0).toUpperCase()}</div>
                          {u.username}
                        </div>
                      </td>
                      <td>{u.email}</td>
                      <td>
                        <select 
                          value={u.role} 
                          onChange={(e) => handleRoleChange(u.id, e.target.value)}
                          style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #ddd' }}
                        >
                          <option value="user">普通用户</option>
                          <option value="admin">管理员</option>
                        </select>
                      </td>
                      <td>{new Date(u.created_at).toLocaleDateString()}</td>
                      <td>
                        {u.id !== user.id && (
                          <button className="btn btn-danger btn-sm" onClick={() => handleDeleteUser(u.id)}>
                            删除
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
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editProject ? '编辑项目' : '新建项目'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label>项目名称</label>
                  <input 
                    type="text"
                    placeholder="请输入项目名称" 
                    value={form.name} 
                    onChange={(e) => setForm({ ...form, name: e.target.value })} 
                    required 
                  />
                </div>
                <div className="form-group">
                  <label>项目描述</label>
                  <input 
                    type="text"
                    placeholder="请输入项目描述（可选）" 
                    value={form.description} 
                    onChange={(e) => setForm({ ...form, description: e.target.value })} 
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  取消
                </button>
                <button type="submit" className="btn btn-primary">
                  {editProject ? '保存修改' : '创建项目'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
