import { ArrowLeft, Shield, Lock, Eye, FileText, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useI18nStore } from '@/lib/i18n';

export function PrivacyPolicy({ onBack }) {
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
          <Shield className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-bold">{t('privacyTitle')}</h1>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            {t('privacyIntroTitle')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            {t('privacyIntro1')}
          </p>
          <p className="text-muted-foreground">
            {t('privacyIntro2')}
          </p>
          <p className="text-muted-foreground">
            {t('privacyIntro3')}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5" />
            {t('privacyDataTitle')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            {t('privacyDataIntro')}
          </p>
          
          <div className="space-y-3">
            <div>
              <h3 className="font-semibold mb-2">{t('privacyDataAccount')}</h3>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                <li>{t('privacyDataAccountEmail')}</li>
                <li>{t('privacyDataAccountName')}</li>
                <li>{t('privacyDataAccountId')}</li>
              </ul>
            </div>

            <Separator />

            <div>
              <h3 className="font-semibold mb-2">{t('privacyDataEvent')}</h3>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                <li>{t('privacyDataEventName')}</li>
                <li>{t('privacyDataEventCode')}</li>
                <li>{t('privacyDataEventParticipants')}</li>
                <li>{t('privacyDataEventTransactions')}</li>
                <li>{t('privacyDataEventValidations')}</li>
              </ul>
            </div>

            <Separator />

            <div>
              <h3 className="font-semibold mb-2">{t('privacyDataInvoice')}</h3>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                <li>{t('privacyDataInvoiceOcr')}</li>
                <li>{t('privacyDataInvoiceDetails')}</li>
              </ul>
            </div>
          </div>

          <div className="mt-4 p-4 rounded-lg bg-primary/10 border border-primary/20">
            <p className="text-sm font-semibold text-primary">
              📌 {t('privacyDataNoBank')}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5" />
            {t('privacyUsageTitle')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            {t('privacyUsageIntro')}
          </p>
          <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
            <li>{t('privacyUsage1')}</li>
            <li>{t('privacyUsage2')}</li>
            <li>{t('privacyUsage3')}</li>
            <li>{t('privacyUsage4')}</li>
          </ul>
          <div className="mt-4 p-4 rounded-lg bg-primary/10 border border-primary/20">
            <p className="text-sm font-semibold text-primary">
              👉 {t('privacyUsageNoSale')}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('privacySharingTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
            <li>{t('privacySharing1')}</li>
            <li>{t('privacySharing2')}</li>
            <li>{t('privacySharing3')}</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('privacyRetentionTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
            <li>{t('privacyRetention1')}</li>
            <li>{t('privacyRetention2')}</li>
            <li>{t('privacyRetention3')}</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('privacySecurityTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            {t('privacySecurityIntro')}
          </p>
          <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
            <li>{t('privacySecurity1')}</li>
            <li>{t('privacySecurity2')}</li>
            <li>{t('privacySecurity3')}</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('privacyRightsTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            {t('privacyRightsIntro')}
          </p>
          <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
            <li>{t('privacyRights1')}</li>
            <li>{t('privacyRights2')}</li>
            <li>{t('privacyRights3')}</li>
            <li>{t('privacyRights4')}</li>
          </ul>
          <div className="mt-4 p-4 rounded-lg bg-primary/10 border border-primary/20">
            <p className="text-sm font-semibold text-primary flex items-center gap-2">
              <Mail className="w-4 h-4" />
              📧 {t('privacyContact')}
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

