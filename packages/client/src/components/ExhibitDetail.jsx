import React from 'react';

function ExhibitDetail({ exhibit, onClose, onInspect, onViewHistory }) {
  function formatDate(dateStr) {
    if (!dateStr) return '未巡检';
    return new Date(dateStr).toLocaleString('zh-CN');
  }

  function getStatusText(status) {
    if (!status) return '未巡检';
    return status === 'normal' ? '正常' : '异常';
  }

  function getStatusBadgeClass(status) {
    if (!status) return '';
    return status;
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal detail-modal" onClick={e => e.stopPropagation()}>
        <div className="detail-header">
          <span className="zone-tag">{exhibit.zone}</span>
          <h2>🏺 {exhibit.name}</h2>
          <span className={`status-badge detail-status ${getStatusBadgeClass(exhibit.last_status)}`}>
            {exhibit.last_status === 'normal' ? '✅' : exhibit.last_status === 'abnormal' ? '⚠️' : '❓'} {getStatusText(exhibit.last_status)}
          </span>
        </div>

        <div className="detail-section">
          <h3>📖 展品简介</h3>
          <p className="detail-description">{exhibit.description}</p>
        </div>

        <div className="detail-section">
          <h3>📊 巡检信息</h3>
          <div className="info-grid">
            <div className="info-item">
              <span className="info-label">当前状态</span>
              <span className={`status-badge ${getStatusBadgeClass(exhibit.last_status)}`}>
                {getStatusText(exhibit.last_status)}
              </span>
            </div>
            <div className="info-item">
              <span className="info-label">最近巡检时间</span>
              <span className="info-value">{formatDate(exhibit.last_inspected)}</span>
            </div>
            <div className="info-item">
              <span className="info-label">最近巡检员</span>
              <span className="info-value">{exhibit.last_inspector || '-'}</span>
            </div>
          </div>
        </div>

        <div className="detail-section">
          <h3>📝 最近巡检备注</h3>
          <div className="remarks-box">
            {exhibit.last_remarks ? exhibit.last_remarks : '暂无备注信息'}
          </div>
        </div>

        <div className="modal-actions detail-actions">
          <button className="btn btn-secondary" onClick={onClose}>
            关闭
          </button>
          <button className="btn btn-secondary" onClick={() => onViewHistory && onViewHistory(exhibit)}>
            📋 历史记录
          </button>
          <button className="btn btn-primary" onClick={() => onInspect && onInspect(exhibit)}>
            📝 开始巡检
          </button>
        </div>
      </div>
    </div>
  );
}

export default ExhibitDetail;
