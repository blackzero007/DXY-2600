import React, { useState, useEffect } from 'react';
import { getInspections } from '../api/index.js';
import InspectionDetail from './InspectionDetail.jsx';

function InspectionHistory({ zones, selectedZone, onZoneChange }) {
  const [inspections, setInspections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState(null);

  useEffect(() => {
    loadInspections();
  }, [selectedZone]);

  async function loadInspections() {
    setLoading(true);
    try {
      const data = await getInspections(selectedZone);
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
