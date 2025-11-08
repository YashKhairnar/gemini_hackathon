import { useState } from 'react'
import './AgentsPanel.css'

function AgentsPanel({ agents = [], onStatusChange = () => {}, onPriorityChange = () => {} }) {
  const [activeTab, setActiveTab] = useState('agents')

  const getStatusColor = (status) => {
    const colors = {
      'running': '#34A853',
      'idle': '#FBBC04',
      'blocked': '#EA4335',
      'stopped': '#AAAAAA'
    }
    return colors[status] || '#AAAAAA'
  }

  const getStatusDot = (status) => {
    return (
      <span
        className="status-dot"
        style={{ backgroundColor: getStatusColor(status) }}
      />
    )
  }

  const handlePlayPause = (agent) => {
    const newStatus = agent.status === 'running' ? 'idle' : 'running'
    onStatusChange(agent.id, newStatus)
  }

  return (
    <div className="agents-panel">
      <div className="panel-tabs">
        <button
          className={`panel-tab ${activeTab === 'agents' ? 'active' : ''}`}
          onClick={() => setActiveTab('agents')}
        >
          Agents
        </button>
        <button
          className={`panel-tab ${activeTab === 'tasks' ? 'active' : ''}`}
          onClick={() => setActiveTab('tasks')}
        >
          Tasks
        </button>
      </div>

      <div className="panel-content">
        {activeTab === 'agents' && (
          <div className="agents-list">
            {agents.length === 0 ? (
              <p className="empty-state">No agents available</p>
            ) : (
              agents.map((agent) => (
              <div key={agent.id} className="agent-card">
                <div className="agent-header">
                  <div className="agent-info">
                    {getStatusDot(agent.status)}
                    <span className="agent-name">{agent.name}</span>
                  </div>
                  <div className="agent-status">
                    {agent.status.charAt(0).toUpperCase() + agent.status.slice(1)}
                  </div>
                </div>
                
                <div className="agent-priority">
                  <label>Priority</label>
                  <div className="priority-control">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={agent.priority}
                      onChange={(e) => onPriorityChange(agent.id, e.target.value)}
                      className="priority-slider"
                    />
                    <span className="priority-value">{agent.priority}%</span>
                  </div>
                </div>

                <div className="agent-controls">
                  <button
                    className="control-button play"
                    onClick={() => handlePlayPause(agent)}
                    title={agent.status === 'running' ? 'Pause' : 'Play'}
                  >
                    {agent.status === 'running' ? '⏸' : '▶'}
                  </button>
                </div>
              </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'tasks' && (
          <div className="tasks-list">
            <p className="empty-state">No tasks available</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default AgentsPanel

