import React, { useState, useEffect, useRef } from 'react';
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
  Coffee
} from 'lucide-react';

/**
 * GEMINI API UTILITIES
 */
const apiKey = ""; // Injected by runtime environment

const SYSTEM_INSTRUCTION = `你是一个嵌入在看板应用中的智能项目管理助手。
你的目标是帮助用户分解任务，明确需求，并提供可执行的建议。
请始终使用**中文**回答。保持简洁、专业且乐于助人。`;

async function callGeminiJSON(prompt, schema) {
  if (!apiKey) {
    // Fallback for development/demo without key
    console.warn("No API Key available. Returning mock data.");
    await new Promise(r => setTimeout(r, 1500));
    // Mock response based on prompt content
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
      description: "这是模拟的 AI 回复。Gemini 会根据您的输入生成详细的中文描述。",
      subtasks: ["模拟子任务 1", "模拟子任务 2", "检查 API 配置"],
      tags: ["模拟数据", "演示"]
    };
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: schema
          }
        })
      }
    );

    const data = await response.json();
    if (data.error) throw new Error(data.error.message);
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    return JSON.parse(text);
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
}

async function callGeminiChat(history, newMessage, taskContext) {
  if (!apiKey) {
    await new Promise(r => setTimeout(r, 1000));
    return "我现在无法连接到 Gemini（缺少 API 密钥），但在连接后我很乐意为您提供帮助！";
  }

  const contextPrompt = `当前任务背景: 标题: "${taskContext.title}". 描述: "${taskContext.description}". 截止日期: "${taskContext.dueDate || '无'}". 优先级: "${taskContext.priority}". 请用中文回答。`;
  
  // Construct conversation history for the API
  const contents = [
    { role: "user", parts: [{ text: contextPrompt }] },
    { role: "model", parts: [{ text: "明白了，我准备好协助处理这个任务了。" }] },
    ...history.map(msg => ({
      role: msg.sender === 'user' ? 'user' : 'model',
      parts: [{ text: msg.text }]
    })),
    { role: "user", parts: [{ text: newMessage }] }
  ];

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents })
      }
    );

    const data = await response.json();
    if (data.error) throw new Error(data.error.message);
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "我不确定如何回答。";
  } catch (error) {
    console.error("Gemini Chat Error:", error);
    return "抱歉，我在与 Gemini 通信时遇到了错误。";
  }
}

