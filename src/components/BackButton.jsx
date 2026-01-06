import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function BackButton() {
  const handleBack = () => {
    window.history.back();
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      className="fixed top-4 left-4 z-50 md md-0 md-0"
      onClick={handleBack}
    >
      <ArrowLeft className="w-5 h-5" />
      <span className="sr-only">Retour</span>
    </Button>
  );
}