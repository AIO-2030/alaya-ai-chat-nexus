import React, { useState, useEffect } from 'react';
import { FileText, Plus, MessageCircle, User, QrCode, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '../lib/auth';
import { AppSidebar } from '../components/AppSidebar';
import { BottomNavigation } from '../components/BottomNavigation';
import { AppHeader } from '../components/AppHeader';
import { PageLayout } from '../components/PageLayout';
import QRCode from 'react-qr-code';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { 
  getContactsByOwner, 
  upsertContact, 
  updateContactStatus, 
  updateContactOnlineStatus,
  createContactFromPrincipalId,
  ContactInfo 
} from '../services/api/userApi';
import { copyWithFeedback } from '../utils/clipboard.js';
import QRCodeScanner from '../components/QRCodeScanner';

const Contracts = () => {
  const { user, loading: authLoading } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [selectedContract, setSelectedContract] = useState<ContactInfo | null>(null);
  const [showQrDialog, setShowQrDialog] = useState(false);
  const [contracts, setContracts] = useState<ContactInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState<'principal' | null>(null);
  const [qrDialogType, setQrDialogType] = useState<'share-self' | 'share-friend' | null>(null);
  const [selectedFriendForSharing, setSelectedFriendForSharing] = useState<ContactInfo | null>(null);
  const [showAddContactDialog, setShowAddContactDialog] = useState(false);
  const [newContactPrincipalId, setNewContactPrincipalId] = useState('');
  const [newContactNickname, setNewContactNickname] = useState('');
  const [addingContact, setAddingContact] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);

  // Get user principal ID for API calls
  const getUserPrincipalId = (): string => {
    if (user) {
      // Try different possible user ID fields
      return (user as any)?.principalId || 
             (user as any)?.walletAddress || 
             (user as any)?.userId || 
             (user as any)?.id || 
             'anonymous';
    }
    return 'anonymous';
  };

  // Load contacts from backend
  const loadContacts = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const userPrincipalId = getUserPrincipalId();
      const contacts = await getContactsByOwner(userPrincipalId);
      
      setContracts(contacts);
      console.log('[Contracts] Loaded contacts:', contacts);
    } catch (err) {
      console.error('[Contracts] Error loading contacts:', err);
      setError('Failed to load contacts');
      
      // Fallback to default contacts
      setContracts([
        { 
          id: 1, 
          name: "Friend1", 
          type: "friend" as const,
          status: "Active" as const, 
          date: "2024-01-15",
          avatar: "F1",
          devices: ["Device1", "Device2"],
          isOnline: true,
          contactPrincipalId: "friend1_principal_id_example"
        },
        { 
          id: 2, 
          name: "Friend2", 
          type: "friend" as const,
          status: "Pending" as const, 
          date: "2024-01-20",
          avatar: "F2",
          devices: ["Device1", "Device3"],
          isOnline: false,
          contactPrincipalId: "friend2_principal_id_example"
        },
        { 
          id: 999, 
          name: "Univoice", 
          type: "system" as const,
          status: "Active" as const, 
          date: new Date().toISOString().split('T')[0],
          avatar: "UV",
          devices: [],
          isOnline: true,
          contactPrincipalId: "univoice_ai_principal_id"
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Add new contact
  const addNewContact = async () => {
    try {
      const userPrincipalId = getUserPrincipalId();
      const newContact: ContactInfo = {
        id: Date.now(), // Temporary ID
        name: `Friend${contracts.length + 1}`,
        type: "friend" as const,
        status: "Active" as const,
        date: new Date().toISOString().split('T')[0],
        avatar: `F${contracts.length + 1}`,
        devices: ["Device1"],
        isOnline: true
      };

      const savedContact = await upsertContact(newContact, userPrincipalId);
      if (savedContact) {
        setContracts(prev => [...prev.filter(c => c.id !== 999), savedContact, 
          prev.find(c => c.id === 999)! // Keep Univoice at the end
        ]);
      }
    } catch (err) {
      console.error('[Contracts] Error adding new contact:', err);
      setError('Failed to add new contact');
    }
  };

  // Update contact online status
  const handleUpdateContactOnlineStatus = async (contactId: number, isOnline: boolean) => {
    try {
      const userPrincipalId = getUserPrincipalId();
      const contact = contracts.find(c => c.id === contactId);
      
      if (contact && contact.id !== 999) { // Don't update Univoice
        const updatedContact = await updateContactOnlineStatus(
          userPrincipalId, 
          `contact_${contactId}`, 
          isOnline
        );
        
        if (updatedContact) {
          setContracts(prev => prev.map(c => 
            c.id === contactId ? updatedContact : c
          ));
        }
      }
    } catch (err) {
      console.error('[Contracts] Error updating contact online status:', err);
    }
  };

  // Load contacts on component mount
  useEffect(() => {
    if (!authLoading) {
      if (user) {
        loadContacts();
      } else {
        // User is not authenticated, show empty list
        setLoading(false);
        setContracts([]);
        console.log('[Contracts] User not authenticated, showing empty contacts list');
      }
    }
  }, [authLoading, user]);

  // Simulate online status updates for demo purposes
  useEffect(() => {
    const interval = setInterval(() => {
      setContracts(prev => prev.map(contact => {
        if (contact.id !== 999) { // Don't change Univoice status
          return {
            ...contact,
            isOnline: Math.random() > 0.3 // 70% chance of being online
          };
        }
        return contact;
      }));
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return 'text-green-400 bg-green-400/20';
      case 'Pending': return 'text-yellow-400 bg-yellow-400/20';
      case 'Blocked': return 'text-red-400 bg-red-400/20';
      case 'Deleted': return 'text-gray-400 bg-gray-400/20';
      default: return 'text-white/60 bg-white/10';
    }
  };



  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'Active':
        return t('common.statusActive');
      case 'Pending':
        return t('common.statusPending');
      case 'Blocked':
        return t('common.statusBlocked');
      case 'Deleted':
        return t('common.statusDeleted');
      default:
        return status;
    }
  };

  const handleContractClick = (contract: ContactInfo) => {
    // 构建查询参数
    const params = new URLSearchParams({
      contactId: contract.id.toString(),
      contactName: contract.name,
      contactAvatar: contract.avatar,
      contactType: contract.type,
      contactStatus: contract.status,
      contactDevices: contract.devices.join(','),
      contactIsOnline: contract.isOnline.toString(),
    });
    
    // 添加可选参数
    if (contract.nickname) {
      params.set('contactNickname', contract.nickname);
    }
    if (contract.contactPrincipalId) {
      params.set('contactPrincipalId', contract.contactPrincipalId);
    }
    
    // 导航到聊天页面
    navigate(`/chat?${params.toString()}`);
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
          <div className="flex-1 min-w-0 overflow-hidden">
            <div className="h-full flex flex-col">
              {/* Contracts Content */}
              <div className="flex-1 min-w-0 flex">
                <div className="flex-1 m-2 md:m-4 mb-20 lg:mb-4 rounded-2xl bg-white/5 backdrop-blur-xl shadow-2xl border border-white/10 overflow-hidden">
                  <div className="p-3 sm:p-4 md:p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-6 gap-3 sm:gap-0">
                      <div className="flex items-center gap-2 sm:gap-3 md:gap-4">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-gradient-to-r from-cyan-400 to-purple-400 rounded-lg flex items-center justify-center">
                          <FileText className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 text-white" />
                        </div>
                        <div>
                          <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-400 to-blue-400">
                            {t('common.contracts')}
                          </h1>
                          <p className="text-xs sm:text-sm text-white/60">{t('common.contractsSubtitle')}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button 
                          className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white border-0 shadow-lg transition-all duration-200 hover:shadow-xl text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-2"
                          onClick={() => {
                            setSelectedFriendForSharing(null);
                            setQrDialogType('share-self');
                            setShowQrDialog(true);
                          }}
                          disabled={loading || !user}
                        >
                          <QrCode className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                          {t('common.shareSelf')}
                        </Button>
                        <Button 
                          className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white border-0 shadow-lg transition-all duration-200 hover:shadow-xl text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-2"
                          onClick={() => setShowAddContactDialog(true)}
                          disabled={loading || !user}
                        >
                          <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                          {t('common.newContract')}
                        </Button>
                      </div>
                    </div>

                    {/* Loading state */}
                    {loading && (
                      <div className="flex items-center justify-center py-6 sm:py-8">
                        <div className="w-6 h-6 sm:w-8 sm:h-8 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin"></div>
                        <span className="ml-2 sm:ml-3 text-white/60 text-sm sm:text-base">Loading contacts...</span>
                      </div>
                    )}

                    {/* Empty state for unauthenticated users */}
                    {!loading && !user && (
                      <div className="flex flex-col items-center justify-center py-8 sm:py-12 text-center">
                        <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-r from-cyan-400/20 to-purple-400/20 rounded-full flex items-center justify-center mb-4">
                          <User className="w-8 h-8 sm:w-10 sm:h-10 text-cyan-400" />
                        </div>
                        <h3 className="text-lg sm:text-xl font-semibold text-white mb-2">
                          {t('common.loginRequired')}
                        </h3>
                        <p className="text-sm sm:text-base text-white/60 mb-6 max-w-md">
                          {t('common.loginToViewContacts')}
                        </p>
                        
                        {/* Login Tips */}
                        <div className="w-full max-w-md mb-6">
                          <div className="bg-slate-800/90 backdrop-blur-sm border border-cyan-400/30 rounded-lg p-4 mb-4 shadow-xl">
                            <h4 className="text-sm font-semibold text-cyan-400 mb-3 flex items-center gap-2">
                              <div className="w-2 h-2 bg-cyan-400 rounded-full"></div>
                              {t('contracts.howToLogin')}
                            </h4>
                            <div className="space-y-2 text-xs text-white/90 text-left">
                              <div className="flex items-start gap-2">
                                <span className="text-cyan-400 font-semibold">1.</span>
                                <span className="text-white/90">{t('contracts.loginStep1')}</span>
                              </div>
                              <div className="flex items-start gap-2">
                                <span className="text-cyan-400 font-semibold">2.</span>
                                <span className="text-white/90">{t('contracts.loginStep2')}</span>
                              </div>
                              <div className="flex items-start gap-2">
                                <span className="text-cyan-400 font-semibold">3.</span>
                                <span className="text-white/90">{t('contracts.loginStep3')}</span>
                              </div>
                              <div className="flex items-start gap-2">
                                <span className="text-cyan-400 font-semibold">4.</span>
                                <span className="text-white/90">{t('contracts.loginStep4')}</span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="bg-slate-800/90 backdrop-blur-sm border border-purple-400/30 rounded-lg p-3 shadow-xl">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
                              <span className="text-xs font-semibold text-purple-400 text-left">{t('contracts.benefitsOfLogin')}</span>
                            </div>
                            <div className="text-xs text-white/90 space-y-1 text-left">
                              <div className="text-left">• {t('contracts.benefit1')}</div>
                              <div className="text-left">• {t('contracts.benefit2')}</div>
                              <div className="text-left">• {t('contracts.benefit3')}</div>
                              <div className="text-left">• {t('contracts.benefit4')}</div>
                            </div>
                          </div>
                        </div>
                        
                        <p className="text-xs text-white/50 mt-2">
                          {t('contracts.noAccountTip')}
                        </p>
                      </div>
                    )}

                    {/* Empty state for authenticated users with no contacts */}
                    {!loading && user && contracts.length === 0 && (
                      <div className="flex flex-col items-center justify-center py-8 sm:py-12 text-center">
                        <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-r from-cyan-400/20 to-purple-400/20 rounded-full flex items-center justify-center mb-4">
                          <User className="w-8 h-8 sm:w-10 sm:h-10 text-cyan-400" />
                        </div>
                        <h3 className="text-lg sm:text-xl font-semibold text-white mb-2">
                          {t('common.noContacts')}
                        </h3>
                        <p className="text-sm sm:text-base text-white/60 mb-6 max-w-md">
                          {t('common.addFirstContact')}
                        </p>
                        <Button 
                          className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white shadow-lg transition-all duration-200 hover:shadow-xl px-6 py-3"
                          onClick={() => setShowAddContactDialog(true)}
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          {t('common.addContact')}
                        </Button>
                      </div>
                    )}

                    {/* Error state */}
                    {error && (
                      <div className="mb-3 sm:mb-4 p-2 sm:p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
                        <p className="text-red-400 text-xs sm:text-sm">{error}</p>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="mt-2 text-red-400 border-red-400/30 hover:bg-red-500/20 text-xs px-2 py-1"
                          onClick={() => setError(null)}
                        >
                          Dismiss
                        </Button>
                      </div>
                    )}

                    {/* Contacts list */}
                    <div className="space-y-2 sm:space-y-3 md:space-y-4">
                      {contracts.map((contract) => (
                        <div 
                          key={contract.id} 
                          className="p-3 sm:p-4 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-all duration-200 cursor-pointer backdrop-blur-sm hover:shadow-lg"
                          onClick={() => handleContractClick(contract)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 sm:gap-3 md:gap-4">
                              <div className="relative">
                                <Avatar className="w-8 h-8 sm:w-10 sm:h-10">
                                  <AvatarFallback className="bg-gradient-to-r from-cyan-400 to-purple-400 text-white font-semibold text-xs sm:text-sm">
                                    {contract.avatar}
                                  </AvatarFallback>
                                </Avatar>
                                {contract.isOnline && (
                                  <div className="absolute -bottom-1 -right-1 w-2 h-2 sm:w-3 sm:h-3 bg-green-400 rounded-full border-2 border-slate-900 animate-pulse"></div>
                                )}
                              </div>
                              <div>
                                <div className="flex items-center gap-1 sm:gap-2">
                                  <h3 className="text-white font-medium text-sm sm:text-base">{contract.name}</h3>
                                  {contract.type === 'friend' && <User className="h-3 w-3 sm:h-4 sm:w-4 text-cyan-400" />}
                                  {contract.type === 'system' && <div className="w-2 h-2 bg-purple-400 rounded-full"></div>}
                                </div>
                                <p className="text-xs sm:text-sm text-white/60">
                                  {contract.devices.length > 0 ? `${contract.devices.join(', ')}` : t('common.systemContract')}
                                </p>
                                {contract.nickname && (
                                  <p className="text-xs text-cyan-400/70">{contract.nickname}</p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 sm:gap-3">
                              <span className={`px-2 py-1 sm:px-3 sm:py-1 rounded-full text-xs font-medium ${getStatusColor(contract.status)} backdrop-blur-sm`}>
                                {getStatusLabel(contract.status)}
                              </span>
                              <div className="flex gap-1 sm:gap-2">
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="bg-white/5 border-white/20 text-white hover:bg-white/10 backdrop-blur-sm p-1 sm:p-2"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleContractClick(contract);
                                  }}
                                >
                                  <MessageCircle className="h-3 w-3 sm:h-4 sm:w-4" />
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="bg-white/5 border-white/20 text-white hover:bg-white/10 backdrop-blur-sm p-1 sm:p-2"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedFriendForSharing(contract);
                                    setQrDialogType('share-friend');
                                    setShowQrDialog(true);
                                  }}
                                >
                                  <QrCode className="h-3 w-3 sm:h-4 sm:w-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Navigation - Mobile only */}
        <div className="lg:hidden">
          <BottomNavigation />
        </div>



        {/* Share QR Dialog */}
        <Dialog open={showQrDialog} onOpenChange={setShowQrDialog}>
          <DialogContent className="bg-slate-900/95 backdrop-blur-xl border-white/10 max-w-sm mx-auto shadow-2xl">
            <DialogHeader className="pb-2">
              <DialogTitle className="text-white flex items-center gap-2">
                <QrCode className="h-5 w-5 text-cyan-400" />
                {qrDialogType === 'share-self' 
                  ? 'Share Your QR Code'
                  : `Share ${selectedFriendForSharing?.name || 'Contact'} QR Code`
                }
              </DialogTitle>
            </DialogHeader>
            <div className="flex flex-col items-center gap-4 py-2">
              {(() => {
                let qrValue = '';
                let displayPrincipalId = '';
                let displayName = '';
                
                if (qrDialogType === 'share-self') {
                  const userPrincipalId = getUserPrincipalId();
                  qrValue = String(userPrincipalId); // 直接使用原始 principal ID
                  displayPrincipalId = userPrincipalId;
                  displayName = 'Your';
                } else if (qrDialogType === 'share-friend' && selectedFriendForSharing) {
                  const friendPrincipalId = selectedFriendForSharing.contactPrincipalId || selectedFriendForSharing.id;
                  qrValue = String(friendPrincipalId); // 直接使用原始 principal ID
                  displayPrincipalId = String(friendPrincipalId);
                  displayName = selectedFriendForSharing.name;
                }
                
                if (!qrValue) return null;
                
                return (
                  <div className="p-4 bg-slate-800/90 rounded-lg border border-white/20 shadow-xl">
                    <QRCode value={qrValue} size={200} level="M" />
                  </div>
                );
              })()}
              
              {/* Principal ID Display and Copy */}
              <div className="w-full space-y-3">
                <div className="text-center">
                  <p className="text-sm text-white/70 mb-2">
                    {qrDialogType === 'share-self' ? 'Your Principal ID:' : `${selectedFriendForSharing?.name || 'Contact'} ID:`}
                  </p>
                  <div className="flex items-center gap-2 justify-center">
                    <code className="text-xs text-cyan-300 bg-slate-800/50 px-3 py-2 rounded-lg font-mono break-all">
                      {qrDialogType === 'share-self' ? getUserPrincipalId() : (selectedFriendForSharing?.contactPrincipalId || selectedFriendForSharing?.id || '')}
                    </code>
                    <Button
                      variant="outline"
                      size="sm"
                      className="bg-cyan-500/20 border-cyan-400/30 text-cyan-400 hover:bg-cyan-500/30 hover:border-cyan-400/50"
                      onClick={async () => {
                        const textToCopy = qrDialogType === 'share-self' ? getUserPrincipalId() : (selectedFriendForSharing?.contactPrincipalId || String(selectedFriendForSharing?.id || ''));
                        await copyWithFeedback(
                          textToCopy,
                          () => {
                            setCopySuccess('principal');
                            setTimeout(() => setCopySuccess(null), 2000);
                            console.log('Principal ID copied to clipboard');
                          },
                          (errorMessage: string) => {
                            console.error('Failed to copy principal ID:', errorMessage);
                            setError(errorMessage);
                            setTimeout(() => setError(null), 3000);
                          }
                        );
                      }}
                    >
                      {copySuccess === 'principal' ? (
                        <CheckCircle className="h-4 w-4 text-green-400" />
                      ) : (
                        'Copy'
                      )}
                    </Button>
                  </div>
                </div>
              </div>
              
              <div className="text-xs text-white/70 text-center">
                {qrDialogType === 'share-self' 
                  ? 'Share your QR code to let others add you as a friend'
                  : `Share ${selectedFriendForSharing?.name || 'contact'} QR code to add them as a friend`
                }
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Add New Contact Dialog */}
        <Dialog open={showAddContactDialog} onOpenChange={setShowAddContactDialog}>
          <DialogContent className="bg-slate-900/95 backdrop-blur-xl border-white/10 max-w-sm mx-auto shadow-2xl">
            <DialogHeader className="pb-3 sm:pb-4">
              <DialogTitle className="text-white flex items-center gap-2 sm:gap-3 text-base sm:text-lg">
                <Avatar className="w-6 h-6 sm:w-8 sm:h-8">
                  <AvatarFallback className="bg-gradient-to-r from-cyan-400 to-purple-400 text-white text-xs sm:text-sm">
                    U
                  </AvatarFallback>
                </Avatar>
                Add New Contact
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 sm:space-y-4">
              <div className="p-2 sm:p-3 bg-white/5 rounded-lg backdrop-blur-sm">
                <div className="text-xs sm:text-sm text-white/80 space-y-2 sm:space-y-3">
                  <div>
                    <p className="text-cyan-400 mb-1 sm:mb-2 text-xs sm:text-sm">Principal ID:</p>
                    <div className="flex gap-2">
                      <Input
                        value={newContactPrincipalId}
                        onChange={(e) => setNewContactPrincipalId(e.target.value)}
                        placeholder="Enter Principal ID"
                        className="bg-white/5 border-white/20 text-white placeholder:text-white/50 backdrop-blur-sm text-xs sm:text-sm flex-1"
                        disabled={addingContact}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="bg-white/5 border-white/20 text-white hover:bg-white/10 backdrop-blur-sm px-2 sm:px-3"
                        onClick={() => setShowQRScanner(true)}
                        disabled={addingContact}
                        title={t('common.scanQRCode')}
                      >
                        <QrCode className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div>
                    <p className="text-cyan-400 mb-1 sm:mb-2 text-xs sm:text-sm">Nickname (optional):</p>
                    <Input
                      value={newContactNickname}
                      onChange={(e) => setNewContactNickname(e.target.value)}
                      placeholder="Enter Nickname"
                      className="bg-white/5 border-white/20 text-white placeholder:text-white/50 backdrop-blur-sm text-xs sm:text-sm"
                      disabled={addingContact}
                    />
                  </div>
                </div>
              </div>
              
              {/* Error display */}
              {error && (
                <div className="p-2 sm:p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
                  <p className="text-red-400 text-xs sm:text-sm">{error}</p>
                </div>
              )}
              
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-white/5 border-white/20 text-white hover:bg-white/10 backdrop-blur-sm text-xs px-2 py-1"
                  onClick={() => {
                    setShowAddContactDialog(false);
                    setNewContactPrincipalId('');
                    setNewContactNickname('');
                    setError(null);
                  }}
                  disabled={addingContact}
                >
                  Cancel
                </Button>
                <Button
                  className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white border-0 text-xs sm:text-sm px-3 py-1 sm:px-4 sm:py-2"
                  onClick={async () => {
                    if (!newContactPrincipalId.trim()) {
                      setError('Principal ID is required');
                      return;
                    }
                    
                    setAddingContact(true);
                    setError(null);
                    
                    try {
                      const userPrincipalId = getUserPrincipalId();
                      const savedContact = await createContactFromPrincipalId(
                        userPrincipalId, 
                        newContactPrincipalId, 
                        newContactNickname || undefined
                      );
                      
                      if (savedContact) {
                        setContracts(prev => [...prev.filter(c => c.id !== 999), savedContact, 
                          prev.find(c => c.id === 999)! // Keep Univoice at the end
                        ]);
                        setShowAddContactDialog(false);
                        setNewContactPrincipalId('');
                        setNewContactNickname('');
                        setError(null);
                        console.log('New contact added:', savedContact);
                      } else {
                        setError('Failed to create contact. User profile not found.');
                      }
                    } catch (err) {
                      console.error('[Contracts] Error adding new contact:', err);
                      setError('Failed to add new contact. Please check the Principal ID.');
                    } finally {
                      setAddingContact(false);
                    }
                  }}
                  disabled={addingContact || !newContactPrincipalId.trim()}
                >
                  {addingContact ? (
                    <div className="w-3 h-3 sm:w-4 sm:h-4 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin"></div>
                  ) : (
                    'Add Contact'
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* QR Code Scanner */}
        <QRCodeScanner
          isOpen={showQRScanner}
          onClose={() => setShowQRScanner(false)}
          onScan={(result) => {
            console.log('[Contracts] QR Code scanned:', result);
            
            // Extract principal ID from scanned result
            // Handle both direct principal ID and URL format (univoice://add-friend?uid=xxx)
            let principalId = result.trim();
            
            // If it's a URL format, extract the principal ID
            if (principalId.startsWith('univoice://')) {
              try {
                const url = new URL(principalId.replace('univoice://', 'https://'));
                principalId = url.searchParams.get('uid') || principalId;
              } catch (e) {
                console.warn('[Contracts] Failed to parse URL format, using raw result');
              }
            }
            
            // Set the principal ID in the input field
            if (principalId) {
              setNewContactPrincipalId(principalId);
              setError(null);
              console.log('[Contracts] Principal ID extracted:', principalId);
            } else {
              setError('Invalid QR code format. Please scan a valid Principal ID QR code.');
            }
          }}
        />
      </div>
    </PageLayout>
  );
};

export default Contracts;