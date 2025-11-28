'use client';

import { ProtectedRoute } from '@/components/shared/ProtectedRoute';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dumbbell, X, BarChart3 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { WeeklyStats } from '@/components/calendar/WeeklyStats';
import { AnalyticsSection } from '@/components/analytics/AnalyticsSection';
import { WorkoutCalendarHeatmap } from '@/components/dashboard/WorkoutCalendarHeatmap';
import { GetStartedCard } from '@/components/dashboard/GetStartedCard';

export default function Home() {
  return (
    <ProtectedRoute>
      <HomePage />
    </ProtectedRoute>
  );
}

function HomePage() {
  const { user } = useAuth();

  const [showGettingStarted, setShowGettingStarted] = useState(true);

  useEffect(() => {
    const dismissed = localStorage.getItem('gettingStartedDismissed');
    const sessionDismissed = sessionStorage.getItem('gettingStartedSessionDismissed');
    if (dismissed === 'true' || sessionDismissed === 'true') {
      setShowGettingStarted(false);
    }
  }, []);

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-primary rounded-full p-2">
                <Dumbbell className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">FitTrack</h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">Welcome back, {user?.username}</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Dashboard</h2>
          <p className="text-gray-600 dark:text-gray-400">Track your fitness journey and reach your goals</p>
        </div>
        
        {showGettingStarted && <GetStartedCard setShowGettingStarted={setShowGettingStarted} />}

        {/* Weekly Stats */}
        <div className="mb-6">
          <WeeklyStats />
        </div>

        {/* Workout Calendar Heatmap */}
        <div className="mt-6">
          <Card>
            <CardContent className="pt-6">
              <WorkoutCalendarHeatmap />
            </CardContent>
          </Card>
        </div>

        <AnalyticsSection />
      </main>
    </div>
  );
}
