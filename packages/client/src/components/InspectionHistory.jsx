import React, { useState, useEffect, useRef } from 'react';
import { getInspections, exportInspections } from '../api/index.js';
import InspectionDetail from './InspectionDetail.jsx';

const SORTABLE_COLUMNS = [
  { key: 'exhibit_name', label: '展品名称' },
  { key: 'exhibit_zone', label: '所属展区' },
  { key: 'inspector', label: '巡检员' },
  { key: 'status', label: '状态' },
  { key: 'created_at', label: '巡检时间' }
];

function InspectionHistory({ zones, selectedZone, onZoneChange }) {
  const [inspections, setInspections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');
  const [remarksKeyword, setRemarksKeyword] = useState('');
  const [remarksInput, setRemarksInput] = useState('');
  const abortControllerRef = useRef(null);
  const requestIdRef = useRef(0);

  const QUICK_KEYWORDS = ['损伤', '修复', '良好'];

  useEffect(() => {
    loadInspections();
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [selectedZone, selectedStatus, sortBy, sortOrder, remarksKeyword]);

  async function loadInspections() {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;
    const currentRequestId = ++requestIdRef.current;

    setLoading(true);
    setError(null);
    try {
      const status = selectedStatus === 'all' ? null : selectedStatus;
      const data = await getInspections(selectedZone, status, sortBy, sortOrder, remarksKeyword || null, controller.signal);
      if (controller.signal.aborted) return;
      if (currentRequestId !== requestIdRef.current) return;
      setInspections(data);
      setError(null);
    } catch (err) {
      if (err.name === 'AbortError') {
        return;
      }
      if (currentRequestId !== requestIdRef.current) return;
      console.error('加载巡检历史失败:', err);
      setInspections([]);
      setError({
        message: err.message || '加载失败',
        type: err.type || 'unknown',
        status: err.status || 0
      });
    } finally {
      if (!controller.signal.aborted && currentRequestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }

  function handleRemarksSearch() {
    setRemarksKeyword(remarksInput.trim());
  }

  function handleRemarksKeyDown(e) {
    if (e.key === 'Enter') {
      handleRemarksSearch();
    }
  }

  function handleQuickKeyword(keyword) {
    setRemarksInput(keyword);
    setRemarksKeyword(keyword);
  }

  function clearRemarksSearch() {
    setRemarksInput('');
    setRemarksKeyword('');
  }

  function handleSort(columnKey) {
    if (sortBy === columnKey) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(columnKey);
      setSortOrder('desc');
    }
  }

  function getSortIcon(columnKey) {
    if (sortBy !== columnKey) {
      return ' ↕';
    }
    return sortOrder === 'asc' ? ' ↑' : ' ↓';
  }

  function formatDate(dateStr) {
    return new Date(dateStr).toLocaleString('zh-CN');
  }

  async function handleExport() {
    if (exporting) return;
    setExporting(true);
    try {
      const status = selectedStatus === 'all' ? null : selectedStatus;
      await exportInspections(selectedZone, status, sortBy, sortOrder, remarksKeyword || null);
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
        <label htmlFor="sort-by-filter">排序字段：</label>
        <select
          id="sort-by-filter"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
        >
          {SORTABLE_COLUMNS.map(col => (
            <option key={col.key} value={col.key}>{col.label}</option>
          ))}
        </select>
        <button
          className="btn-sort-toggle"
          onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
          title={sortOrder === 'asc' ? '点击切换为降序' : '点击切换为升序'}
        >
          {sortOrder === 'asc' ? '↑ 升序' : '↓ 降序'}
        </button>
        <button
          className="btn-export"
          onClick={handleExport}
          disabled={exporting || inspections.length === 0}
        >
          {exporting ? '导出中...' : '📥 导出 CSV'}
        </button>
      </div>

      <div className="search-bar">
        <label htmlFor="remarks-search">备注关键字搜索：</label>
        <input
          type="text"
          id="remarks-search"
          className="remarks-search-input"
          placeholder="请输入备注关键字，如：损伤、修复、良好"
          value={remarksInput}
          onChange={(e) => setRemarksInput(e.target.value)}
          onKeyDown={handleRemarksKeyDown}
        />
        <button className="btn-search" onClick={handleRemarksSearch}>
          🔍 搜索
        </button>
        {remarksKeyword && (
          <button className="btn-clear-search" onClick={clearRemarksSearch}>
            ✕ 清除
          </button>
        )}
        <div className="quick-keywords">
          <span className="quick-keywords-label">快捷搜索：</span>
          {QUICK_KEYWORDS.map(keyword => (
            <button
              key={keyword}
              className={`quick-keyword-tag ${remarksKeyword === keyword ? 'active' : ''}`}
              onClick={() => handleQuickKeyword(keyword)}
            >
              {keyword}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="loading">加载中...</div>
      ) : error ? (
        <div className="error-state">
          <div className="icon">❌</div>
          <h3>加载巡检历史失败</h3>
          <p className="error-detail">{error.message}</p>
          {error.type && (
            <p className="error-type">
              错误类型：{
                error.type === 'network' ? '网络连接错误' :
                error.type === 'server' ? '服务器错误' :
                error.type === 'validation' ? '请求参数错误' :
                error.type === 'not_found' ? '资源不存在' :
                '未知错误'
              }
            </p>
          )}
          <button className="btn-retry" onClick={loadInspections}>
            🔄 重新加载
          </button>
        </div>
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
                <th 
                  className="sortable-header"
                  onClick={() => handleSort('exhibit_name')}
                  title="点击排序"
                >
                  展品名称{getSortIcon('exhibit_name')}
                </th>
                <th 
                  className="sortable-header"
                  onClick={() => handleSort('exhibit_zone')}
                  title="点击排序"
                >
                  所属展区{getSortIcon('exhibit_zone')}
                </th>
                <th 
                  className="sortable-header"
                  onClick={() => handleSort('inspector')}
                  title="点击排序"
                >
                  巡检员{getSortIcon('inspector')}
                </th>
                <th 
                  className="sortable-header"
                  onClick={() => handleSort('status')}
                  title="点击排序"
                >
                  状态{getSortIcon('status')}
                </th>
                <th>备注</th>
                <th 
                  className="sortable-header"
                  onClick={() => handleSort('created_at')}
                  title="点击排序"
                >
                  巡检时间{getSortIcon('created_at')}
                </th>
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
