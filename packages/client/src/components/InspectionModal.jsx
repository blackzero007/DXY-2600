import React, { useState } from 'react';

function InspectionModal({ exhibit, onClose, onSubmit, submitError, submitting }) {
  const [inspector, setInspector] = useState('');
  const [status, setStatus] = useState('normal');
  const [remarks, setRemarks] = useState('');
  const [errors, setErrors] = useState({});

  function validate() {
    const newErrors = {};
    if (!inspector.trim()) {
      newErrors.inspector = '请输入巡检员姓名';
    }
    if (status === 'abnormal' && !remarks.trim()) {
      newErrors.remarks = '异常状态下备注为必填项';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (validate()) {
      onSubmit({ inspector: inspector.trim(), status, remarks: remarks.trim() });
    }
  }

  function getErrorTypeLabel(type) {
    switch (type) {
      case 'validation':
        return '参数错误';
      case 'not_found':
        return '资源不存在';
      case 'server':
        return '服务器错误';
      case 'network':
        return '网络错误';
      default:
        return '提交失败';
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h2>📝 巡检记录 - {exhibit.name}</h2>
        <p style={{ color: '#6b7280', marginBottom: '20px' }}>
          展区: {exhibit.zone}
        </p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="inspector">巡检员姓名 *</label>
            <input
              id="inspector"
              type="text"
              value={inspector}
              onChange={(e) => setInspector(e.target.value)}
              placeholder="请输入巡检员姓名"
              className={errors.inspector ? 'error' : ''}
            />
            {errors.inspector && (
              <p style={{ color: '#ef4444', fontSize: '0.85rem', marginTop: '5px' }}>
                {errors.inspector}
              </p>
            )}
          </div>

          <div className="form-group">
            <label>巡检状态 *</label>
            <div className="status-options">
              <div
                className={`status-option ${status === 'normal' ? 'selected normal' : ''}`}
                onClick={() => setStatus('normal')}
              >
                <div className="icon">✅</div>
                <div>正常</div>
              </div>
              <div
                className={`status-option ${status === 'abnormal' ? 'selected abnormal' : ''}`}
                onClick={() => setStatus('abnormal')}
              >
                <div className="icon">⚠️</div>
                <div>异常</div>
              </div>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="remarks">
              备注说明 {status === 'abnormal' && <span style={{ color: '#ef4444' }}>*</span>}
            </label>
            <textarea
              id="remarks"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder={status === 'abnormal' ? '请输入异常备注说明（必填）' : '请输入巡检备注（可选）'}
              className={errors.remarks ? 'error' : ''}
            />
            {errors.remarks && (
              <p style={{ color: '#ef4444', fontSize: '0.85rem', marginTop: '5px' }}>
                {errors.remarks}
              </p>
            )}
          </div>

          {submitError && (
            <div className="submit-error">
              <div className="submit-error-icon">⚠️</div>
              <div className="submit-error-content">
                <p className="submit-error-title">
                  {submitError.type ? getErrorTypeLabel(submitError.type) : '提交失败'}
                </p>
                <p className="submit-error-message">{submitError.message}</p>
                {submitError.status && submitError.status > 0 && (
                  <p className="submit-error-code">错误码：{submitError.status}</p>
                )}
              </div>
            </div>
          )}

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={submitting}>
              取消
            </button>
            <button type="submit" className={`btn ${status === 'abnormal' ? 'btn-danger' : 'btn-primary'}`} disabled={submitting}>
              {submitting ? '提交中...' : '提交巡检记录'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default InspectionModal;
