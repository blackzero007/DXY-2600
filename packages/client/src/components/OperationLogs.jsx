import React, { useState, useEffect } from 'react';
import { getOperationLogs } from '../api/index.js';

const typeOptions = [
  { value: '', label: '全部操作' },
  { value: 'create_exhibit', label: '新增展品' },
  { value: 'create_inspection', label: '提交巡检记录' }
];

function OperationLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState('');

  useEffect(() => {
    loadLogs();
  }, [selectedType]);

  async function loadLogs() {
    setLoading(true);
    try {
      const data = await getOperationLogs(selectedType || null);
      setLogs(data);
    } catch (error) {
      console.error('加载操作日志失败:', error);
    } finally {
      setLoading(false);
    }
  }

  function formatDate(dateStr) {
    return new Date(dateStr).toLocaleString('zh-CN');
  }

  function getTypeIcon(type) {
    switch (type) {
      case 'create_exhibit':
        return '➕';
      case 'create_inspection':
        return '📝';
      default:
        return '📋';
    }
  }

  return (
    <div className="operation-logs">
      <div className="page-header">
        <h2>📋 系统操作日志</h2>
        <p>记录系统中的关键操作</p>
      </div>

      <div className="filter-bar">
        <label htmlFor="log-type-filter">按操作类型筛选：</label>
        <select
          id="log-type-filter"
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
        >
          {typeOptions.map(option => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
        <button className="btn btn-secondary" onClick={loadLogs}>
          🔄 刷新
        </button>
      </div>

      {loading ? (
        <div className="loading">加载中...</div>
      ) : logs.length === 0 ? (
        <div className="empty-state">
          <div className="icon">📭</div>
          <h3>暂无操作日志</h3>
          <p>还没有任何操作记录</p>
        </div>
      ) : (
        <div className="logs-table">
          <table>
            <thead>
              <tr>
                <th style={{ width: '60px' }}>序号</th>
                <th>操作类型</th>
                <th>对象名称</th>
                <th>操作时间</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log, index) => (
                <tr key={log.id}>
                  <td className="log-index">{index + 1}</td>
                  <td>
                    <span className="log-type-badge">
                      <span className="log-type-icon">{getTypeIcon(log.type)}</span>
                      {log.type_label}
                    </span>
                  </td>
                  <td className="log-object-name">{log.object_name}</td>
                  <td className="log-time">{formatDate(log.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default OperationLogs;
