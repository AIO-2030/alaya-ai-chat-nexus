
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ChatSession } from '../types/chat';
import { Shield, Target, AlertTriangle, Activity, Zap, TrendingUp, Eye } from 'lucide-react';

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
      case 'Relaxed': return <Shield className="h-4 w-4 text-green-400" />;
      case 'Balanced': return <Target className="h-4 w-4 text-yellow-400" />;
      case 'Strict': return <AlertTriangle className="h-4 w-4 text-red-400" />;
      default: return <Target className="h-4 w-4" />;
    }
  };

  const getModeColor = (mode: string) => {
    switch (mode) {
      case 'Relaxed': return 'bg-green-400/20 text-green-300 border-green-400/30';
      case 'Balanced': return 'bg-yellow-400/20 text-yellow-300 border-yellow-400/30';
      case 'Strict': return 'bg-red-400/20 text-red-300 border-red-400/30';
      default: return 'bg-gray-400/20 text-gray-300 border-gray-400/30';
    }
  };

  const getModeGradient = (mode: string) => {
    switch (mode) {
      case 'Relaxed': return 'from-green-400/10 to-emerald-400/10 border-green-400/20';
      case 'Balanced': return 'from-yellow-400/10 to-orange-400/10 border-yellow-400/20';
      case 'Strict': return 'from-red-400/10 to-pink-400/10 border-red-400/20';
      default: return 'from-gray-400/10 to-slate-400/10 border-gray-400/20';
    }
  };

  // Mock alignment score - in real implementation, this would come from the backend
  const alignmentScore = 45.8;
  const stakeInfo = {
    amount: 1250,
    currency: 'ALAYA'
  };

  return (
    <div className={`w-80 backdrop-blur-xl border border-white/10 ${className}`}>
      <div className="p-4 border-b border-white/10 bg-gradient-to-r from-white/5 to-white/10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-r from-cyan-400 to-purple-400 rounded-full flex items-center justify-center">
            <Activity className="h-4 w-4 text-white" />
          </div>
          <h3 className="text-lg font-semibold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">
            Alignment Control
          </h3>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Current Mode - Enhanced */}
        <Card className={`bg-gradient-to-r ${getModeGradient(session.alignmentMode)} backdrop-blur-sm border transition-all duration-300 hover:scale-105 hover:shadow-lg`}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2 text-white">
              {getModeIcon(session.alignmentMode)}
              Current Mode
              <div className="ml-auto">
                <div className="w-2 h-2 bg-current rounded-full animate-pulse"></div>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge className={`${getModeColor(session.alignmentMode)} backdrop-blur-sm border transition-all duration-200 hover:scale-105`}>
              <span className="flex items-center gap-1">
                {session.alignmentMode}
                <div className="w-1 h-1 bg-current rounded-full animate-pulse"></div>
              </span>
            </Badge>
            <p className="text-xs text-white/60 mt-2 leading-relaxed">
              {session.alignmentMode === 'Relaxed' && 'More creative, less restricted responses'}
              {session.alignmentMode === 'Balanced' && 'Standard safety and creativity balance'}
              {session.alignmentMode === 'Strict' && 'Maximum safety, conservative responses'}
            </p>
          </CardContent>
        </Card>

        {/* Alignment Score - Enhanced */}
        <Card className="bg-gradient-to-br from-blue-400/10 to-cyan-400/10 backdrop-blur-sm border border-blue-400/20 hover:border-blue-400/40 transition-all duration-300 hover:scale-105">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2 text-white">
              <Zap className="h-4 w-4 text-blue-400" />
              κ Alignment Score
              <div className="ml-auto flex items-center gap-1">
                <TrendingUp className="h-3 w-3 text-green-400" />
                <span className="text-xs text-green-400">+2.3%</span>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between text-sm items-center">
                <span className="text-white/80">Current</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
                    {alignmentScore}%
                  </span>
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                </div>
              </div>
              <div className="relative">
                <Progress value={alignmentScore} className="h-3 bg-white/10" />
                <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-cyan-400/20 rounded-full animate-pulse"></div>
              </div>
              <div className="text-xs text-white/50 bg-white/5 p-2 rounded-lg border border-white/10">
                <div className="flex items-center gap-1 mb-1">
                  <Eye className="h-3 w-3" />
                  <span>Real-time Analysis</span>
                </div>
                Higher scores indicate better alignment with constitutional principles
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stake Information - Enhanced */}
        <Card className="bg-gradient-to-br from-purple-400/10 to-pink-400/10 backdrop-blur-sm border border-purple-400/20 hover:border-purple-400/40 transition-all duration-300 hover:scale-105">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2 text-white">
              <div className="w-4 h-4 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full flex items-center justify-center">
                <div className="w-2 h-2 bg-white rounded-full"></div>
              </div>
              Stake Info
              <div className="ml-auto">
                <div className="text-xs px-2 py-1 bg-purple-400/20 rounded-full text-purple-300 border border-purple-400/30">
                  Active
                </div>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-white/60">Amount</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-lg text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
                    {stakeInfo.amount.toLocaleString()}
                  </span>
                  <span className="text-sm text-purple-300 font-medium">{stakeInfo.currency}</span>
                </div>
              </div>
              <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-purple-400 to-pink-400 rounded-full animate-pulse" style={{ width: '78%' }}></div>
              </div>
              <div className="text-xs text-white/50 bg-white/5 p-2 rounded-lg border border-white/10">
                Stake affects response quality and priority. Higher stakes unlock premium features.
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Session Stats - Enhanced */}
        <Card className="bg-gradient-to-br from-cyan-400/10 to-teal-400/10 backdrop-blur-sm border border-cyan-400/20 hover:border-cyan-400/40 transition-all duration-300 hover:scale-105">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2 text-white">
              <Activity className="h-4 w-4 text-cyan-400 animate-pulse" />
              Live Session Stats
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-white/5 p-3 rounded-lg border border-white/10 hover:bg-white/10 transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="text-white/60">Messages</span>
                    <span className="font-bold text-cyan-400">{session.messages.length}</span>
                  </div>
                </div>
                <div className="bg-white/5 p-3 rounded-lg border border-white/10 hover:bg-white/10 transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="text-white/60">User</span>
                    <span className="font-bold text-green-400">{session.messages.filter(m => m.role === 'user').length}</span>
                  </div>
                </div>
              </div>
              <div className="bg-white/5 p-3 rounded-lg border border-white/10 hover:bg-white/10 transition-colors">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white/60">AI Responses</span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-purple-400">{session.messages.filter(m => m.role === 'assistant').length}</span>
                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"></div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Trace Information - Enhanced */}
        {session.traceId && (
          <Card className="bg-gradient-to-br from-gray-400/10 to-slate-400/10 backdrop-blur-sm border border-gray-400/20 hover:border-gray-400/40 transition-all duration-300 hover:scale-105">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2 text-white">
                <div className="w-4 h-4 bg-gradient-to-r from-gray-400 to-slate-400 rounded-full animate-spin"></div>
                Active Trace
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="font-mono text-xs bg-black/20 p-3 rounded-lg border border-white/10 text-green-400 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-green-400/5 to-transparent animate-pulse"></div>
                  <div className="relative">{session.traceId}</div>
                </div>
                <div className="text-xs text-white/50 bg-white/5 p-2 rounded-lg border border-white/10">
                  Real-time conversation trace for debugging and analysis
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
