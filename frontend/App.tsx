import React, { useState, useEffect } from 'react';
import PhotoHomePage from './components/PhotoHomePage';
import PersonalCenterPage from './components/PersonalCenterPage';
import TravelPlanningPage from './components/TravelPlanningPage';
import FoodAnalysisPage from './components/FoodAnalysisPage';
import LoginPage from './components/LoginPage';

type ViewState = 'HOME' | 'PROFILE' | 'TRAVEL' | 'FOOD' | 'LOGIN';

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
    </div>
  );
};

export default App;