// Simple text generation for Daily Report (non-JSON)
async function callGeminiText(prompt) {
  if (!apiKey) {
    await new Promise(r => setTimeout(r, 1500));
    return "【模拟日报】\n\n今日工作总结：\n1. 完成了重要且紧急的任务：修复导航栏 Bug。\n2. 推进了 Instagram 横幅设计。\n\n四象限分析：\n您的时间分配主要集中在第二象限，这是一个良好的信号，说明您在按计划推进工作。\n\n（这是因为缺少 API Key 的模拟内容）";
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] }
        })
      }
    );

    const data = await response.json();
    if (data.error) throw new Error(data.error.message);
    return data.candidates?.[0]?.content?.parts?.[0]?.text;
  } catch (error) {
    console.error("Gemini Text Error:", error);
    throw error;
  }
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
            onDragStart={(e) => onDragStart(e, task.id)}
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
      onDragStart={(e) => onDragStart(e, task.id)}
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
  // --- STATE ---
  const [currentView, setCurrentView] = useState('projects'); // 'projects' | 'board' | 'calendar' | 'daily'
  const [activeProjectId, setActiveProjectId] = useState(null);
  
  // Calendar & Daily State
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [viewDate, setViewDate] = useState(new Date()); // For Daily Record View
  
  const [projects, setProjects] = useState([
      { id: 101, title: "Q4 市场营销战役", description: "年度末最重要的产品推广活动，包含线上广告和线下地推。" },
      { id: 102, title: "内部管理系统重构", description: "将旧的 CRM 系统迁移到新的 React 架构。" },
      { id: 103, title: "办公室搬迁计划", description: "协调搬家公司、IT 设备迁移及新办公室装修。" }
  ]);

  const [tasks, setTasks] = useState([
    {
      id: 1,
      projectId: 101,
      title: "启动市场营销活动",
      description: "准备社交媒体素材并安排 Q4 产品发布的帖子。",
      column: "todo",
      dueDate: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
      priority: 'p2', // p1: Important Urgent, p2: Important Not Urgent, p3: Urgent Not Important, p4: Not Urgent Not Important
      completedAt: null,
      subtasks: [
        { text: "设计 Instagram 横幅", done: false },
        { text: "撰写 LinkedIn 文案", done: true }
      ],
      tags: ["市场", "紧急"],
      chatHistory: []
    },
    {
      id: 2,
      projectId: 102,
      title: "修复导航栏 Bug",
      description: "移动端菜单在点击外部区域时没有关闭。",
      column: "in-progress",
      dueDate: new Date(Date.now() - 86400000).toISOString().split('T')[0],
      priority: 'p1', 
      completedAt: null,
      subtasks: [],
      tags: ["开发", "Bug"],
      chatHistory: []
    }
  ]);

  // Modal State
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
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
    e.dataTransfer.setData("taskId", taskId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e) => {
    e.preventDefault(); 
    e.dataTransfer.dropEffect = "move";
  };

  const handleDropColumn = (e, columnId) => {
    e.preventDefault();
    const taskId = parseInt(e.dataTransfer.getData("taskId"));
    if (taskId) {
       setTasks(prev => prev.map(t => {
           if (t.id !== taskId) return t;
           return updateTaskStatus(t, columnId);
       }));
    }
  };

  const handleDropQuadrant = (e, priorityId) => {
      e.preventDefault();
      const taskId = parseInt(e.dataTransfer.getData("taskId"));
      if (taskId) {
          setTasks(prev => prev.map(t => {
              if (t.id !== taskId) return t;
              return { ...t, priority: priorityId };
          }));
      }
  };

  const addTask = (columnId) => {
    const newTask = {
      id: Date.now(),
      projectId: activeProjectId,
      title: "新任务",
      description: "",
      column: columnId,
      dueDate: new Date().toISOString().split('T')[0], // Default to today
      priority: 'p2', // Default to Important Not Urgent
      completedAt: null,
      subtasks: [],
      tags: [],
      chatHistory: []
    };
    setTasks([...tasks, newTask]);
    openTask(newTask);
  };

  const deleteTask = (id) => {
    setTasks(prev => prev.filter(t => t.id !== id));
    if (activeTask?.id === id) setIsTaskModalOpen(false);
  };
  
  const deleteProject = (id) => {
      if (confirm("确定要删除此项目及其所有任务吗？")) {
          setProjects(prev => prev.filter(p => p.id !== id));
          setTasks(prev => prev.filter(t => t.projectId !== id));
      }
  };

  const openTask = (task) => {
    setActiveTask(task);
    setActiveTab('details');
    setIsTaskModalOpen(true);
  };

  const updateActiveTask = (updates) => {
    const updated = { ...activeTask, ...updates };
    setActiveTask(updated);
    setTasks(prev => prev.map(t => t.id === updated.id ? updated : t));
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
        alert(report); // For now, just alert or we could show in a modal
    } catch (e) {
        alert("日报生成失败，请重试。");
    } finally {
        setIsGenerating(false);
    }
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
          
          const newProjectId = Date.now();
          const newProject = {
              id: newProjectId,
              title: newProjectTitle,
              description: result.description || newProjectGoal
          };

          const newTasks = result.tasks.map((t, idx) => ({
              id: Date.now() + idx,
              projectId: newProjectId,
              title: t.title,
              description: "AI 自动生成的初始任务",
              column: t.column || 'todo',
              dueDate: new Date().toISOString().split('T')[0],
              priority: 'p2',
              completedAt: null,
              subtasks: [],
              tags: t.tags || [],
              chatHistory: []
          }));

          setProjects([...projects, newProject]);
          setTasks([...tasks, ...newTasks]);
          
          setIsProjectModalOpen(false);
          setNewProjectTitle("");
          setNewProjectGoal("");
          setActiveProjectId(newProjectId);
          setCurrentView('board');

      } catch (e) {
          console.error(e);
          alert("AI 立项失败，已创建空项目。");
          const newProjectId = Date.now();
          setProjects([...projects, { id: newProjectId, title: newProjectTitle, description: newProjectGoal }]);
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
              GeminiFlow
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

        <div className="flex items-center gap-2">
             <button 
                onClick={() => setIsProjectModalOpen(true)}
                className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-all shadow-md hover:shadow-lg text-sm font-medium whitespace-nowrap"
            >
                <Plus size={18} /> 新建项目
            </button>
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
            <div className="max-w-7xl mx-auto h-full overflow-hidden flex flex-col gap-6">
                 {/* Date Header */}
                 <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-200">
                        <button onClick={handlePrevDay} className="p-2 rounded-full hover:bg-slate-100 text-slate-500"><ChevronLeft size={20} /></button>
                        <div className="text-center min-w-[120px]">
                            <h2 className="text-lg font-bold text-slate-800">
                                {viewDate.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' })}
                            </h2>
                            <p className="text-xs text-slate-500 font-medium">
                                {viewDate.toLocaleDateString('zh-CN', { weekday: 'long' })}
                            </p>
                        </div>
                        <button onClick={handleNextDay} className="p-2 rounded-full hover:bg-slate-100 text-slate-500"><ChevronRight size={20} /></button>
                    </div>
                    
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={() => setViewDate(new Date())} 
                            className="text-sm font-bold text-indigo-600 px-4 py-2 bg-white rounded-lg hover:bg-indigo-50 border border-indigo-100 shadow-sm"
                        >
                            回到今天
                        </button>
                        <button 
                            onClick={handleGenerateDailyReport}
                            disabled={isGenerating}
                            className="text-sm bg-gradient-to-r from-indigo-600 to-violet-600 text-white px-4 py-2 rounded-lg hover:shadow-lg flex items-center gap-2 disabled:opacity-50"
                        >
                            {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                            AI 生成日报总结
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
                                <span className="bg-white/60 px-2 py-1 rounded text-xs font-bold text-slate-600">
                                    {tasks.filter(t => t.priority === quad.id && (t.dueDate === viewDate.toISOString().split('T')[0] || t.column !== 'done')).length}
                                </span>
                            </div>
                            
                            <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                                {tasks
                                    .filter(t => t.priority === quad.id)
                                    .filter(t => {
                                        // Show if due date matches OR if it's active (not done/backlog) and we are viewing today
                                        const isDue = t.dueDate === viewDate.toISOString().split('T')[0];
                                        const isActive = t.column !== 'done' && t.column !== 'backlog';
                                        const isTodayView = viewDate.toDateString() === new Date().toDateString();
                                        return isDue || (isActive && isTodayView);
                                    })
                                    .map(task => (
                                    <TaskCard 
                                        key={task.id} 
                                        task={task} 
                                        onMove={moveTask} 
                                        onDragStart={handleDragStart}
                                        onDelete={deleteTask}
                                        onClick={() => openTask(task)}
                                        minimalist={true}
                                    />
                                ))}
                                {tasks.filter(t => t.priority === quad.id && t.dueDate === viewDate.toISOString().split('T')[0]).length === 0 && (
                                    <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-50 border-2 border-dashed border-slate-300/50 rounded-lg">
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
                      onDragOver={(e) => handleDropColumn(e, col.id)}
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

    </div>
  );
}