import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export const LanguageSwitcher: React.FC = () => {
  const { i18n, t } = useTranslation();
  const current = i18n.language.startsWith('zh') ? 'zh' : 'en';

  const onChangeLang = (lng: 'en' | 'zh') => {
    i18n.changeLanguage(lng);
    try {
      localStorage.setItem('lang', lng);
    } catch {}
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="bg-white/5 border-white/20 text-white hover:bg-white/10 backdrop-blur-sm px-3"
        >
          {current === 'zh' ? t('common.langShortZH') : t('common.langShortEN')}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40 bg-slate-900/95 backdrop-blur-xl border-white/10">
        <DropdownMenuItem onClick={() => onChangeLang('en')} className="text-white hover:bg-white/10 py-2">
          {t('common.languageEnglish')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onChangeLang('zh')} className="text-white hover:bg-white/10 py-2">
          {t('common.languageChinese')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default LanguageSwitcher;
