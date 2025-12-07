import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import api from './services/api';
import { 
  Plus, 
  MoreHorizontal, 
  Calendar, 
  CheckSquare, 
  MessageSquare, 
  Sparkles, 
  X, 
  ChevronRight, 
  ChevronLeft, 
  Trash2,
  Tag,
  Loader2,
  Wand2,
  Send,
  Bot,
  GripVertical,
  Clock,
  LayoutGrid,
  ArrowLeft,
  Briefcase,
  FolderOpen,
  ClipboardList,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Clock3,
  Coffee,
  Shield,
  LogOut,
  Paperclip,
  Download,
  FileText,
  Upload,
  DatabaseBackup
} from 'lucide-react';

/**
 * AI API UTILITIES
 */
let aiConfig = null;

const SYSTEM_INSTRUCTION = `你是一个嵌入在看板应用中的智能项目管理助手。
你的目标是帮助用户分解任务，明确需求，并提供可执行的建议。
请始终使用**中文**回答。保持简洁、专业且乐于助人。`;

// 统一 AI 调用
async function callAI(messages, options = {}) {
  if (!aiConfig?.configured) {
    return null;
  }
  const { type, baseUrl, apiKey, model } = aiConfig;
  try {
    if (type === 'gemini') {
      const contents = messages.map(m => ({
        role: m.role === 'assistant' ? 'model' : m.role,
        parts: [{ text: m.content }]
      }));
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents,
            systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
            ...(options.json && { generationConfig: { responseMimeType: "application/json", responseSchema: options.schema } })
          })
        }
      );
      const data = await response.json();
      if (data.error) throw new Error(data.error.message);
      return data.candidates?.[0]?.content?.parts?.[0]?.text;
    } else {
      const url = baseUrl || 'https://api.openai.com/v1';
      const response = await fetch(`${url}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({
          model,
          messages: [{ role: 'system', content: SYSTEM_INSTRUCTION }, ...messages],
          ...(options.json && { response_format: { type: 'json_object' } })
        })
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error.message);
      return data.choices?.[0]?.message?.content;
    }
  } catch (error) {
    console.error("AI API Error:", error);
    throw error;
  }
}

async function callGeminiJSON(prompt, schema) {
  try {
    const result = await callAI([{ role: 'user', content: prompt }], { json: true, schema });
    if (result === null) {
      // AI 未配置，返回模拟数据
      await new Promise(r => setTimeout(r, 1500));
      if (prompt.includes("项目")) {
        return {
          description: "这是一个由模拟 AI 生成的项目计划，旨在展示自动化立项功能。",
          tasks: [
            { title: "需求调研与分析", column: "todo", tags: ["规划", "重要"] },
            { title: "制定执行时间表", column: "todo", tags: ["管理"] },
            { title: "资源预算审批", column: "backlog", tags: ["财务"] },
            { title: "项目启动会议", column: "in-progress", tags: ["会议"] }
          ]
        };
      }
      return {
        description: "这是模拟的 AI 回复。请在后台配置 AI 模型。",
        subtasks: ["模拟子任务 1", "模拟子任务 2", "配置 AI 模型"],
        tags: ["模拟数据", "演示"]
      };
    }
    return JSON.parse(result);
  } catch (error) {
    console.error("callGeminiJSON error:", error);
    // AI 调用失败，返回模拟数据
    if (prompt.includes("项目")) {
      return {
        description: "AI 调用失败，使用默认项目描述。",
        tasks: [
          { title: "任务规划", column: "todo", tags: ["规划"] },
          { title: "开始执行", column: "backlog", tags: ["执行"] }
        ]
      };
    }
    throw error;
  }
}

async function callGeminiChat(history, newMessage, taskContext) {
  const contextPrompt = `当前任务背景: 标题: "${taskContext.title}". 描述: "${taskContext.description}". 截止日期: "${taskContext.dueDate || '无'}". 优先级: "${taskContext.priority}". 请用中文回答。`;
  const messages = [
    { role: 'user', content: contextPrompt },
    { role: 'assistant', content: '明白了，我准备好协助处理这个任务了。' },
    ...history.map(msg => ({ role: msg.sender === 'user' ? 'user' : 'assistant', content: msg.text })),
    { role: 'user', content: newMessage }
  ];
  const result = await callAI(messages);
  return result || "AI 未配置，请管理员在后台设置 AI 模型。";
}

async function callGeminiText(prompt) {
  const result = await callAI([{ role: 'user', content: prompt }]);
  if (result === null) {
    await new Promise(r => setTimeout(r, 1500));
    return "【模拟日报】\n\n今日工作总结：\n1. 完成了重要且紧急的任务。\n2. 推进了计划中的工作。\n\n（AI 未配置，请在后台设置模型）";
  }
  return result;
}

/**
 * COMPONENTS
 */

// --- Modal Component ---
const Modal = ({ isOpen, onClose, children, size = "md" }) => {
  if (!isOpen) return null;
  const maxWidth = size === "lg" ? "max-w-4xl" : "max-w-2xl";
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className={`bg-white rounded-xl shadow-2xl w-full ${maxWidth} max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200`}>
        {children}
      </div>
    </div>
  );
};

// --- Project Card Component ---
const ProjectCard = ({ project, taskStats, onClick, onDelete }) => {
    const progress = taskStats.total > 0 ? Math.round((taskStats.done / taskStats.total) * 100) : 0;
    
    return (
        <div 
            onClick={onClick}
            className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-lg hover:border-indigo-300 transition-all cursor-pointer group relative flex flex-col h-[200px]"
        >
            <div className="flex justify-between items-start mb-3">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                    <Briefcase size={20} />
                </div>
                <button 
                    onClick={(e) => { e.stopPropagation(); onDelete(project.id); }}
                    className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                    <Trash2 size={18} />
                </button>
            </div>
            
            <h3 className="text-lg font-bold text-slate-800 mb-2 line-clamp-1">{project.title}</h3>
            <p className="text-slate-500 text-sm line-clamp-2 mb-4 flex-1">
                {project.description || "暂无项目描述"}
            </p>
            
            <div className="mt-auto">
                <div className="flex justify-between text-xs text-slate-500 mb-1.5">
                    <span>进度 ({progress}%)</span>
                    <span>{taskStats.done}/{taskStats.total} 任务</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div 
                        className="bg-gradient-to-r from-indigo-500 to-violet-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            </div>
        </div>
    );
};

// --- Task Card Component ---
const TaskCard = ({ task, onMove, onDelete, onClick, onDragStart, minimalist = false }) => {
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date().setHours(0,0,0,0) && task.column !== 'done';
  const isDueToday = task.dueDate && new Date(task.dueDate).toDateString() === new Date().toDateString();

  if (minimalist) {
      return (
        <div 
            onClick={onClick}
            draggable="true"
            onDragStart={(e) => { e.stopPropagation(); onDragStart(e, task.id); }}
            className="bg-white p-3 rounded shadow-sm border border-slate-200 hover:shadow-md cursor-grab active:cursor-grabbing text-sm group"
        >
            <div className="flex justify-between gap-2">
                <span className={`font-medium line-clamp-2 ${task.column === 'done' ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                    {task.title}
                </span>
                {task.column === 'done' && <CheckCircle2 size={16} className="text-emerald-500 flex-shrink-0" />}
            </div>
            <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400">
                 <span>{task.tags[0] || ""}</span>
                 {task.dueDate && <span className={isOverdue ? 'text-red-500' : ''}>{new Date(task.dueDate).toLocaleDateString('zh-CN', {month:'numeric', day:'numeric'})}</span>}
            </div>
        </div>
      );
  }

  return (
    <div 
      onClick={onClick}
      draggable="true"
      onDragStart={(e) => { e.stopPropagation(); onDragStart(e, task.id); }}
      className={`group bg-white p-4 rounded-lg shadow-sm border hover:shadow-md transition-all cursor-grab active:cursor-grabbing relative ${isOverdue ? 'border-red-200' : 'border-slate-200 hover:border-indigo-300'}`}
    >
      <div className="flex justify-between items-start mb-2">
        <h3 className={`font-semibold text-slate-800 line-clamp-2 pr-6 ${task.column === 'done' ? 'line-through opacity-60' : ''}`}>{task.title}</h3>
        <button 
          onClick={(e) => { e.stopPropagation(); onDelete(task.id); }}
          className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity absolute top-4 right-4"
        >
          <Trash2 size={16} />
        </button>
      </div>
      
      <p className="text-slate-500 text-sm mb-3 line-clamp-2 min-h-[1.25rem]">
        {task.description || "暂无描述。"}
      </p>

      <div className="flex items-center gap-2 mb-3 flex-wrap">
        {task.tags.map((tag, idx) => (
          <span key={idx} className="text-[10px] px-2 py-1 bg-indigo-50 text-indigo-600 rounded-full font-medium">
            {tag}
          </span>
        ))}
      </div>

      <div className="flex items-center justify-between text-slate-400 text-xs mt-auto pt-2 border-t border-slate-50">
        <div className="flex gap-3 items-center">
          <div className="flex items-center gap-1" title="子任务进度">
            <CheckSquare size={14} />
            <span>{task.subtasks.filter(t => t.done).length}/{task.subtasks.length}</span>
          </div>
          
          {task.dueDate && (
            <div 
              className={`flex items-center gap-1 ${isOverdue ? 'text-red-500 font-medium' : isDueToday ? 'text-amber-500 font-medium' : ''}`}
              title={isOverdue ? "已过期" : "截止日期"}
            >
              <Calendar size={14} />
              <span>
                {new Date(task.dueDate).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })}
              </span>
            </div>
          )}

          {task.chatHistory.length > 0 && (
            <div className="flex items-center gap-1 text-indigo-500">
              <MessageSquare size={14} />
              <span>{task.chatHistory.length}</span>
            </div>
          )}
        </div>
        
        <div className="text-slate-300">
          <GripVertical size={14} />
        </div>
      </div>
    </div>
  );
};

