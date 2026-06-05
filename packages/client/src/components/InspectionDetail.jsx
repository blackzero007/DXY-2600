import React from 'react';

function InspectionDetail({ record, onClose }) {
  function formatDate(dateStr) {
    return new Date(dateStr).toLocaleString('zh-CN');
  }

  function getStatusText(status) {
    return status === 'normal' ? '正常' : '异常';
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal detail-modal" onClick={e => e.stopPropagation()}>
        <div className="detail-header">
          <span className="zone-tag">{record.exhibit_zone}</span>
          <h2>📋 巡检记录详情</h2>
          <span className={`status-badge detail-status ${record.status}`}>
            {record.status === 'normal' ? '✅' : '⚠️'} {getStatusText(record.status)}
          </span>
        </div>

        <div className="detail-section">
          <h3>🏺 展品信息</h3>
          <div className="info-grid">
            <div className="info-item">
              <span className="info-label">展品名称</span>
              <span className="info-value"><strong>{record.exhibit_name}</strong></span>
            </div>
            <div className="info-item">
              <span className="info-label">所属展区</span>
              <span className="info-value">{record.exhibit_zone}</span>
            </div>
          </div>
        </div>

        <div className="detail-section">
          <h3>👤 巡检信息</h3>
          <div className="info-grid">
            <div className="info-item">
              <span className="info-label">巡检员</span>
              <span className="info-value">{record.inspector}</span>
            </div>
            <div className="info-item">
              <span className="info-label">巡检状态</span>
              <span className={`status-badge ${record.status}`}>
                {getStatusText(record.status)}
              </span>
            </div>
            <div className="info-item">
              <span className="info-label">创建时间</span>
              <span className="info-value">{formatDate(record.created_at)}</span>
            </div>
          </div>
        </div>

        <div className="detail-section">
          <h3>📝 巡检备注</h3>
          <div className="remarks-box">
            {record.remarks ? record.remarks : '暂无备注信息'}
          </div>
        </div>

        <div className="modal-actions detail-actions">
          <button className="btn btn-secondary" onClick={onClose}>
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}

export default InspectionDetail;
