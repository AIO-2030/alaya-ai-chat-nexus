import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      common: {
        appName: 'Univoice',
        ai: 'AI',
        initializingAI: 'Initializing AI...',
        login: 'Login',
        loginConnectWallet: 'Login & Connect Wallet',
        connectPlugWallet: 'Connect with Plug Wallet',
        signInGoogle: 'Sign in with Google',
        logout: 'Logout',
        myWallet: 'My Wallet',
        notConnected: 'Not Connected',
        balance: 'Balance',
        devices: 'Devices',
        battery: 'Battery',
        myDevices: 'My Devices',
        myDevicesSubtitle: 'Manage your connected devices and their status',
        addDevice: 'Add Device',
        manage: 'Manage',
        linkToWifi: 'Link to WiFi',
        selectWifiFor: 'Select WiFi network for',
        connect: 'Connect',
        cancel: 'Cancel',
        contracts: 'Contracts',
        contractsSubtitle: 'Manage your smart contracts and agreements',
        newContract: 'New Contract',
        systemContract: 'System Contract',
        typeYourMessage: 'Type your message...',
        emoji: 'Emoji',
        toDevice: 'To Device',
        shareQrTitle: 'Share QR to Add Friend',
        shareQrHint: 'Scan to add a friend. If scanning fails, copy the link to share:',
        statusActive: 'Active',
        statusPending: 'Pending',
        statusCompleted: 'Completed',
        deviceConnected: 'Connected',
        deviceDisconnected: 'Disconnected',
        deviceSyncing: 'Syncing',
        plugNotDetected: 'Plug wallet not detected. Please install the Plug browser extension.',
        plugConnectionCancelled: 'Plug connection was cancelled by the user.',
        plugPrincipalFailed: 'Failed to get Plug principal.',
        iiAuthFailed: 'Internet Identity authentication failed.',
        iiPrincipalFailed: 'Failed to get principal from Internet Identity.',
        languageEnglish: 'English',
        languageChinese: '中文',
        langShortEN: 'EN',
        langShortZH: '中文'
      },
    },
  },
  zh: {
    translation: {
      common: {
        appName: 'Univoice',
        ai: 'AI',
        initializingAI: '初始化 AI...',
        login: '登录',
        loginConnectWallet: '登录并连接钱包',
        connectPlugWallet: '使用 Plug 钱包连接',
        signInGoogle: '使用 Google 登录',
        logout: '退出登录',
        myWallet: '我的钱包',
        notConnected: '未连接',
        balance: '余额',
        devices: '设备',
        battery: '电量',
        myDevices: '我的设备',
        myDevicesSubtitle: '管理已连接设备及其状态',
        addDevice: '添加设备',
        manage: '管理',
        linkToWifi: '连接 WiFi',
        selectWifiFor: '为设备选择 WiFi 网络',
        connect: '连接',
        cancel: '取消',
        contracts: '合约',
        contractsSubtitle: '管理你的智能合约与协议',
        newContract: '新建合约',
        systemContract: '系统合约',
        typeYourMessage: '输入消息...',
        emoji: '表情',
        toDevice: '发送到设备',
        shareQrTitle: '分享二维码添加好友',
        shareQrHint: '扫码添加好友；若无法识别，请复制链接分享：',
        statusActive: '已激活',
        statusPending: '待处理',
        statusCompleted: '已完成',
        deviceConnected: '已连接',
        deviceDisconnected: '未连接',
        deviceSyncing: '同步中',
        plugNotDetected: '未检测到 Plug 钱包，请先安装 Plug 浏览器扩展',
        plugConnectionCancelled: '用户取消了 Plug 连接',
        plugPrincipalFailed: '无法获取 Plug Principal',
        iiAuthFailed: 'Internet Identity 认证失败',
        iiPrincipalFailed: '无法从 Internet Identity 获取 Principal',
        languageEnglish: 'English',
        languageChinese: '中文',
        langShortEN: 'EN',
        langShortZH: '中文'
      },
    },
  },
} as const;

const getInitialLanguage = (): string => {
  if (typeof window === 'undefined') return 'en';
  const saved = localStorage.getItem('lang');
  if (saved === 'en' || saved === 'zh') return saved;
  return navigator.language.toLowerCase().startsWith('zh') ? 'zh' : 'en';
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: getInitialLanguage(),
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
  });

export default i18n;
