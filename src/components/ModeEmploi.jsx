import { useState, useEffect } from 'react';
import { ArrowLeft, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useI18nStore } from '@/lib/i18n';

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
        <ul key={`ul-${i}`} className="list-disc list-inside space-y-1 text-muted-foreground ml-2 my-2">
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
      <div key={`table-${i}`} className="my-4 overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              {header.map((cell, ci) => (
                <th key={ci} className="px-3 py-2 text-left font-semibold">{renderInline(cell)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {body.map((row, ri) => (
              <tr key={ri} className="border-b border-border/50">
                {row.map((cell, ci) => (
                  <td key={ci} className="px-3 py-2 text-muted-foreground">{renderInline(cell)}</td>
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
      out.push(<h3 key={i} className="text-base font-semibold mt-4 mb-2">{renderInline(trimmed.slice(4))}</h3>);
      i++;
      continue;
    }
    if (trimmed.startsWith('## ')) {
      flushList();
      out.push(<h2 key={i} className="text-xl font-bold mt-6 mb-2 text-primary">{renderInline(trimmed.slice(3))}</h2>);
      i++;
      continue;
    }
    if (trimmed.startsWith('# ')) {
      flushList();
      out.push(<h1 key={i} className="text-2xl font-bold mb-2">{renderInline(trimmed.slice(2))}</h1>);
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
      out.push(<p key={i} className="text-muted-foreground my-1 ml-4">{renderInline(content)}</p>);
      i++;
      continue;
    }
    if (trimmed === '') {
      flushList();
      i++;
      continue;
    }
    flushList();
    out.push(<p key={i} className="text-muted-foreground my-2">{renderInline(trimmed)}</p>);
    i++;
  }
  flushList();
  flushTable();
  return out;
}

// Fichiers servis depuis public/ : FR et EN comme les autres pages publiques
const MODE_EMPLOI_PATHS = { fr: '/MODE_EMPLOI.md', en: '/MODE_EMPLOI_EN.md' };

export function ModeEmploi({ onBack }) {
  const { t, currentLanguage } = useI18nStore();
  const [content, setContent] = useState(null);
  const lang = currentLanguage?.code === 'en' ? 'en' : 'fr';
  const manualPath = MODE_EMPLOI_PATHS[lang];

  useEffect(() => {
    setContent(null);
    fetch(manualPath)
      .then(res => res.ok ? res.text() : Promise.reject(new Error('Not found')))
      .then(setContent)
      .catch(() => setContent(false));
  }, [manualPath]);

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        {onBack && (
          <Button variant="outline" onClick={onBack} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            {t('back')}
          </Button>
        )}
        <div className="flex items-center gap-3">
          <BookOpen className="w-8 h-8 text-primary" />
          <h1 className="text-2xl sm:text-3xl font-bold">{t('manualTitle')}</h1>
        </div>
      </div>

      <ScrollArea className="h-[calc(100vh-12rem)] rounded-lg border border-border p-4">
        {content === null ? (
          <p className="text-muted-foreground">{t('manualLoading')}</p>
        ) : content && typeof content === 'string' ? (
          <div className="prose prose-sm dark:prose-invert max-w-none pr-4">
            {renderMarkdown(content)}
          </div>
        ) : (
          <p className="text-muted-foreground">{t('manualNotFound')}</p>
        )}
      </ScrollArea>
    </div>
  );
}
