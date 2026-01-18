import { ArrowLeft, HelpCircle, Wallet2, UserCircle, Clock, Lock, FileText, QrCode, Users, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { useI18nStore } from '@/lib/i18n';

export function FAQ({ onBack }) {
  const { t } = useI18nStore();
  
  const faqItems = [
    {
      question: t('faqQ1'),
      answer: t('faqA1'),
      icon: Wallet2,
    },
    {
      question: t('faqQ2'),
      answer: t('faqA2'),
      icon: Wallet2,
    },
    {
      question: t('faqQ3'),
      answer: t('faqA3'),
      icon: UserCircle,
    },
    {
      question: t('faqQ7'),
      answer: t('faqA7'),
      icon: QrCode,
    },
    {
      question: t('faqQ8'),
      answer: t('faqA8'),
      icon: Lock,
    },
    {
      question: t('faqQ9'),
      answer: t('faqA9'),
      icon: Users,
    },
    {
      question: t('faqQ4'),
      answer: t('faqA4'),
      icon: Clock,
    },
    {
      question: t('faqQ5'),
      answer: t('faqA5'),
      icon: Lock,
    },
    {
      question: t('faqQ6'),
      answer: t('faqA6'),
      icon: FileText,
    },
    {
      question: t('faqQ10'),
      answer: t('faqA10'),
      icon: Calendar,
    },
  ];

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
          <HelpCircle className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-bold">{t('faqTitle')}</h1>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Accordion type="single" collapsible className="w-full">
            {faqItems.map((item, index) => {
              const Icon = item.icon;
              return (
                <AccordionItem key={index} value={`item-${index}`}>
                  <AccordionTrigger className="text-left">
                    <div className="flex items-center gap-3">
                      <Icon className="w-5 h-5 text-primary flex-shrink-0" />
                      <span className="font-semibold">{item.question}</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <p className="text-muted-foreground ml-8">
                      {item.answer}
                    </p>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
}

