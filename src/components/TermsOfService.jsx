import { ArrowLeft, FileText, Shield, Users, Lock, CheckCircle2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useI18nStore } from '@/lib/i18n';

export function TermsOfService({ onBack }) {
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
          <FileText className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-bold">{t('termsTitle')}</h1>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            {t('termsObjectTitle')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            {t('termsObject1')}
          </p>
          <p className="text-muted-foreground">
            {t('termsObject2')}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            {t('termsAccessTitle')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
            <li>{t('termsAccess1')}</li>
            <li>{t('termsAccess2')}</li>
            <li>{t('termsAccess3')}</li>
            <li>{t('termsAccess4')}</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            {t('termsFunctioningTitle')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
            <li>{t('termsFunctioning1')}</li>
            <li>{t('termsFunctioning2')}</li>
            <li>{t('termsFunctioning3')}</li>
            <li>{t('termsFunctioning4')}
              <ul className="list-disc list-inside ml-6 mt-2 space-y-1">
                <li>{t('termsFunctioning4a')}</li>
                <li>{t('termsFunctioning4b')}</li>
              </ul>
            </li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5" />
            {t('termsResponsibilitiesTitle')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div>
              <h3 className="font-semibold mb-2">{t('termsResponsibilitiesBonkont')}</h3>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                <li>{t('termsResponsibilitiesBonkont1')}</li>
                <li>{t('termsResponsibilitiesBonkont2')}</li>
                <li>{t('termsResponsibilitiesBonkont3')}</li>
              </ul>
            </div>

            <Separator />

            <div>
              <h3 className="font-semibold mb-2">{t('termsResponsibilitiesUsers')}</h3>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                <li>{t('termsResponsibilitiesUsers1')}</li>
                <li>{t('termsResponsibilitiesUsers2')}</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5" />
            {t('termsClosureTitle')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            {t('termsClosureIntro')}
          </p>
          <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
            <li>{t('termsClosure1')}</li>
            <li>{t('termsClosure2')}</li>
            <li>{t('termsClosure3')}</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trash2 className="w-5 h-5" />
            {t('termsDeletionTitle')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            {t('termsDeletion1')}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

