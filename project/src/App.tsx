import { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginPage from './pages/LoginPage';
import Sidebar, { type Page } from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Members from './pages/Members';
import Facilities from './pages/Facilities';
import Bookings from './pages/Bookings';
import ChatBot from './pages/ChatBot';
import Payments from './pages/Payments';
import BMICalculator from './pages/BMICalculator';
import FitnessProgress from './pages/FitnessProgress';
import Recommendations from './pages/Recommendations';
import Notifications from './pages/Notifications';

function AppContent() {
  const { user, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');

  if (loading) {
    return (
      <div className="min-h-screen bg-gym-dark flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-gym-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-zinc-500 text-sm">Loading GymFit...</p>
        </div>
      </div>
    );
  }

  if (!user) return <LoginPage />;

  const pages: Record<Page, React.ReactNode> = {
    dashboard: <Dashboard />,
    members: <Members />,
    facilities: <Facilities />,
    bookings: <Bookings />,
    chatbot: <ChatBot />,
    payments: <Payments />,
    bmi: <BMICalculator />,
    progress: <FitnessProgress />,
    recommendations: <Recommendations />,
    notifications: <Notifications />,
  };

  return (
    <div className="flex min-h-screen bg-gym-dark">
      <Sidebar currentPage={currentPage} onNavigate={setCurrentPage} />
      <main className="flex-1 flex flex-col min-h-screen overflow-hidden">
        {pages[currentPage]}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
