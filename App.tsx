import React, { useState, useEffect } from 'react';
import { StoreProvider } from './context/StoreContext';
import { Inventory } from './components/Inventory';
import { POS } from './components/POS';
import { Accounting } from './components/Accounting';
import { Consultant } from './components/Consultant';
import { Customers } from './components/Customers';
import { VoiceHardy } from './components/VoiceHardy';
import { LayoutGrid, ShoppingCart, PieChart, BrainCircuit, Menu, X, ChevronLeft, ChevronRight, User, Users } from 'lucide-react';
import { ViewState } from './types';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewState>(ViewState.POS);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  // Handle window resize for responsiveness
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) setIsSidebarOpen(false);
      else setIsSidebarOpen(true);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  const renderView = () => {
    switch (currentView) {
      case ViewState.INVENTORY: return <Inventory />;
      case ViewState.POS: return <POS />;
      case ViewState.ACCOUNTING: return <Accounting />;
      case ViewState.CONSULTANT: return <Consultant />;
      case ViewState.CUSTOMERS: return <Customers />;
      default: return <POS />;
    }
  };

  const NavItem = ({ view, icon, label }: { view: ViewState; icon: React.ReactNode; label: string }) => (
    <button
      onClick={() => {
        setCurrentView(view);
        if (isMobile) setIsSidebarOpen(false);
      }}
      className={`w-full flex items-center gap-3 px-4 py-3 transition-all duration-200 group ${
        currentView === view 
          ? 'bg-orange-50 border-r-4 border-orange-600 text-orange-700' 
          : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
      }`}
    >
      <span className={`transition-colors ${currentView === view ? 'text-orange-600' : 'text-slate-400 group-hover:text-slate-600'}`}>
        {icon}
      </span>
      <span className={`font-medium whitespace-nowrap transition-opacity duration-300 ${!isMobile && !isSidebarOpen ? 'opacity-0 hidden' : 'opacity-100'}`}>
        {label}
      </span>
    </button>
  );

  return (
    <StoreProvider>
      <div className="flex h-screen w-screen bg-slate-100 overflow-hidden">
        
        {/* Mobile Overlay */}
        {isMobile && isSidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside 
          className={`
            bg-white shadow-xl z-50 flex flex-col transition-all duration-300 ease-in-out border-r border-slate-200
            ${isMobile ? 'fixed inset-y-0 left-0 w-72' : 'relative'}
            ${!isMobile && isSidebarOpen ? 'w-64' : ''}
            ${!isMobile && !isSidebarOpen ? 'w-20' : ''}
            ${isMobile && !isSidebarOpen ? '-translate-x-full' : 'translate-x-0'}
          `}
        >
          {/* Sidebar Header */}
          <div className="h-16 flex items-center px-4 border-b border-slate-100 bg-slate-50">
            <div className={`flex items-center gap-3 overflow-hidden w-full ${!isSidebarOpen && !isMobile ? 'justify-center' : 'justify-between'}`}>
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg flex items-center justify-center text-white font-bold shadow-md shrink-0">
                  Q
                </div>
                <div className={`flex flex-col ${!isMobile && !isSidebarOpen ? 'hidden' : 'block'}`}>
                  <span className="font-bold text-slate-800 leading-tight">Engr. Quilang</span>
                  <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Hardware POS</span>
                </div>
              </div>
              {isMobile && (
                <button onClick={() => setIsSidebarOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={20} />
                </button>
              )}
            </div>
          </div>

          {/* Navigation */}
          <div className="flex-1 py-6 flex flex-col gap-1 overflow-y-auto">
            <div className={`px-4 mb-2 text-xs font-semibold text-slate-400 uppercase tracking-wider ${!isMobile && !isSidebarOpen ? 'hidden' : 'block'}`}>
              Main Menu
            </div>
            <NavItem view={ViewState.POS} icon={<ShoppingCart size={22} />} label="Point of Sale" />
            <NavItem view={ViewState.INVENTORY} icon={<LayoutGrid size={22} />} label="Inventory" />
            <NavItem view={ViewState.ACCOUNTING} icon={<PieChart size={22} />} label="Accounting" />
            <NavItem view={ViewState.CUSTOMERS} icon={<Users size={22} />} label="Builders & Billing" />
            
            <div className="my-4 border-t border-slate-100 mx-4"></div>
            
            <div className={`px-4 mb-2 text-xs font-semibold text-slate-400 uppercase tracking-wider ${!isMobile && !isSidebarOpen ? 'hidden' : 'block'}`}>
              Intelligence
            </div>
            <NavItem view={ViewState.CONSULTANT} icon={<BrainCircuit size={22} />} label="Emilio AI Strategy" />
          </div>

          {/* User Profile / Footer */}
          <div className="p-4 border-t border-slate-100 bg-slate-50">
             <div className={`flex items-center gap-3 ${!isSidebarOpen && !isMobile ? 'justify-center' : ''}`}>
               <div className="w-10 h-10 rounded-full bg-white border border-slate-200 shrink-0 overflow-hidden shadow-sm flex items-center justify-center">
                 <User size={20} className="text-slate-400" />
               </div>
               <div className={`overflow-hidden transition-all duration-300 ${!isMobile && !isSidebarOpen ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
                 <div className="text-sm font-bold text-slate-700 truncate">Boss Domz</div>
                 <div className="text-xs text-slate-500 truncate">Administrator</div>
               </div>
             </div>
          </div>
        </aside>

        {/* Main Content Wrapper */}
        <div className="flex-1 flex flex-col h-full overflow-hidden relative w-full">
          {/* Top Bar for Mobile/Collapse Toggle */}
          <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 shrink-0 shadow-sm z-30">
             <div className="flex items-center gap-4">
               <button 
                 onClick={toggleSidebar}
                 className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-200"
               >
                 {isMobile ? <Menu size={20} /> : (isSidebarOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />)}
               </button>
               <h1 className="font-semibold text-slate-800 text-lg flex items-center gap-2">
                 {currentView === ViewState.POS && 'Cashier'}
                 {currentView === ViewState.INVENTORY && 'Inventory Management'}
                 {currentView === ViewState.ACCOUNTING && 'Financial Overview'}
                 {currentView === ViewState.CONSULTANT && 'Business Intelligence'}
                 {currentView === ViewState.CUSTOMERS && 'Builders Billing'}
               </h1>
             </div>
             <div className="flex items-center gap-3">
                <div className="hidden md:flex flex-col items-end">
                   <span className="text-xs font-bold text-slate-700">Emilio LLM v1.0</span>
                   <span className="text-[10px] text-slate-400">Powered by Aitek</span>
                </div>
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
             </div>
          </header>

          {/* Content Area */}
          <div className="flex-1 overflow-hidden relative bg-slate-100">
             <div className="absolute inset-0 overflow-hidden">
                {renderView()}
             </div>
          </div>
          
          <VoiceHardy />
        </div>
      </div>
    </StoreProvider>
  );
};

export default App;