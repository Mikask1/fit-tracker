import { X } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../ui/card";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export function GetStartedCard({ setShowGettingStarted }: { setShowGettingStarted: (value: boolean) => void }) {
    const handleDismiss = () => {
        localStorage.setItem('gettingStartedDismissed', 'true');
        setShowGettingStarted(false);
    };

    const handleTemporaryDismiss = () => {
        sessionStorage.setItem('gettingStartedSessionDismissed', 'true');
        setShowGettingStarted(false);
    };
    
    return <Card className='mb-8'>
        <CardHeader className="relative">
            <button
                onClick={handleTemporaryDismiss}
                className="absolute -top-2 right-4 p-1 rounded-sm hover:bg-accent transition-colors"
                aria-label="Dismiss for this session"
            >
                <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
            </button>
            <CardTitle>Getting Started</CardTitle>
            <CardDescription>Build your perfect workout routine</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="space-y-2">
                <h3 className="font-semibold flex items-center gap-2">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm">1</span>
                    Create Movements
                </h3>
                <p className="text-sm text-muted-foreground ml-8">
                    Add exercises to your library with muscle groups, and images.
                </p>
            </div>
            <div className="space-y-2">
                <h3 className="font-semibold flex items-center gap-2">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm">2</span>
                    Build Routines
                </h3>
                <p className="text-sm text-muted-foreground ml-8">
                    Combine movements into workout routines with sets, reps, and rest times.
                </p>
            </div>
            <div className="space-y-2">
                <h3 className="font-semibold flex items-center gap-2">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm">3</span>
                    Schedule & Track
                </h3>
                <p className="text-sm text-muted-foreground ml-8">
                    Schedule routines on your calendar and log your workouts to track progress.
                </p>
            </div>
            <div className="pt-2 border-t">
                <Button
                    variant="outline"
                    onClick={handleDismiss}
                    className="w-fit float-right"
                >
                    Never show this again
                </Button>
            </div>
        </CardContent>
    </Card>
}