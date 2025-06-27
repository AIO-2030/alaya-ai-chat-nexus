
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ChatSession } from '../types/chat';
import { Shield, Target, AlertTriangle } from 'lucide-react';

interface AlignmentPanelProps {
  session: ChatSession;
  className?: string;
}

export const AlignmentPanel: React.FC<AlignmentPanelProps> = ({
  session,
  className = ""
}) => {
  const getModeIcon = (mode: string) => {
    switch (mode) {
      case 'Relaxed': return <Shield className="h-4 w-4 text-green-500" />;
      case 'Balanced': return <Target className="h-4 w-4 text-yellow-500" />;
      case 'Strict': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default: return <Target className="h-4 w-4" />;
    }
  };

  const getModeColor = (mode: string) => {
    switch (mode) {
      case 'Relaxed': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'Balanced': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'Strict': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  // Mock alignment score - in real implementation, this would come from the backend
  const alignmentScore = Math.random() * 100;
  const stakeInfo = {
    amount: 1250,
    currency: 'ALAYA'
  };

  return (
    <div className={`w-80 bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 ${className}`}>
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Alignment Control
        </h3>
      </div>

      <div className="p-4 space-y-4">
        {/* Current Mode */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              {getModeIcon(session.alignmentMode)}
              Current Mode
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge className={getModeColor(session.alignmentMode)}>
              {session.alignmentMode}
            </Badge>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
              {session.alignmentMode === 'Relaxed' && 'More creative, less restricted responses'}
              {session.alignmentMode === 'Balanced' && 'Standard safety and creativity balance'}
              {session.alignmentMode === 'Strict' && 'Maximum safety, conservative responses'}
            </p>
          </CardContent>
        </Card>

        {/* Alignment Score */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">κ Alignment Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Current</span>
                <span className="font-mono">{alignmentScore.toFixed(1)}%</span>
              </div>
              <Progress value={alignmentScore} className="h-2" />
              <div className="text-xs text-gray-600 dark:text-gray-400">
                Higher scores indicate better alignment with constitutional principles
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stake Information */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Stake Info</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Amount</span>
                <span className="font-mono font-medium">
                  {stakeInfo.amount.toLocaleString()} {stakeInfo.currency}
                </span>
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                Stake affects response quality and priority
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Trace Information */}
        {session.traceId && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Active Trace</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="font-mono text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded">
                  {session.traceId}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  Conversation trace for debugging and analysis
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Session Stats */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Session Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Messages</span>
                <span>{session.messages.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">User Messages</span>
                <span>{session.messages.filter(m => m.role === 'user').length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">AI Responses</span>
                <span>{session.messages.filter(m => m.role === 'assistant').length}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
