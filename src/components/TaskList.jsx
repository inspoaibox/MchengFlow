import { useState, useEffect } from 'react';
import api from '../services/api';

export default function TaskList({ project, users }) {
  const [tasks, setTasks] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', assignee_id: '', status: 'pending' });
  const [editTask, setEditTask] = useState(null);

  useEffect(() => {
    loadTasks();
  }, [project.id]);

  const loadTasks = async () => {
    const { data } = await api.get(`/tasks/project/${project.id}`);
    setTasks(data);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (editTask) {
      await api.put(`/tasks/${editTask.id}`, { ...form, project_id: project.id });
    } else {
      await api.post('/tasks', { ...form, project_id: project.id });
    }
    resetForm();
    loadTasks();
  };

  const resetForm = () => {
    setForm({ title: '', description: '', assignee_id: '', status: 'pending' });
    setShowModal(false);
    setEditTask(null);
  };

  const handleStatusChange = async (task, status) => {
    await api.put(`/tasks/${task.id}`, { 
      title: task.title, 
      description: task.description, 
      status, 
      assignee_id: task.assignee_id 
    });
    loadTasks();
  };

  const handleDelete = async (id) => {
    if (confirm('确定删除此任务？')) {
      await api.delete(`/tasks/${id}`);
      loadTasks();
    }
  };

  const openEditModal = (task) => {
    setEditTask(task);
    setForm({ 
      title: task.title, 
      description: task.description || '', 
      assignee_id: task.assignee_id || '', 
      status: task.status 
    });
    setShowModal(true);
  };

  const statusConfig = {
    pending: { label: '待处理', color: '#f59e0b' },
    in_progress: { label: '进行中', color: '#6366f1' },
    done: { label: '已完成', color: '#10b981' }
  };

  return (
    <div className="task-section">
      <div className="task-header">
        <h4>📋 任务列表 ({tasks.length})</h4>
        <button className="btn btn-success btn-sm" onClick={() => { setEditTask(null); setShowModal(true); }}>
          + 添加任务
        </button>
      </div>

      {tasks.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '20px', color: '#9ca3af' }}>
          暂无任务，点击上方按钮添加
        </div>
      ) : (
        <div className="task-list">
          {tasks.map((t) => (
            <div key={t.id} className={`task-item status-${t.status}`}>
              <div className="task-info">
                <h5>{t.title}</h5>
                {t.description && <p>{t.description}</p>}
                <small>👤 {t.assignee_name || '未分配'}</small>
              </div>
              <div className="task-controls">
                <select 
                  value={t.status} 
                  onChange={(e) => handleStatusChange(t, e.target.value)}
                  style={{ 
                    borderColor: statusConfig[t.status].color,
                    color: statusConfig[t.status].color
                  }}
                >
                  {Object.entries(statusConfig).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
                <button className="btn btn-secondary btn-sm" onClick={() => openEditModal(t)}>编辑</button>
                <button className="btn btn-danger btn-sm" onClick={() => handleDelete(t.id)}>删除</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Task Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={resetForm}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editTask ? '编辑任务' : '添加任务'}</h3>
              <button className="modal-close" onClick={resetForm}>&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label>任务标题</label>
                  <input 
                    type="text"
                    placeholder="请输入任务标题" 
                    value={form.title} 
                    onChange={(e) => setForm({ ...form, title: e.target.value })} 
                    required 
                  />
                </div>
                <div className="form-group">
                  <label>任务描述</label>
                  <input 
                    type="text"
                    placeholder="请输入任务描述（可选）" 
                    value={form.description} 
                    onChange={(e) => setForm({ ...form, description: e.target.value })} 
                  />
                </div>
                {users.length > 0 && (
                  <div className="form-group">
                    <label>负责人</label>
                    <select 
                      value={form.assignee_id} 
                      onChange={(e) => setForm({ ...form, assignee_id: e.target.value })}
                      style={{ padding: '12px 16px', border: '2px solid #e5e7eb', borderRadius: '10px', fontSize: '15px' }}
                    >
                      <option value="">未分配</option>
                      {users.map((u) => <option key={u.id} value={u.id}>{u.username}</option>)}
                    </select>
                  </div>
                )}
                {editTask && (
                  <div className="form-group">
                    <label>状态</label>
                    <select 
                      value={form.status} 
                      onChange={(e) => setForm({ ...form, status: e.target.value })}
                      style={{ padding: '12px 16px', border: '2px solid #e5e7eb', borderRadius: '10px', fontSize: '15px' }}
                    >
                      {Object.entries(statusConfig).map(([k, v]) => (
                        <option key={k} value={k}>{v.label}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={resetForm}>取消</button>
                <button type="submit" className="btn btn-primary">{editTask ? '保存修改' : '添加任务'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
