import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useApp } from '../store/AppContext'
import './TaskList.css'

function TaskRow({ task, isActive, menuOpen, onSelect, onToggleComplete, onMenuToggle, onEdit, onDelete, className }) {
  const btnRef = useRef(null)
  const [dropPos, setDropPos] = useState(null)

  function handleMenuClick(e) {
    e.stopPropagation()
    if (!menuOpen && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect()
      setDropPos({ top: r.bottom + 4, right: window.innerWidth - r.right })
    }
    onMenuToggle(e)
  }

  return (
    <div
      className={`task-row${isActive ? ' active' : ''}${task.completed ? ' done' : ''} ${className ?? ''}`}
      onClick={onSelect}
    >
      <input
        type="checkbox"
        className="task-check"
        checked={task.completed}
        onChange={onToggleComplete}
        onClick={e => e.stopPropagation()}
      />
      <span className="task-name">{task.title}</span>
      <span className="task-pomos">
        {task.completedPomodoros ?? 0}/{task.estimatedPomodoros ?? 1}
      </span>
      <div className="task-menu-wrap" onClick={e => e.stopPropagation()}>
        <button ref={btnRef} className="btn-three-dot" onClick={handleMenuClick} title="Task options">⋯</button>
        {menuOpen && dropPos && createPortal(
          <div
            className="task-dropdown"
            style={{ position: 'fixed', top: dropPos.top, right: dropPos.right }}
          >
            <button onClick={e => { e.stopPropagation(); onEdit() }}>Edit task</button>
            <button className="task-dropdown-danger" onClick={e => { e.stopPropagation(); onDelete() }}>Delete task</button>
          </div>,
          document.body
        )}
      </div>
    </div>
  )
}

function TaskEditRow({ editTitle, setEditTitle, editPomos, setEditPomos, onSave, onCancel }) {
  return (
    <div className="task-edit-row">
      <input
        className="task-input"
        value={editTitle}
        onChange={e => setEditTitle(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') onSave(); if (e.key === 'Escape') onCancel() }}
        autoFocus
      />
      <select
        className="pomo-select"
        value={editPomos}
        onChange={e => setEditPomos(Number(e.target.value))}
      >
        {[1, 2, 3, 4, 5, 6, 7, 8].map(n => <option key={n} value={n}>{n}</option>)}
      </select>
      <button className="btn-cancel" onClick={onCancel}>Cancel</button>
      <button className="btn-confirm" onClick={onSave}>Save changes</button>
    </div>
  )
}

export default function TaskList() {
  const { tasks, setTasks, activeTaskId, setActiveTaskId } = useApp()

  const [showForm, setShowForm] = useState(false)
  const [formTitle, setFormTitle] = useState('')
  const [formPomos, setFormPomos] = useState(2)
  const [openMenuId, setOpenMenuId] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [editTitle, setEditTitle] = useState('')
  const [editPomos, setEditPomos] = useState(2)
  const [removingIds, setRemovingIds] = useState(new Set())
  const [newlyAddedId, setNewlyAddedId] = useState(null)

  // Close menu on outside click
  useEffect(() => {
    if (openMenuId === null) return
    function handler() { setOpenMenuId(null) }
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [openMenuId])

  const sortedTasks = [
    ...tasks.filter(t => !t.completed),
    ...tasks.filter(t => t.completed),
  ]

  function handleAdd() {
    if (!formTitle.trim()) return
    const newTask = {
      id: crypto.randomUUID(),
      title: formTitle.trim(),
      estimatedPomodoros: formPomos,
      completedPomodoros: 0,
      completed: false,
    }
    setTasks([...tasks, newTask])
    setNewlyAddedId(newTask.id)
    setTimeout(() => setNewlyAddedId(null), 250)
    setFormTitle('')
    setFormPomos(2)
    setShowForm(false)
  }

  function handleToggleComplete(id) {
    setTasks(tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t))
    if (activeTaskId === id) setActiveTaskId(null)
  }

  function handleDelete(id) {
    setRemovingIds(prev => new Set([...prev, id]))
    setOpenMenuId(null)
    setTimeout(() => {
      setTasks(tasks.filter(t => t.id !== id))
      setRemovingIds(prev => { const s = new Set(prev); s.delete(id); return s })
      if (activeTaskId === id) setActiveTaskId(null)
    }, 210)
  }

  function handleEditSave(id) {
    if (!editTitle.trim()) return
    setTasks(tasks.map(t =>
      t.id === id ? { ...t, title: editTitle.trim(), estimatedPomodoros: editPomos } : t
    ))
    setEditingId(null)
  }

  function handleSelectTask(task) {
    if (task.completed) return
    setActiveTaskId(task.id === activeTaskId ? null : task.id)
  }

  function startEdit(task) {
    setEditingId(task.id)
    setEditTitle(task.title)
    setEditPomos(task.estimatedPomodoros ?? 2)
    setOpenMenuId(null)
  }

  return (
    <div className="card task-list">
      <div className="task-list-header">
        <span className="task-list-title">Tasks</span>
        <button
          className="btn-add-task"
          onClick={() => setShowForm(v => !v)}
          title="Add task"
          aria-label="Add task"
        >
          +
        </button>
      </div>

      {showForm && (
        <div className="task-add-form">
          <input
            className="task-input"
            placeholder="What are you working on?"
            value={formTitle}
            onChange={e => setFormTitle(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') setShowForm(false) }}
            autoFocus
          />
          <div className="task-form-row">
            <label className="pomo-label">Pomodoros</label>
            <select
              className="pomo-select"
              value={formPomos}
              onChange={e => setFormPomos(Number(e.target.value))}
            >
              {[1, 2, 3, 4, 5, 6, 7, 8].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
            <div className="task-form-actions">
              <button className="btn-cancel" onClick={() => setShowForm(false)}>Cancel</button>
              <button className="btn-confirm" onClick={handleAdd}>Add task</button>
            </div>
          </div>
        </div>
      )}

      <div className="task-rows">
        {sortedTasks.length === 0 && (
          <p className="task-empty">No tasks yet — add one to get started.</p>
        )}
        {sortedTasks.map(task =>
          editingId === task.id ? (
            <TaskEditRow
              key={task.id}
              editTitle={editTitle}
              setEditTitle={setEditTitle}
              editPomos={editPomos}
              setEditPomos={setEditPomos}
              onSave={() => handleEditSave(task.id)}
              onCancel={() => setEditingId(null)}
            />
          ) : (
            <TaskRow
              key={task.id}
              task={task}
              isActive={activeTaskId === task.id}
              menuOpen={openMenuId === task.id}
              className={
                removingIds.has(task.id) ? 'task-row--exiting' :
                newlyAddedId === task.id ? 'task-row--entering' : ''
              }
              onSelect={() => handleSelectTask(task)}
              onToggleComplete={() => handleToggleComplete(task.id)}
              onMenuToggle={e => {
                e.stopPropagation()
                setOpenMenuId(openMenuId === task.id ? null : task.id)
              }}
              onEdit={() => startEdit(task)}
              onDelete={() => handleDelete(task.id)}
            />
          )
        )}
      </div>
    </div>
  )
}
