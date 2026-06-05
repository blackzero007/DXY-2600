import React, { useState, useEffect } from 'react';
import { getTodayInspectionStats, getAbnormalExhibits } from '../api/index.js';

function Dashboard() {
  const [stats, setStats] = useState(null);
  const [abnormalExhibits, setAbnormalExhibits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      setError(null);
      const [statsData, abnormalData] = await Promise.all([
        getTodayInspectionStats(),
        getAbnormalExhibits()
      ]);
      setStats(statsData);
      setAbnormalExhibits(abnormalData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div className="loading">加载中...</div>;
  }

  if (error) {
    return <div className="error-state">加载失败: {error}</div>;
  }

  const today = new Date().toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long'
  });

  function formatDate(dateStr) {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('zh-CN');
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h2>📊 今日巡检看板</h2>
        <p className="dashboard-date">{today}</p>
      </div>

      <div className="dashboard-stats">
        <div className="stat-card inspected">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <div className="stat-number">{stats.inspectedCount}</div>
            <div className="stat-label">已巡检展品</div>
          </div>
        </div>

        <div className="stat-card abnormal">
          <div className="stat-icon">⚠️</div>
          <div className="stat-content">
            <div className="stat-number">{stats.abnormalCount}</div>
            <div className="stat-label">异常记录</div>
          </div>
        </div>

        <div className="stat-card uninspected">
          <div className="stat-icon">⏳</div>
          <div className="stat-content">
            <div className="stat-number">{stats.uninspectedCount}</div>
            <div className="stat-label">未巡检展品</div>
          </div>
        </div>

        <div className="stat-card total">
          <div className="stat-icon">📦</div>
          <div className="stat-content">
            <div className="stat-number">{stats.totalExhibits}</div>
            <div className="stat-label">展品总数</div>
          </div>
        </div>
      </div>

      <div className="completion-section">
        <div className="completion-header">
          <h3>整体完成进度</h3>
          <span className="completion-rate">{stats.completionRate}%</span>
        </div>
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{ width: `${stats.completionRate}%` }}
          />
        </div>
      </div>

      <div className="zone-section">
        <h3>各展区巡检完成情况</h3>
        <div className="zone-grid">
          {Object.entries(stats.zoneStats).map(([zone, zoneStat]) => (
            <div key={zone} className="zone-card">
              <div className="zone-header">
                <span className="zone-name">{zone}</span>
                <span className="zone-completion">{zoneStat.completionRate}%</span>
              </div>
              <div className="zone-progress">
                <div
                  className="zone-progress-fill"
                  style={{ width: `${zoneStat.completionRate}%` }}
                />
              </div>
              <div className="zone-details">
                <span className="zone-detail">
                  <span className="detail-icon">✅</span>
                  已巡检 {zoneStat.inspected}
                </span>
                <span className="zone-detail">
                  <span className="detail-icon">⏳</span>
                  未巡检 {zoneStat.uninspected}
                </span>
                <span className="zone-detail">
                  <span className="detail-icon">📦</span>
                  共 {zoneStat.total} 件
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="abnormal-section">
        <div className="abnormal-header">
          <h3>⚠️ 异常展品专栏</h3>
          <span className="abnormal-count">{abnormalExhibits.length} 件异常</span>
        </div>
        {abnormalExhibits.length === 0 ? (
          <div className="abnormal-empty">
            <div className="abnormal-empty-icon">✅</div>
            <p>暂无异常展品，所有展品状态良好</p>
          </div>
        ) : (
          <div className="abnormal-list">
            {abnormalExhibits.map(exhibit => (
              <div key={exhibit.id} className="abnormal-card">
                <div className="abnormal-card-header">
                  <div className="abnormal-exhibit-info">
                    <h4 className="abnormal-exhibit-name">{exhibit.name}</h4>
                    <span className="abnormal-zone-tag">{exhibit.zone}</span>
                  </div>
                  <span className="status-badge abnormal">异常</span>
                </div>
                <div className="abnormal-card-body">
                  <div className="abnormal-remarks">
                    <span className="abnormal-label">异常备注：</span>
                    <span className="abnormal-text">{exhibit.abnormal_remarks || '无'}</span>
                  </div>
                  <div className="abnormal-meta">
                    <span className="abnormal-time">
                      <span className="abnormal-icon">🕐</span>
                      {formatDate(exhibit.abnormal_time)}
                    </span>
                    <span className="abnormal-inspector">
                      <span className="abnormal-icon">👤</span>
                      {exhibit.inspector}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="refresh-section">
        <button className="btn btn-primary refresh-btn" onClick={loadData}>
          🔄 刷新数据
        </button>
      </div>
    </div>
  );
}

export default Dashboard;
