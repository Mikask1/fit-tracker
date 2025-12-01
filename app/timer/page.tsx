'use client';

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Timer, Clock } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { TimerTab } from '@/components/timer/TimerTab';
import { StopwatchTab } from '@/components/timer/StopwatchTab';

export default function TimerPage() {
  const router = useRouter();

  return (
    <div className="flex flex-col h-[90vh]">
      {/* Sticky Header */}
      <div className="border-b bg-background sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.back()}
              className="h-9 w-9"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-bold">Timer</h1>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="timer" className="flex-1 flex flex-col">
        <div className="container mx-auto px-4 pt-4">
          <TabsList className="w-full">
            <TabsTrigger value="timer" className="flex-1">
              <Timer className="h-4 w-4 mr-2" />
              Timer
            </TabsTrigger>
            <TabsTrigger value="stopwatch" className="flex-1">
              <Clock className="h-4 w-4 mr-2" />
              Stopwatch
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="timer" className="flex-1 mt-0">
          <TimerTab />
        </TabsContent>

        <TabsContent value="stopwatch" className="flex-1 mt-0">
          <StopwatchTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
