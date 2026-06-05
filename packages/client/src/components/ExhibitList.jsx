import React, { useState, useEffect } from 'react';
import { getExhibits, createInspection, getExhibitInspections, getExhibitById, createExhibit, getZones, getOverdueExhibits } from '../api/index.js';
import InspectionModal from './InspectionModal.jsx';
import ExhibitDetail from './ExhibitDetail.jsx';
import ExhibitForm from './ExhibitForm.jsx';

function ExhibitList({ zones, selectedZone, onZoneChange, onShowToast, onRefreshZones }) {
  const [exhibits, setExhibits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedExhibit, setSelectedExhibit] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [exhibitHistory, setExhibitHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailExhibit, setDetailExhibit] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [overdueExhibits, setOverdueExhibits] = useState([]);
  const [overdueHours, setOverdueHours] = useState(24);
  const [showReminder, setShowReminder] = useState(true);
  const [searchKeyword, setSearchKeyword] = useState('');

  useEffect(() => {
    loadExhibits();
    loadOverdueExhibits();
  }, [selectedZone, overdueHours]);

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

  async function loadOverdueExhibits() {
    try {
      const data = await getOverdueExhibits(overdueHours, selectedZone);
      setOverdueExhibits(data);
    } catch (error) {
      console.error('加载巡检提醒失败:', error);
    }
  }

  async function handleViewDetail(exhibit) {
    setSelectedExhibit(exhibit);
    setDetailExhibit(null);
    setDetailLoading(true);
    setShowDetailModal(true);
    try {
      const data = await getExhibitById(exhibit.id);
      setDetailExhibit(data);
    } catch (error) {
      console.error('加载展品详情失败:', error);
      onShowToast('加载展品详情失败', 'error');
      setShowDetailModal(false);
    } finally {
      setDetailLoading(false);
    }
  }

  function handleCloseDetail() {
    setShowDetailModal(false);
    setDetailExhibit(null);
    setDetailLoading(false);
  }

  function handleInspect(exhibit) {
    handleCloseDetail();
    setSelectedExhibit(exhibit);
    setShowModal(true);
  }

  function handleViewHistoryFromDetail(exhibit) {
    handleCloseDetail();
    handleViewHistory(exhibit);
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
      loadOverdueExhibits();
    } catch (error) {
      console.error('提交巡检记录失败:', error);
      onShowToast(error.message || '提交失败', 'error');
    }
  }

  async function handleAddExhibit(data) {
    try {
      await createExhibit(data);
      onShowToast('展品添加成功');
      setShowAddForm(false);
      loadExhibits();
      loadOverdueExhibits();
      if (onRefreshZones) {
        onRefreshZones();
      }
    } catch (error) {
      console.error('添加展品失败:', error);
      onShowToast(error.message || '添加失败', 'error');
    }
  }

  function formatDate(dateStr) {
    if (!dateStr) return '未巡检';
    return new Date(dateStr).toLocaleString('zh-CN');
  }

  const filteredExhibits = exhibits.filter(exhibit => {
    if (!searchKeyword.trim()) return true;
    const keyword = searchKeyword.toLowerCase().trim();
    return exhibit.name.toLowerCase().includes(keyword);
  });

  const stats = {
    total: filteredExhibits.length,
    normal: filteredExhibits.filter(e => e.last_status === 'normal').length,
    abnormal: filteredExhibits.filter(e => e.last_status === 'abnormal').length,
    neverInspected: filteredExhibits.filter(e => !e.last_status).length
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
        <div className="search-container">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            className="search-input"
            placeholder="搜索展品名称..."
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
          />
          {searchKeyword && (
            <button
              className="search-clear"
              onClick={() => setSearchKeyword('')}
              title="清除搜索"
            >
              ✕
            </button>
          )}
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <button className="btn btn-primary" onClick={() => setShowAddForm(true)}>
            ➕ 新增展品
          </button>
        </div>
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

      {showReminder && (
        <div className="reminder-section">
          <div className="reminder-header">
            <div className="reminder-title">
              <span className="reminder-icon">⏰</span>
              <h3>巡检提醒</h3>
              <span className="reminder-count">{overdueExhibits.length} 件待处理</span>
            </div>
            <div className="reminder-controls">
              <select
                className="hours-select"
                value={overdueHours}
                onChange={(e) => setOverdueHours(parseInt(e.target.value, 10))}
              >
                <option value="12">超过12小时</option>
                <option value="24">超过24小时</option>
                <option value="48">超过48小时</option>
                <option value="72">超过72小时</option>
              </select>
              <button
                className="btn btn-minimal"
                onClick={() => setShowReminder(false)}
                title="收起提醒"
              >
                收起
              </button>
            </div>
          </div>

          {overdueExhibits.length === 0 ? (
            <div className="reminder-empty">
              <span className="reminder-empty-icon">✅</span>
              <p>所有展品均在 {overdueHours} 小时内完成了巡检</p>
            </div>
          ) : (
            <div className="reminder-list">
              {overdueExhibits.slice(0, 6).map(exhibit => (
                <div
                  key={exhibit.id}
                  className="reminder-item"
                  onClick={() => handleViewDetail(exhibit)}
                >
                  <div className="reminder-item-info">
                    <span className="reminder-zone">{exhibit.zone}</span>
                    <h4 className="reminder-name">{exhibit.name}</h4>
                    <p className="reminder-desc">{exhibit.description}</p>
                  </div>
                  <div className="reminder-item-status">
                    {exhibit.is_never_inspected ? (
                      <span className="reminder-badge never">从未巡检</span>
                    ) : (
                      <>
                        <span className={`reminder-badge ${exhibit.last_status}`}>
                          {exhibit.last_status === 'normal' ? '上次正常' : '上次异常'}
                        </span>
                        <span className="reminder-time">
                          已逾 {exhibit.hours_since_last} 小时
                        </span>
                      </>
                    )}
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={(e) => { e.stopPropagation(); handleInspect(exhibit); }}
                    >
                      立即巡检
                    </button>
                  </div>
                </div>
              ))}
              {overdueExhibits.length > 6 && (
                <div className="reminder-more">
                  还有 {overdueExhibits.length - 6} 件展品需要巡检，请在下方列表中查看
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {!showReminder && (
        <button className="btn btn-reminder-expand" onClick={() => setShowReminder(true)}>
          <span>⏰</span> 展开巡检提醒 ({overdueExhibits.length})
        </button>
      )}

      {loading ? (
        <div className="loading">加载中...</div>
      ) : filteredExhibits.length === 0 ? (
        <div className="empty-state">
          <div className="icon">📭</div>
          {searchKeyword ? (
            <>
              <h3>未找到匹配的展品</h3>
              <p>没有找到包含"{searchKeyword}"的展品，请尝试其他关键词</p>
            </>
          ) : (
            <>
              <h3>暂无展品</h3>
              <p>该展区下没有展品</p>
            </>
          )}
        </div>
      ) : (
        <div className="exhibit-grid">
          {filteredExhibits.map(exhibit => (
            <div
              key={exhibit.id}
              className={`exhibit-card ${exhibit.last_status === 'abnormal' ? 'abnormal' : ''}`}
              onClick={() => handleViewDetail(exhibit)}
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
                <button className="btn btn-primary" onClick={(e) => { e.stopPropagation(); handleInspect(exhibit); }}>
                  📝 开始巡检
                </button>
                <button className="btn btn-secondary" onClick={(e) => { e.stopPropagation(); handleViewHistory(exhibit); }}>
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

      {showDetailModal && detailExhibit && !detailLoading && (
        <ExhibitDetail
          exhibit={detailExhibit}
          onClose={handleCloseDetail}
          onInspect={handleInspect}
          onViewHistory={handleViewHistoryFromDetail}
        />
      )}

      {showDetailModal && detailLoading && (
        <div className="modal-overlay" onClick={handleCloseDetail}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="loading">加载中...</div>
          </div>
        </div>
      )}

      {showAddForm && (
        <ExhibitForm
          zones={zones}
          onClose={() => setShowAddForm(false)}
          onSubmit={handleAddExhibit}
        />
      )}
    </div>
  );
}

export default ExhibitList;
