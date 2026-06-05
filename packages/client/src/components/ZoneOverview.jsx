import React, { useState, useEffect } from 'react';
import { getZoneOverviewStats } from '../api/index.js';

function ZoneOverview() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      setError(null);
      const data = await getZoneOverviewStats();
      setStats(data);
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

  return (
    <div className="zone-overview">
      <div className="zone-overview-header">
        <h2>🗺️ 展区概览</h2>
        <p className="zone-overview-subtitle">按展区统计展品状态分布</p>
      </div>

      <div className="overview-stats">
        <div className="stat-card total">
          <div className="stat-icon">📦</div>
          <div className="stat-content">
            <div className="stat-number">{stats.overall.totalCount}</div>
            <div className="stat-label">展品总数</div>
          </div>
        </div>

        <div className="stat-card normal">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <div className="stat-number">{stats.overall.normalCount}</div>
            <div className="stat-label">正常展品</div>
          </div>
        </div>

        <div className="stat-card abnormal">
          <div className="stat-icon">⚠️</div>
          <div className="stat-content">
            <div className="stat-number">{stats.overall.abnormalCount}</div>
            <div className="stat-label">异常展品</div>
          </div>
        </div>

        <div className="stat-card pending">
          <div className="stat-icon">⏳</div>
          <div className="stat-content">
            <div className="stat-number">{stats.overall.pendingCount}</div>
            <div className="stat-label">待巡检展品</div>
          </div>
        </div>
      </div>

      <div className="normal-rate-section">
        <div className="normal-rate-header">
          <h3>整体正常率</h3>
          <span className="normal-rate-value">{stats.overall.normalRate}%</span>
        </div>
        <div className="progress-bar">
          <div
            className="progress-fill normal-progress"
            style={{ width: `${stats.overall.normalRate}%` }}
          />
        </div>
      </div>

      <div className="zone-detail-section">
        <h3>各展区详情</h3>
        <div className="zone-detail-grid">
          {stats.zones.map(zoneStat => (
            <div key={zoneStat.zone} className="zone-detail-card">
              <div className="zone-detail-header">
                <h4 className="zone-detail-name">{zoneStat.zone}</h4>
                <span className="zone-detail-rate">{zoneStat.normalRate}%</span>
              </div>

              <div className="zone-progress">
                <div
                  className="zone-progress-fill normal"
                  style={{ width: `${zoneStat.normalRate}%` }}
                />
              </div>

              <div className="zone-stat-grid">
                <div className="zone-stat-item">
                  <span className="zone-stat-icon">📦</span>
                  <div className="zone-stat-info">
                    <span className="zone-stat-value">{zoneStat.totalCount}</span>
                    <span className="zone-stat-label">展品总数</span>
                  </div>
                </div>
                <div className="zone-stat-item">
                  <span className="zone-stat-icon">✅</span>
                  <div className="zone-stat-info">
                    <span className="zone-stat-value normal-text">{zoneStat.normalCount}</span>
                    <span className="zone-stat-label">正常</span>
                  </div>
                </div>
                <div className="zone-stat-item">
                  <span className="zone-stat-icon">⚠️</span>
                  <div className="zone-stat-info">
                    <span className="zone-stat-value abnormal-text">{zoneStat.abnormalCount}</span>
                    <span className="zone-stat-label">异常</span>
                  </div>
                </div>
                <div className="zone-stat-item">
                  <span className="zone-stat-icon">⏳</span>
                  <div className="zone-stat-info">
                    <span className="zone-stat-value pending-text">{zoneStat.pendingCount}</span>
                    <span className="zone-stat-label">待巡检</span>
                  </div>
                </div>
              </div>

              <div className="zone-stat-bar">
                <div
                  className="zone-stat-bar-segment normal-seg"
                  style={{ width: `${zoneStat.totalCount > 0 ? (zoneStat.normalCount / zoneStat.totalCount) * 100 : 0}%` }}
                />
                <div
                  className="zone-stat-bar-segment abnormal-seg"
                  style={{ width: `${zoneStat.totalCount > 0 ? (zoneStat.abnormalCount / zoneStat.totalCount) * 100 : 0}%` }}
                />
                <div
                  className="zone-stat-bar-segment pending-seg"
                  style={{ width: `${zoneStat.totalCount > 0 ? (zoneStat.pendingCount / zoneStat.totalCount) * 100 : 0}%` }}
                />
              </div>

              <div className="zone-legend">
                <span className="legend-item">
                  <span className="legend-dot normal-dot"></span>
                  正常
                </span>
                <span className="legend-item">
                  <span className="legend-dot abnormal-dot"></span>
                  异常
                </span>
                <span className="legend-item">
                  <span className="legend-dot pending-dot"></span>
                  待巡检
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="refresh-section">
        <button className="btn btn-primary refresh-btn" onClick={loadData}>
          🔄 刷新数据
        </button>
      </div>
    </div>
  );
}

export default ZoneOverview;
