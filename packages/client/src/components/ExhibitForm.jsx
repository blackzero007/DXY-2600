import React, { useState } from 'react';

function ExhibitForm({ zones, onClose, onSubmit }) {
  const [name, setName] = useState('');
  const [zone, setZone] = useState('');
  const [customZone, setCustomZone] = useState('');
  const [useCustomZone, setUseCustomZone] = useState(false);
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  function validate() {
    const newErrors = {};
    const finalZone = useCustomZone ? customZone : zone;
    
    if (!name.trim()) {
      newErrors.name = '请输入展品名称';
    }
    if (!finalZone.trim()) {
      newErrors.zone = '请选择或输入所属展区';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (validate()) {
      setSubmitting(true);
      try {
        const finalZone = useCustomZone ? customZone.trim() : zone;
        await onSubmit({
          name: name.trim(),
          zone: finalZone,
          description: description.trim()
        });
      } finally {
        setSubmitting(false);
      }
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h2>➕ 新增展品</h2>
        <p style={{ color: '#6b7280', marginBottom: '20px' }}>
          填写展品信息，将新展品加入系统
        </p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="exhibit-name">展品名称 *</label>
            <input
              id="exhibit-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="请输入展品名称"
              className={errors.name ? 'error' : ''}
            />
            {errors.name && (
              <p style={{ color: '#ef4444', fontSize: '0.85rem', marginTop: '5px' }}>
                {errors.name}
              </p>
            )}
          </div>

          <div className="form-group">
            <label>所属展区 *</label>
            {!useCustomZone ? (
              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <select
                  value={zone}
                  onChange={(e) => setZone(e.target.value)}
                  style={{ flex: 1 }}
                  className={errors.zone ? 'error' : ''}
                >
                  <option value="">请选择展区</option>
                  {zones.map(z => (
                    <option key={z} value={z}>{z}</option>
                  ))}
                </select>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ flex: 'none', padding: '12px 16px' }}
                  onClick={() => setUseCustomZone(true)}
                >
                  新增展区
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <input
                  type="text"
                  value={customZone}
                  onChange={(e) => setCustomZone(e.target.value)}
                  placeholder="请输入新展区名称"
                  style={{ flex: 1 }}
                  className={errors.zone ? 'error' : ''}
                />
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ flex: 'none', padding: '12px 16px' }}
                  onClick={() => { setUseCustomZone(false); setCustomZone(''); }}
                >
                  选择已有
                </button>
              </div>
            )}
            {errors.zone && (
              <p style={{ color: '#ef4444', fontSize: '0.85rem', marginTop: '5px' }}>
                {errors.zone}
              </p>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="exhibit-description">展品描述</label>
            <textarea
              id="exhibit-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="请输入展品描述（可选）"
              rows={4}
            />
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={submitting}>
              取消
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? '提交中...' : '确认添加'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ExhibitForm;
