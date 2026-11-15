import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import Header from '../components/Header';
import LoadingSpinner from '../components/LoadingSpinner';

// Tabs
import TodayTab from './tabs/TodayTab';
import MedicationsTab from './tabs/MedicationsTab';
import AppointmentsTab from './tabs/AppointmentsTab';
import AdherenceTab from './tabs/AdherenceTab';
import ApprovalsTab from './tabs/ApprovalsTab';

import { 
  Calendar, 
  Pill, 
  CalendarCheck, 
  BarChart3, 
  CheckSquare 
} from 'lucide-react';

export default function DashboardPage() {
  const { circle, loading, circleLoading, isElder, elderMode, user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState(0);

  const currentTab = searchParams.get('tab') || 'today';

  // Fetch pending approvals count for the badge
  const fetchPendingCount = useCallback(async () => {
    if (!circle?.id) return;
    try {
      const { data, error } = await supabase
        .from('change_requests')
        .select('id')
        .eq('circle_id', circle.id)
        .eq('status', 'pending');

      if (!error && data) {
        setPendingApprovalsCount(data.length);
      }
    } catch (err) {
      console.error('Error fetching pending approvals count:', err);
    }
  }, [circle?.id]);

  useEffect(() => {
    fetchPendingCount();

    if (!circle?.id) return;

    // Realtime listener for change_requests to update badge dynamically
    const channel = supabase
      .channel(`cr_badge_circle_${circle.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'change_requests',
          filter: `circle_id=eq.${circle.id}`,
        },
        () => {
          fetchPendingCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchPendingCount, circle?.id]);

  if (loading || circleLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <LoadingSpinner message="Loading your care circle..." />
      </div>
    );
  }

  // If user is not authenticated
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // If user has no circle, send them to onboarding
  if (!circle) {
    return <Navigate to="/onboarding" replace />;
  }

  const tabs = [
    { id: 'today', label: 'Today', icon: Calendar },
    { id: 'medications', label: 'Medications', icon: Pill },
    { id: 'appointments', label: 'Appointments', icon: CalendarCheck },
    { id: 'adherence', label: 'Adherence', icon: BarChart3 },
    { 
      id: 'approvals', 
      label: 'Approvals', 
      icon: CheckSquare,
      badge: pendingApprovalsCount > 0 ? pendingApprovalsCount : null
    },
  ];

  const handleTabChange = (tabId) => {
    setSearchParams({ tab: tabId });
  };

  const renderActiveTab = () => {
    switch (currentTab) {
      case 'today':
        return <TodayTab />;
      case 'medications':
        return <MedicationsTab />;
      case 'appointments':
        return <AppointmentsTab />;
      case 'adherence':
        return <AdherenceTab />;
      case 'approvals':
        return (
          <ApprovalsTab 
            onPendingCountChange={(cnt) => setPendingApprovalsCount(cnt)} 
          />
        );
      default:
        return <TodayTab />;
    }
  };

  return (
    <div className={`min-h-screen bg-slate-100 flex flex-col ${elderMode ? 'elder-mode' : ''}`}>
      {/* Top Accessible Header with Circle & Passcode */}
      <Header />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        
        {/* Navigation Tabs Bar */}
        <nav
          aria-label="Care Circle Sections"
          className="bg-white rounded-3xl p-2 sm:p-2.5 border-2 border-slate-200 shadow-md mb-6 sm:mb-8 overflow-x-auto"
        >
          <div className="flex gap-2 min-w-max sm:min-w-0">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = currentTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleTabChange(tab.id)}
                  aria-selected={isActive}
                  role="tab"
                  className={`flex items-center gap-2 sm:gap-2.5 px-4 sm:px-5 py-3 rounded-2xl font-bold transition-all flex-1 justify-center relative ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 scale-[1.01]'
                      : 'text-slate-700 hover:text-blue-900 hover:bg-slate-100'
                  } ${elderMode ? 'text-lg sm:text-xl min-h-[56px]' : 'text-sm sm:text-base min-h-[44px]'}`}
                >
                  <Icon className={`flex-shrink-0 ${elderMode ? 'w-6 h-6 sm:w-7 sm:h-7' : 'w-5 h-5'}`} aria-hidden="true" />
                  <span>{tab.label}</span>

                  {tab.badge && (
                    <span
                      className={`ml-1.5 px-2 py-0.5 text-xs font-black rounded-full uppercase tracking-wider ${
                        isActive
                          ? 'bg-amber-300 text-amber-950'
                          : 'bg-amber-500 text-white'
                      }`}
                      aria-label={`${tab.badge} pending approvals`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </nav>

        {/* Tab Panel */}
        <section role="tabpanel" aria-label={`${currentTab} section`}>
          {renderActiveTab()}
        </section>

      </main>

      {/* Subtle accessible footer */}
      <footer className="py-6 border-t border-slate-200 text-center text-sm font-medium text-slate-500 bg-white">
        <p>CircleCare • Their health, their choices, your whole family beside them.</p>
      </footer>
    </div>
  );
}
