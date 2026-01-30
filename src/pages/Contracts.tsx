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
import { cn } from '../lib/utils';
import styles from '../styles/pages/Contracts.module.css';

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
      case 'Active': return styles['contracts__status--active'];
      case 'Pending': return styles['contracts__status--pending'];
      case 'Blocked': return styles['contracts__status--blocked'];
      case 'Deleted': return styles['contracts__status--deleted'];
      default: return styles['contracts__status--default'];
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
      <div className={styles.contracts__loading}>
        <div className={styles.contracts__loading__spinner}>
          <div className={styles.contracts__loading__spinner__outer}></div>
          <div className={styles.contracts__loading__spinner__inner}></div>
          <div className={styles.contracts__loading__text}>
            <div className={styles.contracts__loading__text__gradient}>
              {t('common.initializingAI')}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <PageLayout>
      <div className={styles.contracts__page}>
        {/* Header */}
        <AppHeader />

        <div className={styles.contracts__layout}>
          {/* Sidebar for desktop only */}
          <div className={styles.contracts__sidebar}>
            <AppSidebar />
          </div>

          {/* Main Content */}
          <div className={styles.contracts__main}>
            <div className={styles.contracts__content}>
              {/* Contracts Content */}
              <div className={styles.contracts__content__inner}>
                <div className={styles.contracts__container}>
                  <div className={styles.contracts__container__inner}>
                    <div className={styles.contracts__header}>
                      <div className={styles.contracts__header__left}>
                        <div className={styles.contracts__header__icon}>
                          <FileText className={styles.contracts__header__icon__svg} />
                        </div>
                        <div>
                          <h1 className={styles.contracts__header__title}>
                            {t('common.contracts')}
                          </h1>
                          <p className={styles.contracts__header__subtitle}>{t('common.contractsSubtitle')}</p>
                        </div>
                      </div>
                      <div className={styles.contracts__header__actions}>
                        <Button 
                          className={styles.contracts__button}
                          onClick={() => {
                            setSelectedFriendForSharing(null);
                            setQrDialogType('share-self');
                            setShowQrDialog(true);
                          }}
                          disabled={loading || !user}
                        >
                          <QrCode className={styles.contracts__button__icon} />
                          {t('common.shareSelf')}
                        </Button>
                        <Button 
                          className={styles.contracts__button}
                          onClick={() => setShowAddContactDialog(true)}
                          disabled={loading || !user}
                        >
                          <Plus className={styles.contracts__button__icon} />
                          {t('common.newContract')}
                        </Button>
                      </div>
                    </div>

                    {/* Loading state */}
                    {loading && (
                      <div className={styles.contracts__loading__state}>
                        <div className={styles.contracts__loading__spinner__small}></div>
                        <span className={styles.contracts__loading__text__small}>Loading contacts...</span>
                      </div>
                    )}

                    {/* Empty state for unauthenticated users */}
                    {!loading && !user && (
                      <div className={styles.contracts__empty}>
                        <div className={styles.contracts__empty__icon}>
                          <User className={styles.contracts__empty__icon__svg} />
                        </div>
                        <h3 className={styles.contracts__empty__title}>
                          {t('common.loginRequired')}
                        </h3>
                        <p className={styles.contracts__empty__text}>
                          {t('common.loginToViewContacts')}
                        </p>
                        
                        {/* Login Tips */}
                        <div className={styles.contracts__tips}>
                          <div className={styles.contracts__tips__card}>
                            <h4 className={styles.contracts__tips__title}>
                              <div className={styles.contracts__tips__dot}></div>
                              {t('contracts.howToLogin')}
                            </h4>
                            <div className={styles.contracts__tips__list}>
                              <div className={styles.contracts__tips__item}>
                                <span className={styles.contracts__tips__item__number}>1.</span>
                                <span>{t('contracts.loginStep1')}</span>
                              </div>
                              <div className={styles.contracts__tips__item}>
                                <span className={styles.contracts__tips__item__number}>2.</span>
                                <span>{t('contracts.loginStep2')}</span>
                              </div>
                              <div className={styles.contracts__tips__item}>
                                <span className={styles.contracts__tips__item__number}>3.</span>
                                <span>{t('contracts.loginStep3')}</span>
                              </div>
                              <div className={styles.contracts__tips__item}>
                                <span className={styles.contracts__tips__item__number}>4.</span>
                                <span>{t('contracts.loginStep4')}</span>
                              </div>
                            </div>
                          </div>
                          
                          <div className={styles.contracts__tips__benefits}>
                            <div className={styles.contracts__tips__benefits__header}>
                              <div className={styles.contracts__tips__benefits__dot}></div>
                              <span className={styles.contracts__tips__benefits__title}>{t('contracts.benefitsOfLogin')}</span>
                            </div>
                            <div className={styles.contracts__tips__benefits__list}>
                              <div>• {t('contracts.benefit1')}</div>
                              <div>• {t('contracts.benefit2')}</div>
                              <div>• {t('contracts.benefit3')}</div>
                              <div>• {t('contracts.benefit4')}</div>
                            </div>
                          </div>
                        </div>
                        
                        <p className={styles.contracts__tips__footer}>
                          {t('contracts.noAccountTip')}
                        </p>
                      </div>
                    )}

                    {/* Empty state for authenticated users with no contacts */}
                    {!loading && user && contracts.length === 0 && (
                      <div className={styles.contracts__empty}>
                        <div className={styles.contracts__empty__icon}>
                          <User className={styles.contracts__empty__icon__svg} />
                        </div>
                        <h3 className={styles.contracts__empty__title}>
                          {t('common.noContacts')}
                        </h3>
                        <p className={styles.contracts__empty__text}>
                          {t('common.addFirstContact')}
                        </p>
                        <Button 
                          className={styles.contracts__button__action}
                          onClick={() => setShowAddContactDialog(true)}
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          {t('common.addContact')}
                        </Button>
                      </div>
                    )}

                    {/* Error state */}
                    {error && (
                      <div className={styles.contracts__error}>
                        <p className={styles.contracts__error__text}>{error}</p>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className={cn(styles['contracts__button--outline'], styles['contracts__button--error'], "mt-2 text-xs px-2 py-1")}
                          onClick={() => setError(null)}
                        >
                          Dismiss
                        </Button>
                      </div>
                    )}

                    {/* Contacts list */}
                    <div className={styles.contracts__list}>
                      {contracts.map((contract) => (
                        <div 
                          key={contract.id} 
                          className={styles.contracts__item}
                          onClick={() => handleContractClick(contract)}
                        >
                          <div className={styles.contracts__item__content}>
                            <div className={styles.contracts__item__left}>
                              <div className={styles.contracts__item__avatar}>
                                <Avatar className="w-8 h-8 sm:w-10 sm:h-10">
                                  <AvatarFallback className="bg-gradient-to-r from-cyan-400 to-purple-400 text-white font-semibold text-xs sm:text-sm">
                                    {contract.avatar}
                                  </AvatarFallback>
                                </Avatar>
                                {contract.isOnline && (
                                  <div className={styles.contracts__item__avatar__badge}></div>
                                )}
                              </div>
                              <div>
                                <div className={styles.contracts__item__info}>
                                  <h3 className={styles.contracts__item__name}>{contract.name}</h3>
                                  {contract.type === 'friend' && <User className={styles.contracts__item__type__icon} />}
                                  {contract.type === 'system' && <div className={styles.contracts__item__type__dot}></div>}
                                </div>
                                <p className={styles.contracts__item__devices}>
                                  {contract.devices.length > 0 ? `${contract.devices.join(', ')}` : t('common.systemContract')}
                                </p>
                                {contract.nickname && (
                                  <p className={styles.contracts__item__nickname}>{contract.nickname}</p>
                                )}
                              </div>
                            </div>
                            <div className={styles.contracts__item__right}>
                              <span className={cn(styles.contracts__status, getStatusColor(contract.status))}>
                                {getStatusLabel(contract.status)}
                              </span>
                              <div className={styles.contracts__item__actions}>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className={cn(styles['contracts__button--outline'], styles['contracts__button--outline--small'])}
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
                                  className={cn(styles['contracts__button--outline'], styles['contracts__button--outline--small'])}
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
        <div className={styles.contracts__bottom__nav}>
          <BottomNavigation />
        </div>



        {/* Share QR Dialog */}
        <Dialog open={showQrDialog} onOpenChange={setShowQrDialog}>
          <DialogContent className={styles.contracts__dialog}>
            <DialogHeader className={styles.contracts__dialog__header}>
              <DialogTitle className={styles.contracts__dialog__title}>
                <QrCode className={styles.contracts__dialog__title__icon} />
                {qrDialogType === 'share-self' 
                  ? 'Share Your QR Code'
                  : `Share ${selectedFriendForSharing?.name || 'Contact'} QR Code`
                }
              </DialogTitle>
            </DialogHeader>
            <div className={styles.contracts__dialog__content}>
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
                  <div className={styles.contracts__dialog__qr}>
                    <QRCode value={qrValue} size={200} level="M" />
                  </div>
                );
              })()}
              
              {/* Principal ID Display and Copy */}
              <div className={styles.contracts__dialog__principal}>
                <div>
                  <p className={styles.contracts__dialog__principal__label}>
                    {qrDialogType === 'share-self' ? 'Your Principal ID:' : `${selectedFriendForSharing?.name || 'Contact'} ID:`}
                  </p>
                  <div className={styles.contracts__dialog__principal__input}>
                    <code className={styles.contracts__dialog__principal__code}>
                      {qrDialogType === 'share-self' ? getUserPrincipalId() : (selectedFriendForSharing?.contactPrincipalId || selectedFriendForSharing?.id || '')}
                    </code>
                    <Button
                      variant="outline"
                      size="sm"
                      className={styles['contracts__button--copy']}
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
              
              <div className={styles.contracts__dialog__footer}>
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
          <DialogContent className={styles.contracts__dialog}>
            <DialogHeader className={styles.contracts__dialog__add__header}>
              <DialogTitle className={styles.contracts__dialog__add__title}>
                <Avatar className="w-6 h-6 sm:w-8 sm:h-8">
                  <AvatarFallback className="bg-gradient-to-r from-cyan-400 to-purple-400 text-white text-xs sm:text-sm">
                    U
                  </AvatarFallback>
                </Avatar>
                Add New Contact
              </DialogTitle>
            </DialogHeader>
            <div className={styles.contracts__dialog__add__form}>
              <div className={styles.contracts__dialog__add__form__card}>
                <div className={styles.contracts__dialog__add__form__fields}>
                  <div className={styles.contracts__dialog__add__form__field}>
                    <p className={styles.contracts__dialog__add__form__label}>Principal ID:</p>
                    <div className={styles.contracts__dialog__add__form__input__group}>
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
                        className={cn(styles['contracts__button--outline'], "px-2 sm:px-3")}
                        onClick={() => setShowQRScanner(true)}
                        disabled={addingContact}
                        title={t('common.scanQRCode')}
                      >
                        <QrCode className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className={styles.contracts__dialog__add__form__field}>
                    <p className={styles.contracts__dialog__add__form__label}>Nickname (optional):</p>
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
                <div className={styles.contracts__error}>
                  <p className={styles.contracts__error__text}>{error}</p>
                </div>
              )}
              
              <div className={styles.contracts__dialog__add__form__actions}>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(styles['contracts__button--outline'], "text-xs px-2 py-1")}
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
                  className={styles.contracts__button}
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
                    <div className={styles.contracts__dialog__add__form__spinner}></div>
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