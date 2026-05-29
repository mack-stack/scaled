import { useState } from 'react';
import './App.css';
import Portfolio from './pages/Portfolio';
import TokenHealth from './pages/TokenHealth';
import Incidents from './pages/Incidents';
import Onboarding from './pages/Onboarding';
import Plays from './pages/Plays';
import Customers from './pages/Customers';
import Community from './pages/Community';
import Comms from './pages/Comms';
import Benchmarks from './pages/Benchmarks';

const NAV = [
  { key: 'portfolio', label: 'Portfolio Overview', section: 'Command Center' },
  { key: 'token-health', label: 'Token Health', section: 'Modules' },
  { key: 'incidents', label: 'Incident Response', section: 'Modules' },
  { key: 'onboarding', label: 'Onboarding Autopilot', section: 'Modules' },
  { key: 'community', label: 'Community Intel', section: 'Intelligence' },
  { key: 'comms', label: 'Comms Feed', section: 'Intelligence' },
  { key: 'benchmarks', label: 'Champion Benchmarks', section: 'Intelligence' },
  { key: 'plays', label: 'Plays Queue', section: 'Actions' },
  { key: 'customers', label: 'Customers', section: 'Actions' },
];

const PAGES = {
  'portfolio': Portfolio,
  'token-health': TokenHealth,
  'incidents': Incidents,
  'onboarding': Onboarding,
  'community': Community,
  'comms': Comms,
  'benchmarks': Benchmarks,
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
        <div className="demo-banner">
          Real companies, pricing, incidents, and GitHub issues. Usage data is simulated.
          <span>Sources: claude.com/customers, status.claude.com, github.com/anthropics/claude-code, docs.anthropic.com/pricing</span>
        </div>
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
