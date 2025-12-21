import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useI18nStore, languages, detectBrowserLanguage } from '@/lib/i18n';
import { Globe } from 'lucide-react';

export function LanguageSelector() {
  const { currentLanguage, setLanguage, t } = useI18nStore();

  useEffect(() => {
    const browserLang = detectBrowserLanguage();
    if (browserLang !== currentLanguage.code) {
      setLanguage(browserLang);
    }
  }, []);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-9 gap-2 neon-border"
        >
          <Globe className="w-4 h-4" />
          <span className="font-medium">{currentLanguage.name}</span>
          <span aria-hidden="true">{currentLanguage.flag}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {languages.map((language) => (
          <DropdownMenuItem
            key={language.code}
            onClick={() => setLanguage(language.code)}
            className="flex items-center gap-2"
          >
            <span aria-hidden="true">{language.flag}</span>
            <span>{language.name}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}