// --- Main Application ---
export default function App() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  // --- STATE ---
  const [currentView, setCurrentView] = useState('projects');
  const [activeProjectId, setActiveProjectId] = useState(null);
  
  // Calendar & Daily State
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [viewDate, setViewDate] = useState(new Date());
  
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [dataLoaded, setDataLoaded] = useState(false);

  // Site settings
  const [siteName, setSiteName] = useState('MchengFlow');

  // Load data on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const [aiRes, settingsRes, projectsRes, tasksRes] = await Promise.all([
          api.get('/channels/default').catch(() => ({ data: null })),
          api.get('/settings/public').catch(() => ({ data: {} })),
          api.get('/projects'),
          api.get('/tasks')
        ]);
        aiConfig = aiRes.data;
        if (settingsRes.data.siteName) {
          setSiteName(settingsRes.data.siteName);
        }
        setProjects(projectsRes.data || []);
        setTasks(tasksRes.data || []);
        setDataLoaded(true);
      } catch (err) {
        console.log('Could not load data', err);
        setDataLoaded(true);
      }
    };
    loadData();
  }, []);

  // Modal State
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isDailyReportOpen, setIsDailyReportOpen] = useState(false);
  const [dailyReport, setDailyReport] = useState('');
  
  // Daily view filter: 'all' | 'project' | 'standalone'
  const [dailyFilter, setDailyFilter] = useState('all');
  const [quickTaskInput, setQuickTaskInput] = useState('');
  
  // Attachments state
  const [attachments, setAttachments] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  
  // Backup modal state
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef(null);
  

  const [activeTask, setActiveTask] = useState(null);
  const [activeTab, setActiveTab] = useState('details'); 
  
  // New Project State
  const [newProjectTitle, setNewProjectTitle] = useState("");
  const [newProjectGoal, setNewProjectGoal] = useState("");
  
  // Chat & AI State
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Column Definitions
  const columns = [
    { id: 'backlog', title: '积压工作', color: 'bg-slate-100' },
    { id: 'todo', title: '待办事项', color: 'bg-blue-50' },
    { id: 'in-progress', title: '进行中', color: 'bg-indigo-50' },
    { id: 'done', title: '已完成', color: 'bg-emerald-50' }
  ];

  // Quadrant Definitions
  const quadrants = [
      { id: 'p1', title: '重要且紧急', subtitle: '立即做', color: 'bg-red-50', headerColor: 'text-red-700', icon: AlertCircle },
      { id: 'p2', title: '重要不紧急', subtitle: '计划做', color: 'bg-amber-50', headerColor: 'text-amber-700', icon: Calendar },
      { id: 'p3', title: '紧急不重要', subtitle: '授权做', color: 'bg-blue-50', headerColor: 'text-blue-700', icon: Clock3 },
      { id: 'p4', title: '不重要不紧急', subtitle: '稍后做', color: 'bg-slate-50', headerColor: 'text-slate-600', icon: Coffee },
  ];

  // --- DERIVED STATE ---
  const activeProject = projects.find(p => p.id === activeProjectId);
  const projectTasks = tasks.filter(t => t.projectId === activeProjectId);

  // --- HELPERS ---
  const getProjectStats = (pid) => {
      const pTasks = tasks.filter(t => t.projectId === pid);
      return {
          total: pTasks.length,
          done: pTasks.filter(t => t.column === 'done').length
      };
  };

  const updateTaskStatus = (task, newColumn) => {
    let updates = { column: newColumn };
    // Track completion time
    if (newColumn === 'done' && task.column !== 'done') {
        updates.completedAt = new Date().toISOString();
    } else if (newColumn !== 'done' && task.column === 'done') {
        updates.completedAt = null;
    }
    return { ...task, ...updates };
  };

  const moveTask = (taskId, direction) => {
    setTasks(prev => prev.map(t => {
      if (t.id !== taskId) return t;
      const colIdx = columns.findIndex(c => c.id === t.column);
      const newIdx = Math.max(0, Math.min(columns.length - 1, colIdx + direction));
      const newColumn = columns[newIdx].id;
      return updateTaskStatus(t, newColumn);
    }));
  };

  // Drag and Drop Logic
  const handleDragStart = (e, taskId) => {
    e.dataTransfer.setData("text/plain", taskId.toString());
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.dropEffect = "move";
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDropColumn = async (e, columnId) => {
    e.preventDefault();
    e.stopPropagation();
    const taskId = parseInt(e.dataTransfer.getData("text/plain"));
    if (taskId) {
      const task = tasks.find(t => t.id === taskId);
      if (task) {
        const updated = updateTaskStatus(task, columnId);
        setTasks(prev => prev.map(t => t.id === taskId ? updated : t));
        try {
          await api.put(`/tasks/${taskId}`, updated);
        } catch (err) {
          console.error('Failed to update task', err);
        }
      }
    }
  };

  const handleDropQuadrant = async (e, priorityId) => {
    e.preventDefault();
    e.stopPropagation();
    const taskId = parseInt(e.dataTransfer.getData("text/plain"));
    if (taskId) {
      const task = tasks.find(t => t.id === taskId);
      if (task) {
        const updated = { ...task, priority: priorityId };
        setTasks(prev => prev.map(t => t.id === taskId ? updated : t));
        try {
          await api.put(`/tasks/${taskId}`, updated);
        } catch (err) {
          console.error('Failed to update task', err);
        }
      }
    }
  };

  const addTask = async (columnId) => {
    const newTask = {
      projectId: activeProjectId,
      title: "新任务",
      description: "",
      column: columnId,
      dueDate: new Date().toISOString().split('T')[0],
      priority: 'p2',
      completedAt: null,
      subtasks: [],
      tags: [],
      chatHistory: []
    };
    try {
      const res = await api.post('/tasks', newTask);
      const created = res.data;
      setTasks([...tasks, created]);
      openTask(created);
    } catch (err) {
      console.error('Failed to create task', err);
    }
  };

  // 添加独立任务（不属于任何项目）
  const addStandaloneTask = async (priority = 'p2') => {
    const newTask = {
      projectId: null,
      title: "新任务",
      description: "",
      column: 'todo',
      dueDate: viewDate.toISOString().split('T')[0],
      priority: priority,
      completedAt: null,
      subtasks: [],
      tags: [],
      chatHistory: []
    };
    try {
      const res = await api.post('/tasks', newTask);
      const created = res.data;
      setTasks([...tasks, created]);
      openTask(created);
    } catch (err) {
      console.error('Failed to create task', err);
    }
  };

  const deleteTask = async (id) => {
    try {
      await api.delete(`/tasks/${id}`);
      setTasks(prev => prev.filter(t => t.id !== id));
      if (activeTask?.id === id) setIsTaskModalOpen(false);
    } catch (err) {
      console.error('Failed to delete task', err);
    }
  };
  
  const deleteProject = async (id) => {
    if (confirm("确定要删除此项目及其所有任务吗？")) {
      try {
        await api.delete(`/projects/${id}`);
        setProjects(prev => prev.filter(p => p.id !== id));
        setTasks(prev => prev.filter(t => t.projectId !== id));
      } catch (err) {
        console.error('Failed to delete project', err);
      }
    }
  };

  const openTask = async (task) => {
    setActiveTask(task);
    setActiveTab('details');
    setIsTaskModalOpen(true);
    // Load attachments
    try {
      const res = await api.get(`/attachments/task/${task.id}`);
      setAttachments(res.data || []);
    } catch (err) {
      console.error('Failed to load attachments', err);
      setAttachments([]);
    }
  };
  
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !activeTask) return;
    
    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const res = await api.post(`/attachments/task/${activeTask.id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setAttachments([res.data, ...attachments]);
    } catch (err) {
      console.error('Upload failed', err);
      alert(err.response?.data?.error || '上传失败');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };
  
  const handleDeleteAttachment = async (id) => {
    if (!confirm('确定删除此附件？')) return;
    try {
      await api.delete(`/attachments/${id}`);
      setAttachments(attachments.filter(a => a.id !== id));
    } catch (err) {
      console.error('Delete failed', err);
    }
  };
  
  const handleDownloadAttachment = async (id, filename) => {
    try {
      const res = await api.get(`/attachments/download/${id}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download failed', err);
      alert('下载失败');
    }
  };
  
  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const updateActiveTask = async (updates) => {
    const updated = { ...activeTask, ...updates };
    setActiveTask(updated);
    setTasks(prev => prev.map(t => t.id === updated.id ? updated : t));
    // Save to backend
    try {
      await api.put(`/tasks/${updated.id}`, updated);
    } catch (err) {
      console.error('Failed to update task', err);
    }
  };

  // --- CALENDAR LOGIC ---
  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

  const handlePrevMonth = () => {
    setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1));
  };

  const renderCalendarGrid = () => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const startingDay = firstDay; 

    const days = [];
    for (let i = 0; i < startingDay; i++) {
        days.push(<div key={`pad-${i}`} className="bg-slate-50 border border-slate-100 min-h-[120px]"></div>);
    }

    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dayTasks = tasks.filter(t => t.dueDate === dateStr);
        const isToday = new Date().toDateString() === new Date(year, month, day).toDateString();

        days.push(
            <div key={day} className={`bg-white border border-slate-200 min-h-[120px] p-2 hover:bg-slate-50 transition-colors relative group ${isToday ? 'bg-indigo-50/30' : ''}`}>
                <div className={`text-xs font-semibold mb-2 flex justify-between ${isToday ? 'text-indigo-600' : 'text-slate-500'}`}>
                    <span className={`w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-indigo-600 text-white' : ''}`}>
                        {day}
                    </span>
                    {dayTasks.length > 0 && <span className="text-[10px] bg-slate-100 px-1.5 rounded text-slate-400">{dayTasks.length} 任务</span>}
                </div>
                <div className="space-y-1">
                    {dayTasks.map(task => {
                        const isDone = task.column === 'done';
                        const isOverdue = !isDone && new Date(task.dueDate) < new Date().setHours(0,0,0,0);
                        return (
                            <button 
                                key={task.id}
                                onClick={() => openTask(task)}
                                className={`w-full text-left text-[11px] px-2 py-1.5 rounded border truncate transition-all flex items-center gap-1.5
                                    ${isDone 
                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-100 line-through opacity-70' 
                                        : isOverdue
                                            ? 'bg-red-50 text-red-700 border-red-100 font-medium'
                                            : 'bg-white text-slate-700 border-slate-200 shadow-sm hover:border-indigo-300 hover:text-indigo-600'
                                    }
                                `}
                            >
                                <div className={`w-1.5 h-1.5 rounded-full ${isDone ? 'bg-emerald-400' : isOverdue ? 'bg-red-400' : 'bg-slate-300'}`}></div>
                                {task.title}
                            </button>
                        );
                    })}
                </div>
            </div>
        );
    }
    return days;
  };

  // --- DAILY RECORD LOGIC ---
  const handlePrevDay = () => {
    const newDate = new Date(viewDate);
    newDate.setDate(viewDate.getDate() - 1);
    setViewDate(newDate);
  };

  const handleNextDay = () => {
    const newDate = new Date(viewDate);
    newDate.setDate(viewDate.getDate() + 1);
    setViewDate(newDate);
  };

  const handleGenerateDailyReport = async () => {
    const dateStr = viewDate.toISOString().split('T')[0];
    const todaysTasks = tasks.filter(t => t.dueDate === dateStr || (t.completedAt && t.completedAt.startsWith(dateStr)));
    
    setIsGenerating(true);
    const prompt = `
        请根据今天的四象限任务数据为我生成一份“四色图日报”总结：
        日期：${dateStr}
        
        【第一象限（重要且紧急）完成情况】：
        ${todaysTasks.filter(t => t.priority === 'p1').map(t => `- [${t.column === 'done' ? '已完成' : '进行中'}] ${t.title}`).join('\n') || "无"}
        
        【第二象限（重要不紧急）推进情况】：
        ${todaysTasks.filter(t => t.priority === 'p2').map(t => `- [${t.column === 'done' ? '已完成' : '进行中'}] ${t.title}`).join('\n') || "无"}
        
        请分析我今天的时间分配是否合理（理想情况应多关注第二象限），并给出简短建议。
    `;

    try {
        const report = await callGeminiText(prompt);
        setDailyReport(report);
        setIsDailyReportOpen(true);
    } catch (e) {
        setDailyReport("日报生成失败，请重试。");
        setIsDailyReportOpen(true);
    } finally {
        setIsGenerating(false);
    }
  };
  
  const copyDailyReport = async () => {
    await navigator.clipboard.writeText(dailyReport);
  };
  
  // 快速添加任务到收集箱
  const handleQuickAddTask = async (e) => {
    e.preventDefault();
    if (!quickTaskInput.trim()) return;
    
    try {
      const res = await api.post('/tasks', {
        projectId: null,
        title: quickTaskInput.trim(),
        description: '',
        column: 'todo',
        dueDate: viewDate.toISOString().split('T')[0],
        priority: 'p2',
        subtasks: [],
        tags: [],
        chatHistory: []
      });
      setTasks([...tasks, res.data]);
      setQuickTaskInput('');
    } catch (err) {
      console.error('Failed to create quick task', err);
    }
  };
  
  // 筛选任务
  const filterDailyTasks = (taskList) => {
    if (dailyFilter === 'project') {
      return taskList.filter(t => t.projectId != null);
    } else if (dailyFilter === 'standalone') {
      return taskList.filter(t => t.projectId == null);
    }
    return taskList;
  };

  // --- GEMINI ACTIONS ---

  // 1. Task Expand
  const handleMagicExpand = async () => {
    if (!activeTask.title) return;
    setIsGenerating(true);
    
    const prompt = `
      我有一个任务标题为 "${activeTask.title}".
      截止日期为 "${activeTask.dueDate || '未设置'}".
      请生成一段专业、可执行的描述（中文，最多2句话）。
      生成 3-5 个具体的子任务（检查清单项）。
      生成 2-3 个相关的简短标签（例如 "设计", "紧急"）。
      返回 JSON 格式，包含键名: description, subtasks (字符串数组), tags (字符串数组)。
    `;

    const schema = {
      type: "OBJECT",
      properties: {
        description: { type: "STRING" },
        subtasks: { type: "ARRAY", items: { type: "STRING" } },
        tags: { type: "ARRAY", items: { type: "STRING" } }
      },
      required: ["description", "subtasks", "tags"]
    };

    try {
      const result = await callGeminiJSON(prompt, schema);
      const newSubtasks = result.subtasks.map(text => ({ text, done: false }));
      const mergedTags = [...new Set([...activeTask.tags, ...result.tags])];
      updateActiveTask({
        description: result.description,
        subtasks: [...activeTask.subtasks, ...newSubtasks],
        tags: mergedTags
      });
    } catch (e) {
      alert("生成内容失败，请重试。");
    } finally {
      setIsGenerating(false);
    }
  };

  // 2. Chat
  const handleChatSubmit = async (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMsg = { sender: 'user', text: chatInput };
    const newHistory = [...activeTask.chatHistory, userMsg];
    
    updateActiveTask({ chatHistory: newHistory });
    setChatInput("");
    setIsChatLoading(true);

    try {
      const responseText = await callGeminiChat(activeTask.chatHistory, chatInput, activeTask);
      const botMsg = { sender: 'ai', text: responseText };
      updateActiveTask({ chatHistory: [...newHistory, botMsg] });
    } catch (e) {
      const errorMsg = { sender: 'ai', text: "抱歉，我在思考回答时遇到了困难。" };
      updateActiveTask({ chatHistory: [...newHistory, errorMsg] });
    } finally {
      setIsChatLoading(false);
    }
  };

  // 3. Project Generation
  const handleCreateProjectWithAI = async () => {
      if (!newProjectTitle.trim()) return;
      setIsGenerating(true);

      const prompt = `
        我想要创建一个新项目，标题是: "${newProjectTitle}".
        项目目标/额外上下文: "${newProjectGoal}".
        请生成一个简短的项目描述（中文）。
        并生成 4-6 个初始看板任务，包含标题、建议的列（backlog, todo, in-progress）、和标签。
        返回 JSON: { description: string, tasks: [{ title, column, tags: [] }] }
      `;

      const schema = {
          type: "OBJECT",
          properties: {
              description: { type: "STRING" },
              tasks: {
                  type: "ARRAY",
                  items: {
                      type: "OBJECT",
                      properties: {
                          title: { type: "STRING" },
                          column: { type: "STRING" },
                          tags: { type: "ARRAY", items: { type: "STRING" } }
                      }
                  }
              }
          }
      };

      try {
          const result = await callGeminiJSON(prompt, schema);
          
          // Create project in backend
          const projectRes = await api.post('/projects', {
              title: newProjectTitle,
              description: result.description || newProjectGoal
          });
          const newProject = projectRes.data;

          // Create tasks in backend
          const createdTasks = [];
          for (const t of result.tasks) {
              const taskRes = await api.post('/tasks', {
                  projectId: newProject.id,
                  title: t.title,
                  description: "AI 自动生成的初始任务",
                  column: t.column || 'todo',
                  dueDate: new Date().toISOString().split('T')[0],
                  priority: 'p2',
                  subtasks: [],
                  tags: t.tags || [],
                  chatHistory: []
              });
              createdTasks.push(taskRes.data);
          }

          setProjects([...projects, newProject]);
          setTasks([...tasks, ...createdTasks]);
          
          setIsProjectModalOpen(false);
          setNewProjectTitle("");
          setNewProjectGoal("");
          setActiveProjectId(newProject.id);
          setCurrentView('board');

      } catch (e) {
          console.error(e);
          alert("AI 立项失败，已创建空项目。");
          try {
              const projectRes = await api.post('/projects', {
                  title: newProjectTitle,
                  description: newProjectGoal
              });
              setProjects([...projects, projectRes.data]);
              setActiveProjectId(projectRes.data.id);
              setCurrentView('board');
          } catch (err) {
              console.error('Failed to create project', err);
          }
          setIsProjectModalOpen(false);
      } finally {
          setIsGenerating(false);
      }
  };

  const chatEndRef = useRef(null);
  useEffect(() => {
    if (activeTab === 'chat') {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeTask?.chatHistory, activeTab]);

  // 导出数据
  const handleExportData = async () => {
    setIsExporting(true);
    try {
      const res = await api.get('/backup/export');
      const dataStr = JSON.stringify(res.data, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `geminiflow-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed', err);
      alert('导出失败');
    } finally {
      setIsExporting(false);
    }
  };

  // 导入数据
  const handleImportData = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsImporting(true);
    try {
      const text = await file.text();
      const importData = JSON.parse(text);
      
      if (!importData.data || !importData.version) {
        throw new Error('无效的备份文件格式');
      }
      
      const mode = confirm('选择导入模式：\n\n确定 = 合并（保留现有数据）\n取消 = 覆盖（删除现有数据）') ? 'merge' : 'replace';
      
      const res = await api.post('/backup/import', { data: importData.data, mode });
      alert(`导入成功！\n项目: ${res.data.imported.projects} 个\n任务: ${res.data.imported.tasks} 个`);
      
      // 重新加载数据
      const [projectsRes, tasksRes] = await Promise.all([
        api.get('/projects'),
        api.get('/tasks')
      ]);
      setProjects(projectsRes.data || []);
      setTasks(tasksRes.data || []);
      setIsBackupModalOpen(false);
    } catch (err) {
      console.error('Import failed', err);
      alert('导入失败: ' + (err.message || '未知错误'));
    } finally {
      setIsImporting(false);
      e.target.value = '';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-indigo-100">
      
      {/* Top Navigation Bar */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm h-[73px]">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-md shadow-indigo-200">
              <Sparkles size={18} />
            </div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent hidden sm:block">
              {siteName}
            </h1>
          </div>

          <div className="flex items-center text-sm font-medium pl-6 border-l border-slate-200 ml-2 gap-2 md:gap-4 overflow-x-auto no-scrollbar">
            <button 
                onClick={() => setCurrentView('projects')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all whitespace-nowrap ${currentView === 'projects' ? 'bg-indigo-50 text-indigo-600 font-bold' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}
            >
                <LayoutGrid size={16} /> 项目大厅
            </button>
            <button 
                onClick={() => setCurrentView('calendar')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all whitespace-nowrap ${currentView === 'calendar' ? 'bg-indigo-50 text-indigo-600 font-bold' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}
            >
                <Calendar size={16} /> 日历视图
            </button>
            <button 
                onClick={() => setCurrentView('daily')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all whitespace-nowrap ${currentView === 'daily' ? 'bg-indigo-50 text-indigo-600 font-bold' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}
            >
                <ClipboardList size={16} /> 每日记录
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
             <button 
                onClick={() => setIsProjectModalOpen(true)}
                className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-all shadow-md hover:shadow-lg text-sm font-medium whitespace-nowrap"
            >
                <Plus size={18} /> 新建项目
            </button>
            
            {/* User Menu */}
            <div className="relative group">
              <button className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-50 transition-all">
                <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-violet-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                  {user?.username?.charAt(0).toUpperCase()}
                </div>
                <span className="text-sm font-medium text-slate-700 hidden md:block">{user?.username}</span>
              </button>
              
              <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl shadow-lg border border-slate-200 py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                <div className="px-4 py-2 border-b border-slate-100">
                  <div className="font-medium text-slate-800">{user?.username}</div>
                  <div className="text-xs text-slate-500">{user?.email}</div>
                </div>
                
                {user?.role === 'admin' && (
                  <button 
                    onClick={() => navigate('/admin')}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    <Shield size={16} /> 后台管理
                  </button>
                )}
                
                <button 
                  onClick={() => setIsBackupModalOpen(true)}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  <DatabaseBackup size={16} /> 备份与导入
                </button>
                
                <button 
                  onClick={logout}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut size={16} /> 退出登录
                </button>
              </div>
            </div>
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="p-6 h-[calc(100vh-73px)] overflow-hidden bg-slate-50/50">
        
        {/* VIEW: PROJECT LIST */}
        {currentView === 'projects' && (
            <div className="max-w-7xl mx-auto h-full overflow-y-auto pb-20">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800">所有项目</h2>
                        <p className="text-slate-500 text-sm mt-1">管理您的工作流与目标</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {projects.map(project => (
                        <ProjectCard 
                            key={project.id} 
                            project={project}
                            taskStats={getProjectStats(project.id)}
                            onClick={() => {
                                setActiveProjectId(project.id);
                                setCurrentView('board');
                            }}
                            onDelete={deleteProject}
                        />
                    ))}
                </div>
            </div>
        )}

        {/* VIEW: CALENDAR */}
        {currentView === 'calendar' && (
            <div className="max-w-7xl mx-auto h-full overflow-hidden flex flex-col bg-white rounded-xl shadow-sm border border-slate-200">
                <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50/50">
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <Calendar size={20} className="text-indigo-600" />
                        {calendarDate.getFullYear()} 年 {calendarDate.getMonth() + 1} 月
                    </h2>
                    <div className="flex gap-2">
                        <button onClick={handlePrevMonth} className="p-2 hover:bg-white rounded-lg border border-slate-200 shadow-sm text-slate-600"><ChevronLeft size={16} /></button>
                        <button onClick={() => setCalendarDate(new Date())} className="px-3 py-1.5 hover:bg-white rounded-lg border border-slate-200 shadow-sm text-sm font-medium text-slate-600">今天</button>
                        <button onClick={handleNextMonth} className="p-2 hover:bg-white rounded-lg border border-slate-200 shadow-sm text-slate-600"><ChevronRight size={16} /></button>
                    </div>
                </div>
                
                <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-slate-500 text-sm font-medium text-center py-2">
                    <div>周日</div><div>周一</div><div>周二</div><div>周三</div><div>周四</div><div>周五</div><div>周六</div>
                </div>

                <div className="flex-1 overflow-y-auto">
                    <div className="grid grid-cols-7 auto-rows-fr">
                        {renderCalendarGrid()}
                    </div>
                </div>
            </div>
        )}

        {/* VIEW: DAILY RECORD (FOUR QUADRANT) */}
        {currentView === 'daily' && (
            <div className="max-w-7xl mx-auto h-full overflow-hidden flex flex-col gap-4">
                 {/* Quick Add & Date Header */}
                 <div className="flex items-center gap-4">
                    {/* Quick Add Input */}
                    <form onSubmit={handleQuickAddTask} className="flex-1 flex gap-2">
                      <input
                        type="text"
                        value={quickTaskInput}
                        onChange={(e) => setQuickTaskInput(e.target.value)}
                        placeholder="快速添加任务，按回车确认..."
                        className="flex-1 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 shadow-sm"
                      />
                      <button
                        type="submit"
                        disabled={!quickTaskInput.trim()}
                        className="px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        <Plus size={16} /> 添加
                      </button>
                    </form>
                 </div>
                 
                 {/* Date & Filter Header */}
                 <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl shadow-sm border border-slate-200">
                        <button onClick={handlePrevDay} className="p-1.5 rounded-full hover:bg-slate-100 text-slate-500"><ChevronLeft size={18} /></button>
                        <div className="text-center min-w-[100px]">
                            <h2 className="text-base font-bold text-slate-800">
                                {viewDate.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' })}
                            </h2>
                            <p className="text-[10px] text-slate-500 font-medium">
                                {viewDate.toLocaleDateString('zh-CN', { weekday: 'long' })}
                            </p>
                        </div>
                        <button onClick={handleNextDay} className="p-1.5 rounded-full hover:bg-slate-100 text-slate-500"><ChevronRight size={18} /></button>
                      </div>
                      
                      {/* Filter Tabs */}
                      <div className="flex bg-white rounded-lg border border-slate-200 p-1 shadow-sm">
                        <button
                          onClick={() => setDailyFilter('all')}
                          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${dailyFilter === 'all' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                          全部
                        </button>
                        <button
                          onClick={() => setDailyFilter('project')}
                          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${dailyFilter === 'project' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                          项目任务
                        </button>
                        <button
                          onClick={() => setDailyFilter('standalone')}
                          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${dailyFilter === 'standalone' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                          临时事务
                        </button>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={() => setViewDate(new Date())} 
                            className="text-xs font-bold text-indigo-600 px-3 py-2 bg-white rounded-lg hover:bg-indigo-50 border border-indigo-100 shadow-sm"
                        >
                            今天
                        </button>
                        <button 
                            onClick={handleGenerateDailyReport}
                            disabled={isGenerating}
                            className="text-xs bg-gradient-to-r from-indigo-600 to-violet-600 text-white px-3 py-2 rounded-lg hover:shadow-lg flex items-center gap-2 disabled:opacity-50"
                        >
                            {isGenerating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                            生成日报
                        </button>
                    </div>
                </div>

                {/* Eisenhower Matrix Grid */}
                <div className="flex-1 grid grid-cols-2 grid-rows-2 gap-4 min-h-0">
                    {quadrants.map((quad) => (
                        <div 
                            key={quad.id}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDropQuadrant(e, quad.id)}
                            className={`rounded-2xl border-2 p-4 flex flex-col ${quad.color} border-white shadow-sm overflow-hidden transition-all hover:shadow-md`}
                        >
                            <div className="flex items-center justify-between mb-4 pb-2 border-b border-black/5">
                                <div className="flex items-center gap-2">
                                    <quad.icon size={20} className={quad.headerColor} />
                                    <div>
                                        <h3 className={`font-bold ${quad.headerColor}`}>{quad.title}</h3>
                                        <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">{quad.subtitle}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => addStandaloneTask(quad.id)}
                                        className="p-1 hover:bg-white/50 rounded text-slate-500 hover:text-slate-700"
                                        title="添加任务"
                                    >
                                        <Plus size={16} />
                                    </button>
                                    <span className="bg-white/60 px-2 py-1 rounded text-xs font-bold text-slate-600">
                                        {tasks.filter(t => t.priority === quad.id && (t.dueDate === viewDate.toISOString().split('T')[0] || t.column !== 'done')).length}
                                    </span>
                                </div>
                            </div>
                            
                            <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                                {filterDailyTasks(tasks)
                                    .filter(t => t.priority === quad.id)
                                    .filter(t => {
                                        const isDue = t.dueDate === viewDate.toISOString().split('T')[0];
                                        const isActive = t.column !== 'done' && t.column !== 'backlog';
                                        const isTodayView = viewDate.toDateString() === new Date().toDateString();
                                        return isDue || (isActive && isTodayView);
                                    })
                                    .map(task => (
                                    <div key={task.id} className="relative">
                                      <TaskCard 
                                        task={task} 
                                        onMove={moveTask} 
                                        onDragStart={handleDragStart}
                                        onDelete={deleteTask}
                                        onClick={() => openTask(task)}
                                        minimalist={true}
                                      />
                                      {/* Source Badge */}
                                      <span className={`absolute -top-1 -right-1 text-[9px] px-1.5 py-0.5 rounded-full font-medium ${
                                        task.projectId 
                                          ? 'bg-blue-100 text-blue-600' 
                                          : 'bg-amber-100 text-amber-600'
                                      }`}>
                                        {task.projectId ? (projects.find(p => p.id === task.projectId)?.title?.slice(0, 4) || '项目') : '临时'}
                                      </span>
                                    </div>
                                ))}
                                {filterDailyTasks(tasks).filter(t => t.priority === quad.id && t.dueDate === viewDate.toISOString().split('T')[0]).length === 0 && (
                                    <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-50 border-2 border-dashed border-slate-300/50 rounded-lg min-h-[60px]">
                                        <span className="text-xs">拖拽任务至此</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* VIEW: KANBAN BOARD */}
        {currentView === 'board' && activeProject && (
            <div className="h-full overflow-x-auto">
                 <div className="flex gap-6 h-full min-w-[1024px]">
                  {columns.map(col => (
                    <div 
                      key={col.id} 
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDropColumn(e, col.id)}
                      className="flex-1 min-w-[280px] max-w-[350px] flex flex-col h-full"
                    >
                      <div className={`flex items-center justify-between p-3 rounded-t-lg border-b-2 border-slate-200 ${col.color} bg-opacity-50`}>
                        <h2 className="font-semibold text-slate-700 flex items-center gap-2">
                          {col.title}
                          <span className="bg-white/50 px-2 py-0.5 rounded text-xs text-slate-500">
                            {projectTasks.filter(t => t.column === col.id).length}
                          </span>
                        </h2>
                        <button 
                          onClick={() => addTask(col.id)}
                          className="p-1 hover:bg-white/50 rounded-md text-slate-600 transition-colors"
                          title="添加任务"
                        >
                          <Plus size={18} />
                        </button>
                      </div>

                      <div className="flex-1 bg-slate-100/50 rounded-b-lg p-3 overflow-y-auto space-y-3 transition-colors hover:bg-slate-100/80">
                        {projectTasks.filter(t => t.column === col.id).map(task => (
                          <TaskCard 
                            key={task.id} 
                            task={task} 
                            onMove={moveTask} 
                            onDragStart={handleDragStart}
                            onDelete={deleteTask}
                            onClick={() => openTask(task)}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
            </div>
        )}
      </main>

      {/* Task Detail Modal */}
      <Modal isOpen={isTaskModalOpen} onClose={() => setIsTaskModalOpen(false)}>
        {activeTask && (
          <>
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-start bg-slate-50/50">
              <input
                type="text"
                value={activeTask.title}
                onChange={(e) => updateActiveTask({ title: e.target.value })}
                className="text-xl font-bold bg-transparent border-none focus:ring-0 p-0 w-full text-slate-800 placeholder-slate-400"
                placeholder="任务标题"
              />
              <button onClick={() => setIsTaskModalOpen(false)} className="text-slate-400 hover:text-slate-600 ml-4">
                <X size={24} />
              </button>
            </div>

            <div className="px-6 border-b border-slate-100 flex gap-6 text-sm font-medium">
              <button 
                onClick={() => setActiveTab('details')}
                className={`py-3 border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'details' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
              >
                <CheckSquare size={16} /> 详情
              </button>
              <button 
                onClick={() => setActiveTab('chat')}
                className={`py-3 border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'chat' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
              >
                <Sparkles size={16} className={isChatLoading ? "animate-pulse" : ""} /> AI 助手
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-white relative">
              {activeTab === 'details' && (
                <div className="space-y-6">
                  <div className="group relative">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">
                      描述
                    </label>
                    <div className="relative">
                      <textarea
                        value={activeTask.description}
                        onChange={(e) => updateActiveTask({ description: e.target.value })}
                        placeholder="添加详细描述..."
                        className="w-full text-sm text-slate-700 border border-slate-200 rounded-lg p-3 min-h-[100px] focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition-all resize-y"
                      />
                      {(!activeTask.description || activeTask.description.length < 20) && (
                        <button 
                          onClick={handleMagicExpand}
                          disabled={isGenerating}
                          className="absolute bottom-3 right-3 flex items-center gap-1.5 bg-gradient-to-r from-indigo-500 to-violet-500 text-white text-xs px-3 py-1.5 rounded-full shadow hover:shadow-lg hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isGenerating ? <Loader2 size={12} className="animate-spin" /> : <Wand2 size={12} />}
                          {isGenerating ? "思考中..." : "智能生成详情"}
                        </button>
                      )}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                       <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                        <Clock size={14} /> 截止日期
                      </label>
                      <input 
                        type="date" 
                        value={activeTask.dueDate || ""} 
                        onChange={(e) => updateActiveTask({ dueDate: e.target.value })}
                        className="w-full text-sm text-slate-700 border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition-all"
                      />
                    </div>
                    <div>
                       <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                        <CheckSquare size={14} /> 状态
                      </label>
                      <select 
                        value={activeTask.column || "todo"} 
                        onChange={(e) => {
                          const newColumn = e.target.value;
                          const updates = { column: newColumn };
                          if (newColumn === 'done' && activeTask.column !== 'done') {
                            updates.completedAt = new Date().toISOString();
                          } else if (newColumn !== 'done') {
                            updates.completedAt = null;
                          }
                          updateActiveTask(updates);
                        }}
                        className="w-full text-sm text-slate-700 border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition-all bg-white"
                      >
                          <option value="backlog">📋 积压工作</option>
                          <option value="todo">📝 待办事项</option>
                          <option value="in-progress">🔄 进行中</option>
                          <option value="done">✅ 已完成</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                     <div>
                       <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                        <AlertCircle size={14} /> 优先级 (四象限)
                      </label>
                      <select 
                        value={activeTask.priority || "p2"} 
                        onChange={(e) => updateActiveTask({ priority: e.target.value })}
                        className="w-full text-sm text-slate-700 border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition-all bg-white"
                      >
                          <option value="p1">🔴 重要且紧急</option>
                          <option value="p2">🟠 重要不紧急</option>
                          <option value="p3">🔵 紧急不重要</option>
                          <option value="p4">⚪ 不重要不紧急</option>
                      </select>
                    </div>
                    <div>
                       <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                        <Briefcase size={14} /> 所属项目
                      </label>
                      <select 
                        value={activeTask.projectId || ""} 
                        onChange={(e) => updateActiveTask({ projectId: e.target.value ? parseInt(e.target.value) : null })}
                        className="w-full text-sm text-slate-700 border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition-all bg-white"
                      >
                          <option value="">无项目（独立任务）</option>
                          {projects.map(p => (
                            <option key={p.id} value={p.id}>{p.title}</option>
                          ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                        检查清单
                      </label>
                      <button 
                        onClick={() => updateActiveTask({ subtasks: [...activeTask.subtasks, { text: "", done: false }] })}
                        className="text-xs text-indigo-600 hover:underline flex items-center gap-1"
                      >
                        <Plus size={12} /> 添加子任务
                      </button>
                    </div>
                    <div className="space-y-2">
                      {activeTask.subtasks.map((st, idx) => (
                        <div key={idx} className="flex items-center gap-3 group">
                          <input 
                            type="checkbox"
                            checked={st.done}
                            onChange={(e) => {
                              const newSt = [...activeTask.subtasks];
                              newSt[idx].done = e.target.checked;
                              updateActiveTask({ subtasks: newSt });
                            }}
                            className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                          />
                          <input 
                            type="text"
                            value={st.text}
                            onChange={(e) => {
                              const newSt = [...activeTask.subtasks];
                              newSt[idx].text = e.target.value;
                              updateActiveTask({ subtasks: newSt });
                            }}
                            placeholder="输入任务项"
                            className={`flex-1 text-sm bg-transparent border-none p-0 focus:ring-0 ${st.done ? 'text-slate-400 line-through' : 'text-slate-700'}`}
                          />
                          <button 
                            onClick={() => updateActiveTask({ subtasks: activeTask.subtasks.filter((_, i) => i !== idx) })}
                            className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                   <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">
                      标签
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {activeTask.tags.map((tag, idx) => (
                        <span key={idx} className="inline-flex items-center gap-1 bg-slate-100 text-slate-600 text-xs px-2 py-1 rounded-md">
                          <Tag size={10} /> {tag}
                          <button 
                            onClick={() => updateActiveTask({ tags: activeTask.tags.filter((_, i) => i !== idx) })}
                            className="hover:text-red-500 ml-1"
                          >
                            <X size={10} />
                          </button>
                        </span>
                      ))}
                      <button 
                        onClick={() => {
                          const tag = prompt("输入标签名称:");
                          if (tag) updateActiveTask({ tags: [...activeTask.tags, tag] });
                        }}
                        className="text-xs px-2 py-1 border border-dashed border-slate-300 text-slate-500 rounded-md hover:border-indigo-300 hover:text-indigo-600 transition-colors"
                      >
                        + 添加标签
                      </button>
                    </div>
                  </div>
                  
                  {/* Attachments Section */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                        <Paperclip size={14} /> 附件
                      </label>
                      <label className="text-xs text-indigo-600 hover:underline flex items-center gap-1 cursor-pointer">
                        <input
                          type="file"
                          onChange={handleFileUpload}
                          className="hidden"
                          disabled={isUploading}
                        />
                        {isUploading ? (
                          <><Loader2 size={12} className="animate-spin" /> 上传中...</>
                        ) : (
                          <><Plus size={12} /> 上传文件</>
                        )}
                      </label>
                    </div>
                    
                    {attachments.length > 0 ? (
                      <div className="space-y-2">
                        {attachments.map((att) => (
                          <div key={att.id} className="flex items-center gap-3 p-2 bg-slate-50 rounded-lg group hover:bg-slate-100 transition-colors">
                            <div className="p-2 bg-white rounded-lg border border-slate-200">
                              <FileText size={16} className="text-slate-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-slate-700 truncate">{att.originalName}</p>
                              <p className="text-xs text-slate-400">{formatFileSize(att.size)}</p>
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => handleDownloadAttachment(att.id, att.originalName)}
                                className="p-1.5 hover:bg-white rounded text-slate-500 hover:text-indigo-600"
                                title="下载"
                              >
                                <Download size={14} />
                              </button>
                              <button
                                onClick={() => handleDeleteAttachment(att.id)}
                                className="p-1.5 hover:bg-white rounded text-slate-500 hover:text-red-500"
                                title="删除"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-6 border-2 border-dashed border-slate-200 rounded-lg">
                        <Paperclip size={24} className="mx-auto text-slate-300 mb-2" />
                        <p className="text-sm text-slate-400">暂无附件</p>
                        <label className="text-xs text-indigo-600 hover:underline cursor-pointer mt-1 inline-block">
                          <input
                            type="file"
                            onChange={handleFileUpload}
                            className="hidden"
                            disabled={isUploading}
                          />
                          点击上传
                        </label>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'chat' && (
                <div className="flex flex-col h-full -m-6">
                  <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50">
                    {activeTask.chatHistory.map((msg, idx) => (
                      <div key={idx} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                          msg.sender === 'user' 
                            ? 'bg-indigo-600 text-white rounded-br-none' 
                            : 'bg-white text-slate-700 border border-slate-100 rounded-bl-none'
                        }`}>
                          <p className="whitespace-pre-wrap">{msg.text}</p>
                        </div>
                      </div>
                    ))}
                    {isChatLoading && (
                      <div className="flex justify-start">
                         <div className="bg-white px-4 py-3 rounded-2xl rounded-bl-none border border-slate-100 shadow-sm flex gap-1">
                          <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"></span>
                          <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce delay-75"></span>
                          <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce delay-150"></span>
                        </div>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>

                  <form onSubmit={handleChatSubmit} className="p-4 bg-white border-t border-slate-200">
                    <div className="relative">
                      <input
                        type="text"
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        placeholder="向 AI 寻求灵感、步骤或代码..."
                        className="w-full pl-4 pr-12 py-3 bg-slate-100 border-none rounded-xl focus:ring-2 focus:ring-indigo-200 focus:bg-white transition-all text-sm"
                        disabled={isChatLoading}
                      />
                      <button 
                        type="submit" 
                        disabled={!chatInput.trim() || isChatLoading}
                        className="absolute right-2 top-2 p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600 transition-colors"
                      >
                        <Send size={16} />
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          </>
        )}
      </Modal>

      {/* New Project Modal */}
      <Modal isOpen={isProjectModalOpen} onClose={() => setIsProjectModalOpen(false)}>
          <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-slate-800">创建新项目</h2>
                  <button onClick={() => setIsProjectModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                      <X size={24} />
                  </button>
              </div>

              <div className="space-y-4">
                  <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">项目名称</label>
                      <input 
                          type="text" 
                          value={newProjectTitle}
                          onChange={(e) => setNewProjectTitle(e.target.value)}
                          placeholder="例如：公司年会策划"
                          className="w-full border border-slate-300 rounded-lg p-3 focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 transition-all"
                      />
                  </div>
                  <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">项目目标 / 备注 (可选)</label>
                      <textarea 
                          value={newProjectGoal}
                          onChange={(e) => setNewProjectGoal(e.target.value)}
                          placeholder="简单描述你想做什么，AI 可以帮你生成初始任务..."
                          className="w-full border border-slate-300 rounded-lg p-3 min-h-[100px] focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 transition-all"
                      />
                  </div>

                  <div className="pt-4 flex gap-3">
                      <button 
                          onClick={handleCreateProjectWithAI}
                          disabled={!newProjectTitle.trim() || isGenerating}
                          className="flex-1 bg-gradient-to-r from-indigo-600 to-violet-600 text-white py-3 rounded-lg font-medium hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                      >
                          {isGenerating ? <Loader2 size={18} className="animate-spin" /> : <Wand2 size={18} />}
                          AI 生成项目计划
                      </button>
                      <button 
                          onClick={() => {
                              const newId = Date.now();
                              setProjects([...projects, { id: newId, title: newProjectTitle, description: newProjectGoal }]);
                              setIsProjectModalOpen(false);
                              setActiveProjectId(newId);
                              setCurrentView('board');
                          }}
                          disabled={!newProjectTitle.trim() || isGenerating}
                          className="px-6 py-3 bg-slate-100 text-slate-700 font-medium rounded-lg hover:bg-slate-200 transition-colors"
                      >
                          直接创建
                      </button>
                  </div>
              </div>
          </div>
      </Modal>

      {/* Daily Report Modal */}
      <Modal isOpen={isDailyReportOpen} onClose={() => setIsDailyReportOpen(false)} size="lg">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <ClipboardList size={24} className="text-indigo-600" />
              工作日报
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={copyDailyReport}
                className="px-4 py-2 text-sm bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors flex items-center gap-2"
              >
                复制内容
              </button>
              <button onClick={() => setIsDailyReportOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>
          </div>
          <div className="bg-slate-50 rounded-lg p-4 max-h-[60vh] overflow-y-auto">
            <pre className="whitespace-pre-wrap text-sm text-slate-700 font-sans leading-relaxed">{dailyReport}</pre>
          </div>
        </div>
      </Modal>

      {/* Backup Modal */}
      <Modal isOpen={isBackupModalOpen} onClose={() => setIsBackupModalOpen(false)}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <DatabaseBackup size={24} className="text-indigo-600" />
              备份与导入
            </h2>
            <button onClick={() => setIsBackupModalOpen(false)} className="text-slate-400 hover:text-slate-600">
              <X size={24} />
            </button>
          </div>
          
          <div className="space-y-4">
            {/* Export Section */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-emerald-100 rounded-lg">
                  <Download size={24} className="text-emerald-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-800 mb-1">导出数据</h3>
                  <p className="text-sm text-slate-500 mb-3">
                    将所有项目和任务导出为 JSON 文件，可用于备份或迁移到其他设备。
                  </p>
                  <button
                    onClick={handleExportData}
                    disabled={isExporting}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {isExporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                    {isExporting ? '导出中...' : '导出备份'}
                  </button>
                </div>
              </div>
            </div>
            
            {/* Import Section */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Upload size={24} className="text-blue-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-800 mb-1">导入数据</h3>
                  <p className="text-sm text-slate-500 mb-3">
                    从备份文件恢复数据。支持合并或覆盖现有数据。
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json"
                    onChange={handleImportData}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isImporting}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {isImporting ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                    {isImporting ? '导入中...' : '选择文件导入'}
                  </button>
                </div>
              </div>
            </div>
            
            {/* Info */}
            <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
              <p className="text-xs text-amber-700">
                <strong>提示：</strong>导入时可选择"合并"（保留现有数据）或"覆盖"（删除现有数据后导入）模式。附件不包含在备份中。
              </p>
            </div>
          </div>
        </div>
      </Modal>

    </div>
  );
}