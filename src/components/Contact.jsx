import { ArrowLeft, Mail, MessageCircle, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useI18nStore } from '@/lib/i18n';

export function Contact({ onBack }) {
  const { t } = useI18nStore();
  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        {onBack && (
          <Button
            variant="outline"
            onClick={onBack}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('back')}
          </Button>
        )}
        <div className="flex items-center gap-3">
          <MessageCircle className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-bold">{t('contactTitle')}</h1>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            {t('contactQuestion')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center py-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-6">
              <Mail className="w-10 h-10 text-primary" />
            </div>
            <p className="text-lg text-muted-foreground mb-4">
              {t('contactResponse')}
            </p>
            <a
              href="mailto:contact@bonkont.app"
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-semibold"
            >
              <Send className="w-5 h-5" />
              contact@bonkont.app
            </a>
          </div>

          <Separator />

          <div className="space-y-4">
            <h3 className="font-semibold text-lg">{t('contactHow')}</h3>
            <p className="text-muted-foreground">
              {t('contactHow1')}
            </p>
            <p className="text-muted-foreground">
              {t('contactHow2')}
            </p>
          </div>
        </CardContent>
      </Card>

      <Separator />

      <div className="text-center py-6">
        <p className="text-muted-foreground italic text-lg">
          {t('taglineFooter')}
        </p>
      </div>
    </div>
  );
}

