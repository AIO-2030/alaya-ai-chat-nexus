import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Send, Smile, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '../lib/auth';
import { AppSidebar } from '../components/AppSidebar';

import { AppHeader } from '../components/AppHeader';
import { PageLayout } from '../components/PageLayout';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ContactInfo } from '../services/api/userApi';

const Chat = () => {
  const { user, loading: authLoading } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Get contact information from URL parameters
  const contactId = searchParams.get('contactId');
  const contactName = searchParams.get('contactName') || 'Unknown';
  const contactAvatar = searchParams.get('contactAvatar') || 'U';
  const contactType = searchParams.get('contactType') || 'friend';
  const contactStatus = searchParams.get('contactStatus') || 'Active';
  const contactDevices = searchParams.get('contactDevices')?.split(',') || [];
  const contactIsOnline = searchParams.get('contactIsOnline') === 'true';
  const contactNickname = searchParams.get('contactNickname');
  const contactPrincipalId = searchParams.get('contactPrincipalId');

  const [newMessage, setNewMessage] = useState('');
  const [messages, setMessages] = useState([
    { id: 1, sender: 'user', content: 'Hello, how are you today?', timestamp: '10:30 AM' },
    { id: 2, sender: 'friend', content: 'Hi! I\'m doing great, thanks for asking!', timestamp: '10:32 AM' },
  ]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Build current contact object
  const currentContact: ContactInfo = {
    id: contactId ? parseInt(contactId) : 0,
    name: contactName,
    type: contactType as 'friend' | 'system',
    status: contactStatus as 'Active' | 'Pending' | 'Blocked' | 'Deleted',
    date: new Date().toISOString().split('T')[0],
    avatar: contactAvatar,
    devices: contactDevices,
    isOnline: contactIsOnline,
    nickname: contactNickname || undefined,
    contactPrincipalId: contactPrincipalId || undefined,
  };

  // Scroll to latest message
  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Auto scroll to bottom when messages update
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      const newMsg = {
        id: messages.length + 1,
        sender: 'user',
        content: newMessage,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages([...messages, newMsg]);
      setNewMessage('');
    }
  };

  const handleBackToContracts = () => {
    navigate('/contracts');
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin"></div>
          <div className="absolute inset-0 w-16 h-16 border-4 border-purple-400/20 border-r-purple-400 rounded-full animate-spin animation-delay-150"></div>
          <div className="mt-4 text-center">
            <div className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 text-xl font-semibold">
              {t('common.initializingAI')}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <PageLayout>
      <div className="min-h-screen w-full bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 left-20 w-72 h-72 bg-cyan-400/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-purple-400/10 rounded-full blur-3xl animate-pulse animation-delay-300"></div>
          <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-blue-400/5 rounded-full blur-3xl animate-pulse animation-delay-700"></div>
        </div>

        {/* Neural network pattern */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-cyan-400 rounded-full"></div>
          <div className="absolute top-3/4 right-1/4 w-2 h-2 bg-purple-400 rounded-full"></div>
          <div className="absolute top-1/2 left-3/4 w-2 h-2 bg-blue-400 rounded-full"></div>
          <svg className="absolute inset-0 w-full h-full">
            <line x1="25%" y1="25%" x2="75%" y2="50%" stroke="url(#gradient1)" strokeWidth="1" opacity="0.3"/>
            <line x1="75%" y1="50%" x2="75%" y2="75%" stroke="url(#gradient2)" strokeWidth="1" opacity="0.3"/>
            <line x1="25%" y1="25%" x2="75%" y2="75%" stroke="url(#gradient3)" strokeWidth="1" opacity="0.3"/>
            <defs>
              <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#06b6d4" />
                <stop offset="100%" stopColor="#8b5cf6" />
              </linearGradient>
              <linearGradient id="gradient2" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#8b5cf6" />
                <stop offset="100%" stopColor="#3b82f6" />
              </linearGradient>
              <linearGradient id="gradient3" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#06b6d4" />
                <stop offset="100%" stopColor="#3b82f6" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* Header */}
        <AppHeader />

        <div className="flex h-[calc(100vh-65px)] w-full">
          {/* Sidebar for desktop only */}
          <div className="hidden lg:block">
            <AppSidebar />
          </div>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            <div className="h-full p-2 md:p-4">
              <div className="h-full rounded-2xl bg-white/5 backdrop-blur-xl shadow-2xl border border-white/10 flex flex-col">
                    {/* Chat Header */}
                    <div className="flex-shrink-0 p-3 sm:p-4 md:p-6 border-b border-white/10 bg-white/5">
                      <div className="flex items-center gap-3 sm:gap-4">
                        {/* Back Button */}
                        <Button
                          variant="outline"
                          size="sm"
                          className="bg-white/5 border-white/20 text-white hover:bg-white/10 backdrop-blur-sm p-2 sm:p-3"
                          onClick={handleBackToContracts}
                        >
                          <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
                        </Button>
                        
                        {/* Contact Info */}
                        <div className="flex items-center gap-2 sm:gap-3">
                          <div className="relative">
                            <Avatar className="w-8 h-8 sm:w-10 sm:h-10">
                              <AvatarFallback className="bg-gradient-to-r from-cyan-400 to-purple-400 text-white font-semibold text-xs sm:text-sm">
                                {currentContact.avatar}
                              </AvatarFallback>
                            </Avatar>
                            {currentContact.isOnline && (
                              <div className="absolute -bottom-1 -right-1 w-2 h-2 sm:w-3 sm:h-3 bg-green-400 rounded-full border-2 border-slate-900 animate-pulse"></div>
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-1 sm:gap-2">
                              <h1 className="text-lg sm:text-xl font-bold text-white">{currentContact.name}</h1>
                              {currentContact.nickname && (
                                <span className="text-sm text-cyan-400/70">({currentContact.nickname})</span>
                              )}
                            </div>
                            <p className="text-xs sm:text-sm text-white/60">
                              {currentContact.isOnline ? 'Online' : 'Offline'}
                              {currentContact.devices.length > 0 && ` • ${currentContact.devices.join(', ')}`}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                {/* Contact Details */}
                <div className="flex-shrink-0 p-3 sm:p-4 border-b border-white/10 bg-white/3">
                  <div className="p-2 sm:p-3 bg-white/5 rounded-lg backdrop-blur-sm">
                    <div className="text-xs sm:text-sm text-white/80 space-y-1">
                      <p><span className="text-cyan-400">Devices:</span> {currentContact.devices.length > 0 ? currentContact.devices.join(', ') : 'None'}</p>
                      <p><span className="text-cyan-400">Online:</span> {currentContact.isOnline ? 'Yes' : 'No'}</p>
                      {currentContact.contactPrincipalId && (
                        <p><span className="text-cyan-400">Principal ID:</span> <code className="text-cyan-300 text-xs">{currentContact.contactPrincipalId}</code></p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Messages Area */}
                <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-4 bg-slate-900/20">
                  {messages.map((message) => (
                    <div 
                      key={message.id} 
                      className={`flex mb-3 ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[80%] p-2 sm:p-3 rounded-lg ${
                        message.sender === 'user' 
                          ? 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white' 
                          : 'bg-white/10 text-white backdrop-blur-sm'
                      }`}>
                        <p className="text-xs sm:text-sm">{message.content}</p>
                        <p className="text-xs opacity-70 mt-1">{message.timestamp}</p>
                      </div>
                    </div>
                  ))}
                  {/* Hidden element for auto scroll to bottom */}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="flex-shrink-0 p-3 sm:p-4 border-t border-white/10 bg-white/5 space-y-3 sm:space-y-4">
                      {/* Message Input Row */}
                      <div className="flex items-center gap-2">
                        <div className="flex-1">
                          <Input
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder={t('common.typeYourMessage') as string}
                            className="w-full bg-white/5 border-white/20 text-white placeholder:text-white/50 backdrop-blur-sm text-xs sm:text-sm"
                            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                          />
                        </div>
                        
                        {/* Send to Chat Button */}
                        <Button
                          onClick={handleSendMessage}
                          className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white border-0 p-2 sm:p-3 min-w-[44px]"
                          title="Send message to chat"
                        >
                          <Send className="h-3 w-3 sm:h-4 sm:w-4" />
                        </Button>
                        
                        {/* Send to Device Button */}
                        <Button
                          variant="outline"
                          size="sm"
                          className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 border-blue-400/30 text-blue-300 hover:bg-blue-500/30 hover:border-blue-400/50 backdrop-blur-sm text-xs px-3 py-2 min-w-[44px] transition-all duration-200"
                          onClick={() => {
                            if (newMessage.trim()) {
                              // TODO: Implement device message sending
                              console.log('Sending to device:', newMessage);
                              setNewMessage('');
                            }
                          }}
                          disabled={!newMessage.trim()}
                          title="Send message to device"
                        >
                          <Smartphone className="h-3 w-3 sm:h-4 sm:w-4" />
                        </Button>
                      </div>
                      
                      {/* Function Buttons Row */}
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="bg-white/5 border-white/20 text-white hover:bg-white/10 backdrop-blur-sm text-xs px-3 py-2 flex-1"
                        >
                          <Smile className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                          {t('common.emoji')}
                        </Button>
                        
                        {/* Device Status Indicator */}
                        <div className="inline-flex items-center gap-1 px-3 py-2 bg-white/5 rounded-lg border border-white/10">
                          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                          <span className="text-xs text-white/60">Device Connected</span>
                        </div>
                      </div>
                    </div>
              </div>
            </div>
          </div>
        </div>


      </div>
    </PageLayout>
  );
};

export default Chat;
