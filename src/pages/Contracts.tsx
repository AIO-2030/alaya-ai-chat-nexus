import React, { useState } from 'react';
import { FileText, Plus, Eye, Download, MessageCircle, User, Send, Smile, Smartphone, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

const Contracts = () => {
  const [selectedContract, setSelectedContract] = useState<any>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [messages, setMessages] = useState([
    { id: 1, sender: 'user', content: 'Hello, how are you today?', timestamp: '10:30 AM' },
    { id: 2, sender: 'friend', content: 'Hi! I\'m doing great, thanks for asking!', timestamp: '10:32 AM' },
  ]);

  const contracts = [
    { 
      id: 1, 
      name: "Friend1", 
      type: "friend",
      status: "Active", 
      date: "2024-01-15",
      avatar: "F1",
      devices: ["Device1", "Device2"],
      isOnline: true
    },
    { 
      id: 2, 
      name: "Friend2", 
      type: "friend",
      status: "Pending", 
      date: "2024-01-20",
      avatar: "F2",
      devices: ["Device1", "Device3"],
      isOnline: false
    },
    { 
      id: 3, 
      name: "Univoice", 
      type: "system",
      status: "Active", 
      date: "2024-01-10",
      avatar: "UV",
      devices: [],
      isOnline: true
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return 'text-green-400 bg-green-400/20';
      case 'Pending': return 'text-yellow-400 bg-yellow-400/20';
      case 'Completed': return 'text-blue-400 bg-blue-400/20';
      default: return 'text-white/60 bg-white/10';
    }
  };

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

  const handleContractClick = (contract: any) => {
    setSelectedContract(contract);
    setShowDialog(true);
  };

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-r from-cyan-400 to-purple-400 rounded-lg flex items-center justify-center">
              <FileText className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Contracts</h1>
              <p className="text-white/60">Manage your smart contracts and agreements</p>
            </div>
          </div>
          <Button className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white border-0">
            <Plus className="h-4 w-4 mr-2" />
            New Contract
          </Button>
        </div>

        <div className="space-y-4">
          {contracts.map((contract) => (
            <div 
              key={contract.id} 
              className="p-4 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-colors cursor-pointer"
              onClick={() => handleContractClick(contract)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <Avatar className="w-10 h-10">
                      <AvatarFallback className="bg-gradient-to-r from-cyan-400 to-purple-400 text-white font-semibold">
                        {contract.avatar}
                      </AvatarFallback>
                    </Avatar>
                    {contract.isOnline && (
                      <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-slate-900"></div>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-white font-medium">{contract.name}</h3>
                      {contract.type === 'friend' && <User className="h-4 w-4 text-cyan-400" />}
                    </div>
                    <p className="text-sm text-white/60">
                      {contract.devices.length > 0 ? `${contract.devices.join(', ')}` : 'System Contract'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(contract.status)}`}>
                    {contract.status}
                  </span>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="bg-white/5 border-white/20 text-white hover:bg-white/10"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleContractClick(contract);
                      }}
                    >
                      <MessageCircle className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" className="bg-white/5 border-white/20 text-white hover:bg-white/10">
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Dialog Box */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="bg-slate-900/95 backdrop-blur-xl border-white/10 max-w-md mx-auto">
            <DialogHeader className="pb-4">
              <DialogTitle className="text-white flex items-center gap-3">
                <Avatar className="w-8 h-8">
                  <AvatarFallback className="bg-gradient-to-r from-cyan-400 to-purple-400 text-white text-sm">
                    {selectedContract?.avatar}
                  </AvatarFallback>
                </Avatar>
                {selectedContract?.name}
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              {/* Messages */}
              <div className="h-64 overflow-y-auto space-y-3 p-3 bg-white/5 rounded-lg">
                {messages.map((message) => (
                  <div 
                    key={message.id} 
                    className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[80%] p-3 rounded-lg ${
                      message.sender === 'user' 
                        ? 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white' 
                        : 'bg-white/10 text-white'
                    }`}>
                      <p className="text-sm">{message.content}</p>
                      <p className="text-xs opacity-70 mt-1">{message.timestamp}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Input Area */}
              <div className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type your message..."
                    className="flex-1 bg-white/5 border-white/20 text-white placeholder:text-white/50"
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  />
                  <Button
                    onClick={handleSendMessage}
                    className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white border-0"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-white/5 border-white/20 text-white hover:bg-white/10"
                  >
                    <Smile className="h-4 w-4 mr-2" />
                    Emoji
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-white/5 border-white/20 text-white hover:bg-white/10"
                  >
                    <Smartphone className="h-4 w-4 mr-2" />
                    To Device
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Contracts;