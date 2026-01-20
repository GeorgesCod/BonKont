import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useI18nStore } from '@/lib/i18n';
import { Heart, CheckCircle2, XCircle, Target, Shield, Zap, Users } from 'lucide-react';

export function AboutDialog({ isOpen, onClose }) {
  const { t } = useI18nStore();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl sm:text-2xl">
            <Target className="w-5 h-5 sm:w-6 sm:h-6" />
            {t('aboutTitle')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 prose prose-sm max-w-none dark:prose-invert">
          {/* Notre vision */}
          <div className="space-y-4">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Heart className="w-6 h-6 text-primary" />
              {t('aboutVisionTitle')}
            </h2>
            <p className="text-lg font-semibold text-primary">
              {t('aboutVisionSubtitle')}
            </p>
            <p className="text-base">
              {t('aboutVisionIntro')}
            </p>
            <p className="text-base">
              {t('aboutVisionProblem')}
            </p>
            <p className="text-base font-semibold">
              {t('aboutVisionSolution')}
            </p>
          </div>

          <div className="border-t border-border pt-4"></div>

          {/* L'argent mérite un cadre humain */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              {t('aboutHumanFrameTitle')}
            </h2>
            <p className="text-base">
              {t('aboutHumanFrameIntro')}
            </p>
            <ul className="space-y-2 ml-4 list-disc">
              <li>{t('aboutHumanFrame1')}</li>
              <li>{t('aboutHumanFrame2')}</li>
              <li>{t('aboutHumanFrame3')}</li>
            </ul>
            <p className="text-base font-semibold">
              {t('aboutHumanFrameApproach')}
            </p>
            <ul className="space-y-2 ml-4 list-disc">
              <li>{t('aboutHumanFrameApproach1')}</li>
              <li>{t('aboutHumanFrameApproach2')}</li>
              <li>{t('aboutHumanFrameApproach3')}</li>
            </ul>
          </div>

          <div className="border-t border-border pt-4"></div>

          {/* Une application pensée pour les relations */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Heart className="w-5 h-5 text-primary" />
              {t('aboutRelationsTitle')}
            </h2>
            <p className="text-base">
              {t('aboutRelationsIntro')}
            </p>
            <p className="text-base">
              {t('aboutRelationsFeatures')}
            </p>
            <ul className="space-y-2 ml-4 list-disc">
              <li>{t('aboutRelationsFeature1')}</li>
              <li>{t('aboutRelationsFeature2')}</li>
              <li>{t('aboutRelationsFeature3')}</li>
              <li>{t('aboutRelationsFeature4')}</li>
            </ul>
          </div>

          <div className="border-t border-border pt-4"></div>

          {/* Trois piliers */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              {t('aboutPillarsTitle')}
            </h2>
            
            <div className="bg-primary/10 p-4 rounded-lg border border-primary/20 space-y-3">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-base mb-1">{t('aboutPillar1Title')}</h3>
                  <p className="text-sm">{t('aboutPillar1Description')}</p>
                </div>
              </div>
            </div>

            <div className="bg-primary/10 p-4 rounded-lg border border-primary/20 space-y-3">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-base mb-1">{t('aboutPillar2Title')}</h3>
                  <p className="text-sm">{t('aboutPillar2Description')}</p>
                </div>
              </div>
            </div>

            <div className="bg-primary/10 p-4 rounded-lg border border-primary/20 space-y-3">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-base mb-1">{t('aboutPillar3Title')}</h3>
                  <p className="text-sm">{t('aboutPillar3Description')}</p>
                </div>
              </div>
            </div>

            <p className="text-sm font-semibold text-primary mt-4">
              {t('aboutPillarsConclusion')}
            </p>
          </div>

          <div className="border-t border-border pt-4"></div>

          {/* Vision à long terme */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
              {t('aboutLongTermTitle')}
            </h2>
            <p className="text-base">
              {t('aboutLongTermIntro')}
            </p>
            <ul className="space-y-2 ml-4 list-disc">
              <li>{t('aboutLongTerm1')}</li>
              <li>{t('aboutLongTerm2')}</li>
              <li>{t('aboutLongTerm3')}</li>
            </ul>
            <p className="text-base">
              {t('aboutLongTermNo')}
            </p>
            <p className="text-base font-semibold text-primary">
              {t('aboutLongTermCore')}
            </p>
          </div>

          <div className="border-t border-border pt-4"></div>

          {/* Une technologie au service de la sérénité */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary" />
              {t('aboutTechnologyTitle')}
            </h2>
            <p className="text-base">
              {t('aboutTechnologyIntro')}
            </p>
            <p className="text-base">
              {t('aboutTechnologyPurpose')}
            </p>
            <ul className="space-y-2 ml-4 list-disc">
              <li>{t('aboutTechnology1')}</li>
              <li>{t('aboutTechnology2')}</li>
              <li>{t('aboutTechnology3')}</li>
            </ul>
          </div>

          <div className="border-t border-border pt-4"></div>

          {/* Ce que nous voulons éviter / construire */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-destructive/10 p-4 rounded-lg border border-destructive/20">
              <h3 className="font-semibold text-base mb-3 flex items-center gap-2">
                <XCircle className="w-5 h-5 text-destructive" />
                {t('aboutAvoidTitle')}
              </h3>
              <ul className="space-y-2 text-sm ml-4 list-disc">
                <li>{t('aboutAvoid1')}</li>
                <li>{t('aboutAvoid2')}</li>
                <li>{t('aboutAvoid3')}</li>
                <li>{t('aboutAvoid4')}</li>
              </ul>
            </div>

            <div className="bg-primary/10 p-4 rounded-lg border border-primary/20">
              <h3 className="font-semibold text-base mb-3 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-primary" />
                {t('aboutBuildTitle')}
              </h3>
              <ul className="space-y-2 text-sm ml-4 list-disc">
                <li>{t('aboutBuild1')}</li>
                <li>{t('aboutBuild2')}</li>
                <li>{t('aboutBuild3')}</li>
                <li>{t('aboutBuild4')}</li>
              </ul>
            </div>
          </div>

          <div className="border-t border-border pt-4"></div>

          {/* Bonkont aujourd'hui et demain */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
              {t('aboutTodayTomorrowTitle')}
            </h2>
            <p className="text-base">
              {t('aboutTodayTomorrowIntro')}
            </p>
            <ul className="space-y-2 ml-4 list-disc">
              <li>{t('aboutTodayTomorrow1')}</li>
              <li>{t('aboutTodayTomorrow2')}</li>
              <li>{t('aboutTodayTomorrow3')}</li>
            </ul>
            <p className="text-base font-semibold text-primary">
              {t('aboutTodayTomorrowCore')}
            </p>
          </div>

          <div className="border-t border-border pt-4"></div>

          {/* Notre engagement */}
          <div className="bg-primary/5 p-6 rounded-lg border border-primary/10 text-center">
            <h2 className="text-xl font-bold mb-3">
              {t('aboutCommitmentTitle')}
            </h2>
            <p className="text-lg font-semibold italic text-primary">
              "{t('aboutCommitmentQuote')}"
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

