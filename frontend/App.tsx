import React, { useState, useEffect } from 'react';
import PhotoHomePage from './components/pages/PhotoHomePage';
import PersonalCenterPage from './components/pages/PersonalCenterPage';
import TravelPlanningPage from './components/pages/TravelPlanningPage';
import FoodAnalysisPage from './components/pages/FoodAnalysisPage';
import LoginPage from './components/pages/LoginPage';
import NotePage from './components/pages/NotePage';
import TodoPage from './components/pages/TodoPage';

type ViewState = 'HOME' | 'PROFILE' | 'TRAVEL' | 'FOOD' | 'LOGIN' | 'NOTE' | 'TODO';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewState>('LOGIN'); // Start with login
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check if user is already logged in on app start
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      setIsAuthenticated(true);
      setCurrentView('HOME');
    }
  }, []);

  const navigateToHome = () => setCurrentView('HOME');
  const navigateToLogin = () => setCurrentView('LOGIN');
  const handleLoginSuccess = (token: string) => {
    setIsAuthenticated(true);
    setCurrentView('HOME');
  };

  return (
    <div className="w-full h-screen bg-black overflow-hidden relative">
      {/* View Router */}
      {currentView === 'LOGIN' && (
        <LoginPage
          onBack={navigateToHome}
          onLoginSuccess={handleLoginSuccess}
        />
      )}

      {currentView === 'HOME' && isAuthenticated && (
        <PhotoHomePage
          onProfileClick={() => setCurrentView('PROFILE')}
          onTravelClick={() => setCurrentView('TRAVEL')}
          onFoodAnalysisClick={() => setCurrentView('FOOD')}
          onNoteClick={() => setCurrentView('NOTE')}
          onTodoClick={() => setCurrentView('TODO')}
        />
      )}

      {currentView === 'PROFILE' && isAuthenticated && (
        <PersonalCenterPage onBack={navigateToHome} />
      )}

      {currentView === 'TRAVEL' && isAuthenticated && (
        <TravelPlanningPage onBack={navigateToHome} />
      )}

      {currentView === 'FOOD' && isAuthenticated && (
        <FoodAnalysisPage onBack={navigateToHome} />
      )}

      {currentView === 'NOTE' && isAuthenticated && (
        <NotePage onBack={navigateToHome} />
      )}

      {currentView === 'TODO' && isAuthenticated && (
        <div className="w-full h-full bg-gray-50 flex flex-col">
           {/* Back Button Header */}
           <div className="bg-white px-4 py-3 shadow-sm border-b flex items-center gap-3 shrink-0 z-10">
            <button
              onClick={navigateToHome}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-600"><path d="m15 18-6-6 6-6"/></svg>
            </button>
            <span className="font-medium text-gray-800">返回首页</span>
          </div>
          <div className="flex-1 overflow-hidden">
            <TodoPage />
          </div>
        </div>
      )}
    </div>
  );
};

export default App;