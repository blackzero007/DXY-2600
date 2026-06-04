import React, { useState, useEffect } from 'react';
import ExhibitList from './components/ExhibitList.jsx';
import InspectionHistory from './components/InspectionHistory.jsx';
import { getZones } from './api/index.js';

function App() {
  const [activeTab, setActiveTab] = useState('exhibits');
  const [zones, setZones] = useState([]);
  const [selectedZone, setSelectedZone] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    loadZones();
  }, []);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  async function loadZones() {
    try {
      const data = await getZones();
      setZones(data);
    } catch (error) {
      console.error('加载展区失败:', error);
    }
  }

  function showToast(message, type = 'success') {
    setToast({ message, type });
  }

  return (
    <div className="app">
      <header className="header">
        <h1>🏛️ 展品巡检系统</h1>
        <p>博物馆展品智能巡检管理平台</p>
      </header>

      <nav className="nav-tabs">
        <button
          className={`nav-tab ${activeTab === 'exhibits' ? 'active' : ''}`}
          onClick={() => setActiveTab('exhibits')}
        >
          📋 展品列表
        </button>
        <button
          className={`nav-tab ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          📝 巡检历史
        </button>
      </nav>

      <main className="content">
        {activeTab === 'exhibits' ? (
          <ExhibitList
            zones={zones}
            selectedZone={selectedZone}
            onZoneChange={setSelectedZone}
            onShowToast={showToast}
          />
        ) : (
          <InspectionHistory
            zones={zones}
            selectedZone={selectedZone}
            onZoneChange={setSelectedZone}
          />
        )}
      </main>

      {toast && (
        <div className={`toast ${toast.type}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}

export default App;
