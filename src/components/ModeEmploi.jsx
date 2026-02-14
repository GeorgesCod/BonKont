import { ArrowLeft, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useI18nStore } from '@/lib/i18n';
// Contenu intégré au bundle pour le même rendu accordéon en dev et en prod (évite fetch réécrit vers index.html)
import modeEmploiFr from '@/content/MODE_EMPLOI.md?raw';
import modeEmploiEn from '@/content/MODE_EMPLOI_EN.md?raw';

/**
 * Découpe le markdown en rubriques (sections ##).
 * Retourne { intro: string, sections: [{ title: string, body: string }] }.
 */
function parseSections(md) {
  if (!md || typeof md !== 'string') return { intro: '', sections: [] };
  const normalized = md.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const parts = normalized.split(/\n##\s+/);
  const intro = (parts[0] || '').trim();
  const sections = [];
  for (let i = 1; i < parts.length; i++) {
    const block = parts[i].trim();
    const firstLineEnd = block.indexOf('\n');
    const title = firstLineEnd >= 0 ? block.slice(0, firstLineEnd).trim() : block;
    const body = firstLineEnd >= 0 ? block.slice(firstLineEnd + 1).trim() : '';
    if (title) sections.push({ title, body });
  }
  return { intro, sections };
}

/**
 * Convertit du markdown simple en éléments React (h1, h2, h3, p, strong, ul, li, hr).
 * Gère aussi les tableaux basiques.
 */
function renderMarkdown(md) {
  if (!md || typeof md !== 'string') return null;
  const lines = md.split(/\r?\n/);
  const out = [];
  let i = 0;
  let listItems = [];
  let inTable = false;
  let tableRows = [];

  const flushList = () => {
    if (listItems.length > 0) {
      out.push(
        <ul key={`ul-${i}`} className="list-disc list-inside space-y-1 text-muted-foreground text-xs sm:text-sm ml-2 my-2">
          {listItems.map((item, idx) => (
            <li key={idx}>{item}</li>
          ))}
        </ul>
      );
      listItems = [];
    }
  };

  const flushTable = () => {
    if (tableRows.length < 2) {
      tableRows = [];
      inTable = false;
      return;
    }
    const header = tableRows[0];
    const body = tableRows.slice(1).filter(row => row.some(cell => cell.trim()));
    out.push(
      <div key={`table-${i}`} className="my-4 overflow-x-auto rounded-lg border border-border max-w-full">
        <table className="w-full max-w-full text-xs sm:text-sm table-fixed" style={{ tableLayout: 'fixed' }}>
          <thead>
            <tr className="border-b border-border bg-muted/50">
              {header.map((cell, ci) => (
                <th key={ci} className="px-2 sm:px-3 py-2 text-left font-semibold break-words align-top">{renderInline(cell)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {body.map((row, ri) => (
              <tr key={ri} className="border-b border-border/50">
                {row.map((cell, ci) => (
                  <td key={ci} className="px-2 sm:px-3 py-2 text-muted-foreground break-words align-top">{renderInline(cell)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
    tableRows = [];
    inTable = false;
  };

  const renderInline = (text) => {
    if (!text) return null;
    const parts = [];
    let rest = text;
    let key = 0;
    while (rest.length > 0) {
      const bold = rest.match(/\*\*([^*]+)\*\*/);
      const code = rest.match(/`([^`]+)`/);
      let match = null;
      let type = null;
      if (bold && (!code || bold.index <= code.index)) {
        match = bold;
        type = 'bold';
      } else if (code) {
        match = code;
        type = 'code';
      }
      if (match) {
        if (match.index > 0) {
          parts.push(<span key={key++}>{rest.slice(0, match.index)}</span>);
        }
        if (type === 'bold') {
          parts.push(<strong key={key++}>{match[1]}</strong>);
        } else {
          parts.push(<code key={key++} className="px-1 py-0.5 rounded bg-muted text-xs">{match[1]}</code>);
        }
        rest = rest.slice(match.index + match[0].length);
      } else {
        parts.push(<span key={key++}>{rest.replace(/&/g, '&amp;')}</span>);
        break;
      }
    }
    return <>{parts}</>;
  };

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Ligne de tableau (| ... |)
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      if (!inTable) {
        flushList();
        inTable = true;
        tableRows = [];
      }
      const cells = trimmed.slice(1, -1).split('|').map(c => c.trim());
      if (cells.some(c => c.match(/^[-:]+$/))) {
        i++;
        continue; // séparateur |---|---|
      }
      tableRows.push(cells);
      i++;
      continue;
    } else if (inTable) {
      flushTable();
    }

    if (trimmed.startsWith('### ')) {
      flushList();
      out.push(<h3 key={i} className="text-sm sm:text-base font-semibold mt-4 mb-2">{renderInline(trimmed.slice(4))}</h3>);
      i++;
      continue;
    }
    if (trimmed.startsWith('## ')) {
      flushList();
      out.push(<h2 key={i} className="text-base sm:text-xl font-bold mt-6 mb-2 text-primary">{renderInline(trimmed.slice(3))}</h2>);
      i++;
      continue;
    }
    if (trimmed.startsWith('# ')) {
      flushList();
      out.push(<h1 key={i} className="text-lg sm:text-2xl font-bold mb-2">{renderInline(trimmed.slice(2))}</h1>);
      i++;
      continue;
    }
    if (trimmed === '---' || trimmed === '***') {
      flushList();
      out.push(<hr key={i} className="my-4 border-border" />);
      i++;
      continue;
    }
    if (trimmed.startsWith('- ')) {
      listItems.push(renderInline(trimmed.slice(2).trim()));
      i++;
      continue;
    }
    if (trimmed.match(/^\d+\.\s/)) {
      flushList();
      const content = trimmed.replace(/^\d+\.\s/, '');
      out.push(<p key={i} className="text-muted-foreground text-xs sm:text-sm my-1 ml-4">{renderInline(content)}</p>);
      i++;
      continue;
    }
    if (trimmed === '') {
      flushList();
      i++;
      continue;
    }
    flushList();
    out.push(<p key={i} className="text-muted-foreground text-xs sm:text-sm my-2">{renderInline(trimmed)}</p>);
    i++;
  }
  flushList();
  flushTable();
  return out;
}

const MANUAL_CONTENT = { fr: modeEmploiFr, en: modeEmploiEn };

export function ModeEmploi({ onBack }) {
  const { t, currentLanguage } = useI18nStore();
  const lang = currentLanguage?.code === 'en' ? 'en' : 'fr';
  const content = MANUAL_CONTENT[lang] ?? MANUAL_CONTENT.fr;

  const parsed = parseSections(content);
  let { intro, sections } = parsed;
  if (sections.length === 0) {
    intro = '';
    sections = [{ title: 'Contenu', body: content }];
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl mx-auto w-full min-w-0 px-4 sm:px-4 box-border overflow-x-hidden" style={{ maxWidth: 'min(42rem, 100%)' }}>
      <div className="flex items-center gap-4 mb-6 min-w-0">
        {onBack && (
          <Button variant="outline" onClick={onBack} className="gap-2 shrink-0">
            <ArrowLeft className="w-4 h-4" />
            {t('back')}
          </Button>
        )}
        <div className="flex items-center gap-3 min-w-0 flex-1 overflow-hidden">
          <BookOpen className="w-8 h-8 text-primary shrink-0" />
          <h1 className="text-xl sm:text-2xl font-bold truncate">{t('manualTitle')}</h1>
        </div>
      </div>

      <Card className="overflow-hidden w-full min-w-0 max-w-full">
        <CardContent className="pt-6 px-4 sm:px-6 pb-4 w-full min-w-0 max-w-full box-border">
          <div className="space-y-4 w-full min-w-0 max-w-full">
              {intro ? (
                <div className="w-full min-w-0 max-w-full overflow-x-hidden box-border prose prose-sm dark:prose-invert max-w-full text-muted-foreground text-xs sm:text-sm mb-6 break-words [&_*]:break-words ">
                  {renderMarkdown(intro)}
                </div>
              ) : null}
              {sections.length > 0 ? (
                <Accordion type="single" collapsible className="w-full min-w-0 max-w-full" defaultValue="section-0">
                  {sections.map((section, index) => (
                    <AccordionItem key={index} value={`section-${index}`} className="min-w-0">
                      <AccordionTrigger className="text-left text-sm sm:text-base font-semibold py-3 hover:no-underline break-words pr-4">
                        {section.title}
                      </AccordionTrigger>
                      <AccordionContent className="text-muted-foreground w-full min-w-0 max-w-full box-border overflow-x-hidden">
                        <div className="w-full min-w-0 max-w-full overflow-x-hidden box-border prose prose-sm dark:prose-invert max-w-full text-xs sm:text-sm [&_h2]:text-sm [&_h3]:text-xs sm:[&_h3]:text-sm break-words [&_*]:break-words [&_p]:break-words [&_li]:break-words [&_td]:break-words [&_th]:break-words" style={{ overflowWrap: 'break-word', wordBreak: 'break-word' }}>
                          {renderMarkdown(section.body)}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              ) : null}
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
