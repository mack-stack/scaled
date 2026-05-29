import { useState } from 'react';
import './App.css';
import Portfolio from './pages/Portfolio';
import TokenHealth from './pages/TokenHealth';
import Incidents from './pages/Incidents';
import Onboarding from './pages/Onboarding';
import Plays from './pages/Plays';
import Customers from './pages/Customers';

const NAV = [
  { key: 'portfolio', label: 'Portfolio Overview', section: 'Command Center' },
  { key: 'token-health', label: 'Token Health', section: 'Modules' },
  { key: 'incidents', label: 'Incident Response', section: 'Modules' },
  { key: 'onboarding', label: 'Onboarding Autopilot', section: 'Modules' },
  { key: 'plays', label: 'Plays Queue', section: 'Actions' },
  { key: 'customers', label: 'Customers', section: 'Actions' },
];

const PAGES = {
  'portfolio': Portfolio,
  'token-health': TokenHealth,
  'incidents': Incidents,
  'onboarding': Onboarding,
  'plays': Plays,
  'customers': Customers,
};

function App() {
  const [page, setPage] = useState('portfolio');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const Page = PAGES[page];

  let currentSection = '';

  return (
    <div className="app">
      <nav className="sidebar">
        <div className="sidebar-logo">
          Scaled
          <span>AI-Native CS Platform</span>
        </div>

        {NAV.map((item) => {
          const showSection = item.section !== currentSection;
          if (showSection) currentSection = item.section;
          return (
            <div key={item.key}>
              {showSection && <div className="sidebar-section">{item.section}</div>}
              <button
                className={`nav-item ${page === item.key ? 'active' : ''}`}
                onClick={() => { setPage(item.key); setSelectedCustomer(null); }}
              >
                {item.label}
              </button>
            </div>
          );
        })}
      </nav>

      <main className="main">
        <Page
          selectedCustomer={selectedCustomer}
          onSelectCustomer={(id) => {
            setSelectedCustomer(id);
            if (id && page === 'customers') return;
            if (id) setPage('customers');
          }}
        />
      </main>
    </div>
  );
}

export default App;
