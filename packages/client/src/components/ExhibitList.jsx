import React, { useState, useEffect } from 'react';
import { getExhibits, createInspection, getExhibitInspections } from '../api/index.js';
import InspectionModal from './InspectionModal.jsx';

function ExhibitList({ zones, selectedZone, onZoneChange, onShowToast }) {
  const [exhibits, setExhibits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedExhibit, setSelectedExhibit] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [exhibitHistory, setExhibitHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    loadExhibits();
  }, [selectedZone]);

  async function loadExhibits() {
    setLoading(true);
    try {
      const data = await getExhibits(selectedZone);
      setExhibits(data);
    } catch (error) {
      console.error('加载展品失败:', error);
      onShowToast('加载展品失败', 'error');
    } finally {
      setLoading(false);
    }
  }

  function handleInspect(exhibit) {
    setSelectedExhibit(exhibit);
    setShowModal(true);
  }

  async function handleViewHistory(exhibit) {
    setSelectedExhibit(exhibit);
    setHistoryLoading(true);
    setShowHistoryModal(true);
    try {
      const data = await getExhibitInspections(exhibit.id);
      setExhibitHistory(data);
    } catch (error) {
      console.error('加载历史记录失败:', error);
      onShowToast('加载历史记录失败', 'error');
    } finally {
      setHistoryLoading(false);
    }
  }

  async function handleSubmitInspection(data) {
    try {
      await createInspection({
        exhibit_id: selectedExhibit.id,
        inspector: data.inspector,
        status: data.status,
        remarks: data.remarks
      });
      onShowToast('巡检记录提交成功');
      setShowModal(false);
      loadExhibits();
    } catch (error) {
      console.error('提交巡检记录失败:', error);
      onShowToast(error.message || '提交失败', 'error');
    }
  }

  function formatDate(dateStr) {
    if (!dateStr) return '未巡检';
    return new Date(dateStr).toLocaleString('zh-CN');
  }

  const stats = {
    total: exhibits.length,
    normal: exhibits.filter(e => e.last_status === 'normal').length,
    abnormal: exhibits.filter(e => e.last_status === 'abnormal').length,
    neverInspected: exhibits.filter(e => !e.last_status).length
  };

  return (
    <div>
      <div className="filter-bar">
        <label htmlFor="zone-filter">按展区筛选：</label>
        <select
          id="zone-filter"
          value={selectedZone || ''}
          onChange={(e) => onZoneChange(e.target.value || null)}
        >
          <option value="">全部展区</option>
          {zones.map(zone => (
            <option key={zone} value={zone}>{zone}</option>
          ))}
        </select>
      </div>

      <div className="stats">
        <div className="stat-card">
          <h3>展品总数</h3>
          <div className="number">{stats.total}</div>
        </div>
        <div className="stat-card normal">
          <h3>状态正常</h3>
          <div className="number">{stats.normal}</div>
        </div>
        <div className="stat-card abnormal">
          <h3>异常展品</h3>
          <div className="number">{stats.abnormal}</div>
        </div>
        <div className="stat-card">
          <h3>待巡检</h3>
          <div className="number">{stats.neverInspected}</div>
        </div>
      </div>

      {loading ? (
        <div className="loading">加载中...</div>
      ) : exhibits.length === 0 ? (
        <div className="empty-state">
          <div className="icon">📭</div>
          <h3>暂无展品</h3>
          <p>该展区下没有展品</p>
        </div>
      ) : (
        <div className="exhibit-grid">
          {exhibits.map(exhibit => (
            <div
              key={exhibit.id}
              className={`exhibit-card ${exhibit.last_status === 'abnormal' ? 'abnormal' : ''}`}
            >
              <span className="zone-tag">{exhibit.zone}</span>
              <h3>{exhibit.name}</h3>
              <p className="description">{exhibit.description}</p>
              <div className="status">
                <span>
                  {exhibit.last_status ? (
                    <span className={`status-badge ${exhibit.last_status}`}>
                      {exhibit.last_status === 'normal' ? '✅ 正常' : '⚠️ 异常'}
                    </span>
                  ) : (
                    <span className="status-badge">未巡检</span>
                  )}
                </span>
                <small>上次巡检: {formatDate(exhibit.last_inspected)}</small>
              </div>
              <div className="card-actions">
                <button className="btn btn-primary" onClick={() => handleInspect(exhibit)}>
                  📝 开始巡检
                </button>
                <button className="btn btn-secondary" onClick={() => handleViewHistory(exhibit)}>
                  📋 历史记录
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && selectedExhibit && (
        <InspectionModal
          exhibit={selectedExhibit}
          onClose={() => setShowModal(false)}
          onSubmit={handleSubmitInspection}
        />
      )}

      {showHistoryModal && selectedExhibit && (
        <div className="modal-overlay" onClick={() => setShowHistoryModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>📋 {selectedExhibit.name} - 巡检历史</h2>
            {historyLoading ? (
              <div className="loading">加载中...</div>
            ) : exhibitHistory.length === 0 ? (
              <div className="empty-state">
                <div className="icon">📭</div>
                <h3>暂无巡检记录</h3>
              </div>
            ) : (
              <div className="history-table">
                <table>
                  <thead>
                    <tr>
                      <th>巡检员</th>
                      <th>状态</th>
                      <th>备注</th>
                      <th>时间</th>
                    </tr>
                  </thead>
                  <tbody>
                    {exhibitHistory.map(record => (
                      <tr key={record.id}>
                        <td>{record.inspector}</td>
                        <td>
                          <span className={`status-badge ${record.status}`}>
                            {record.status === 'normal' ? '正常' : '异常'}
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
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowHistoryModal(false)}>
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ExhibitList;
