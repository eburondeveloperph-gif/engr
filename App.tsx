import React, { useState } from 'react';
import { StoreProvider } from './context/StoreContext';
import { Inventory } from './components/Inventory';
import { POS } from './components/POS';
import { Accounting } from './components/Accounting';
import { Consultant } from './components/Consultant';
import { VoiceHardy } from './components/VoiceHardy';
import { LayoutGrid, ShoppingCart, PieChart, BrainCircuit } from 'lucide-react';
import { ViewState } from './types';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewState>(ViewState.POS);

  const renderView = () => {
    switch (currentView) {
      case ViewState.INVENTORY: return <Inventory />;
      case ViewState.POS: return <POS />;
      case ViewState.ACCOUNTING: return <Accounting />;
      case ViewState.CONSULTANT: return <Consultant />;
      default: return <POS />;
    }
  };

  return (
    <StoreProvider>
      <div className="h-full w-full flex flex-col bg-slate-100">
        {/* Main Content Area */}
        <main className="flex-1 overflow-hidden relative">
          {renderView()}
          <VoiceHardy />
        </main>

        {/* Bottom Navigation */}
        <nav className="bg-white border-t border-slate-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-40">
          <div className="flex justify-around items-center h-16 md:h-20 max-w-4xl mx-auto">
            <NavButton 
              active={currentView === ViewState.POS} 
              onClick={() => setCurrentView(ViewState.POS)} 
              icon={<ShoppingCart size={24} />} 
              label="POS" 
            />
            <NavButton 
              active={currentView === ViewState.INVENTORY} 
              onClick={() => setCurrentView(ViewState.INVENTORY)} 
              icon={<LayoutGrid size={24} />} 
              label="Inventory" 
            />
            <NavButton 
              active={currentView === ViewState.ACCOUNTING} 
              onClick={() => setCurrentView(ViewState.ACCOUNTING)} 
              icon={<PieChart size={24} />} 
              label="Accounting" 
            />
            <NavButton 
              active={currentView === ViewState.CONSULTANT} 
              onClick={() => setCurrentView(ViewState.CONSULTANT)} 
              icon={<BrainCircuit size={24} />} 
              label="AI Strategy" 
            />
          </div>
        </nav>
      </div>
    </StoreProvider>
  );
};

const NavButton: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string }> = ({ active, onClick, icon, label }) => (
  <button 
    onClick={onClick}
    className={`flex flex-col items-center justify-center w-full h-full transition-all duration-200 ${active ? 'text-orange-600' : 'text-slate-400 hover:text-slate-600'}`}
  >
    <div className={`mb-1 transition-transform ${active ? 'scale-110' : ''}`}>{icon}</div>
    <span className="text-[10px] font-medium tracking-wide">{label}</span>
  </button>
);

export default App;