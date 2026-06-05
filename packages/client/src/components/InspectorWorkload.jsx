import React, { useState, useEffect } from 'react';
import { getInspectorWorkloadStats } from '../api/index.js';

function InspectorWorkload() {
  const [inspectors, setInspectors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      setError(null);
      const data = await getInspectorWorkloadStats();
      setInspectors(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function formatDate(dateStr) {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('zh-CN');
  }

  if (loading) {
    return <div className="loading">加载中...</div>;
  }

  if (error) {
    return <div className="error-state">加载失败: {error}</div>;
  }

  const maxCount = inspectors.length > 0 ? Math.max(...inspectors.map(i => i.totalCount)) : 1;

  return (
    <div className="inspector-workload">
      <div className="workload-header">
        <h2>👥 巡检员工作量统计</h2>
        <p className="workload-subtitle">按巡检员汇总记录数量、异常发现数量和最近巡检时间</p>
      </div>

      {inspectors.length === 0 ? (
        <div className="empty-state">
          <div className="icon">📝</div>
          <h3>暂无巡检记录</h3>
          <p>还没有任何巡检员的工作记录</p>
        </div>
      ) : (
        <>
          <div className="workload-summary">
            <div className="summary-card">
              <div className="summary-icon">👤</div>
              <div className="summary-content">
                <div className="summary-number">{inspectors.length}</div>
                <div className="summary-label">巡检员人数</div>
              </div>
            </div>
            <div className="summary-card">
              <div className="summary-icon">📋</div>
              <div className="summary-content">
                <div className="summary-number">
                  {inspectors.reduce((sum, i) => sum + i.totalCount, 0)}
                </div>
                <div className="summary-label">总巡检记录</div>
              </div>
            </div>
            <div className="summary-card">
              <div className="summary-icon">⚠️</div>
              <div className="summary-content">
                <div className="summary-number">
                  {inspectors.reduce((sum, i) => sum + i.abnormalCount, 0)}
                </div>
                <div className="summary-label">异常发现总数</div>
              </div>
            </div>
          </div>

          <div className="workload-list">
            <h3>巡检员工作量排行</h3>
            <div className="inspector-cards">
              {inspectors.map((inspector, index) => (
                <div key={inspector.inspector} className="inspector-card">
                  <div className="inspector-rank">
                    <span className={`rank-badge rank-${index + 1}`}>
                      {index + 1}
                    </span>
                  </div>
                  <div className="inspector-info">
                    <div className="inspector-header">
                      <h4 className="inspector-name">{inspector.inspector}</h4>
                    </div>
                    <div className="inspector-stats">
                      <div className="inspector-stat">
                        <span className="stat-label">巡检记录</span>
                        <span className="stat-value total">{inspector.totalCount}</span>
                      </div>
                      <div className="inspector-stat">
                        <span className="stat-label">异常发现</span>
                        <span className="stat-value abnormal">{inspector.abnormalCount}</span>
                      </div>
                    </div>
                    <div className="inspector-progress">
                      <div className="progress-bar-bg">
                        <div
                          className="progress-bar-fill"
                          style={{ width: `${(inspector.totalCount / maxCount) * 100}%` }}
                        />
                      </div>
                    </div>
                    <div className="inspector-meta">
                      <span className="meta-item">
                        <span className="meta-icon">🕐</span>
                        最近巡检：{formatDate(inspector.lastInspectionTime)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="workload-table-section">
            <h3>详细数据</h3>
            <div className="history-table">
              <table>
                <thead>
                  <tr>
                    <th>排名</th>
                    <th>巡检员</th>
                    <th>巡检记录数</th>
                    <th>异常发现数</th>
                    <th>最近巡检时间</th>
                  </tr>
                </thead>
                <tbody>
                  {inspectors.map((inspector, index) => (
                    <tr key={inspector.inspector}>
                      <td>
                        <span className={`rank-badge rank-${index + 1} inline-rank`}>
                          {index + 1}
                        </span>
                      </td>
                      <td>
                        <strong>{inspector.inspector}</strong>
                      </td>
                      <td>
                        <span className="count-badge total">{inspector.totalCount}</span>
                      </td>
                      <td>
                        <span className="count-badge abnormal">{inspector.abnormalCount}</span>
                      </td>
                      <td>{formatDate(inspector.lastInspectionTime)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="refresh-section">
            <button className="btn btn-primary refresh-btn" onClick={loadData}>
              🔄 刷新数据
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default InspectorWorkload;
