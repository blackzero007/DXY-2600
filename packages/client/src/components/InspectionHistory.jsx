import React, { useState, useEffect } from 'react';
import { getInspections, exportInspections } from '../api/index.js';
import InspectionDetail from './InspectionDetail.jsx';

function InspectionHistory({ zones, selectedZone, onZoneChange }) {
  const [inspections, setInspections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('all');

  useEffect(() => {
    loadInspections();
  }, [selectedZone, selectedStatus]);

  async function loadInspections() {
    setLoading(true);
    try {
      const status = selectedStatus === 'all' ? null : selectedStatus;
      const data = await getInspections(selectedZone, status);
      setInspections(data);
    } catch (error) {
      console.error('加载巡检历史失败:', error);
    } finally {
      setLoading(false);
    }
  }

  function formatDate(dateStr) {
    return new Date(dateStr).toLocaleString('zh-CN');
  }

  async function handleExport() {
    if (exporting) return;
    setExporting(true);
    try {
      const status = selectedStatus === 'all' ? null : selectedStatus;
      await exportInspections(selectedZone, status);
    } catch (error) {
      console.error('导出失败:', error);
      alert('导出失败，请稍后重试');
    } finally {
      setExporting(false);
    }
  }

  return (
    <div>
      <div className="filter-bar">
        <label htmlFor="zone-filter-history">按展区筛选：</label>
        <select
          id="zone-filter-history"
          value={selectedZone || ''}
          onChange={(e) => onZoneChange(e.target.value || null)}
        >
          <option value="">全部展区</option>
          {zones.map(zone => (
            <option key={zone} value={zone}>{zone}</option>
          ))}
        </select>
        <label htmlFor="status-filter-history">按状态筛选：</label>
        <select
          id="status-filter-history"
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
        >
          <option value="all">全部状态</option>
          <option value="normal">✅ 正常</option>
          <option value="abnormal">⚠️ 异常</option>
        </select>
        <button
          className="btn-export"
          onClick={handleExport}
          disabled={exporting || inspections.length === 0}
        >
          {exporting ? '导出中...' : '📥 导出 CSV'}
        </button>
      </div>

      {loading ? (
        <div className="loading">加载中...</div>
      ) : inspections.length === 0 ? (
        <div className="empty-state">
          <div className="icon">📭</div>
          <h3>暂无巡检记录</h3>
          <p>还没有任何巡检记录</p>
        </div>
      ) : (
        <div className="history-table">
          <table>
            <thead>
              <tr>
                <th>展品名称</th>
                <th>所属展区</th>
                <th>巡检员</th>
                <th>状态</th>
                <th>备注</th>
                <th>巡检时间</th>
              </tr>
            </thead>
            <tbody>
              {inspections.map(record => (
                <tr key={record.id} className="clickable-row" onClick={() => setSelectedRecord(record)}>
                  <td>
                    <strong>{record.exhibit_name}</strong>
                  </td>
                  <td>{record.exhibit_zone}</td>
                  <td>{record.inspector}</td>
                  <td>
                    <span className={`status-badge ${record.status}`}>
                      {record.status === 'normal' ? '✅ 正常' : '⚠️ 异常'}
                    </span>
                  </td>
                  <td>{record.remarks || '-'}</td>
                  <td>{formatDate(record.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedRecord && (
        <InspectionDetail
          record={selectedRecord}
          onClose={() => setSelectedRecord(null)}
        />
      )}
    </div>
  );
}

export default InspectionHistory;
