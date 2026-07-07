/**
 * markdownUtils.tsx
 * Shared markdown rendering utilities: preprocessing, components, and compound renderers.
 * Import from here so that CourseDetailPage and any future page use the same logic.
 */

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import type { Components } from 'react-markdown';
import { Volume2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { BlockAudio } from '../../services/firebase';

// ─────────────────────────────────────────────────────────────────────────────
// Speech synthesis helper
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Speaks `text` using the browser SpeechSynthesis API.
 * Auto-detects Japanese vs English based on character range.
 */
export const speakText = (text: string, rate = 0.9): void => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const isJapanese = /[\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\uff00-\uff9f\u4e00-\u9faf\u3400-\u4dbf]/.test(text);
    utterance.lang = isJapanese ? 'ja-JP' : 'en-US';
    utterance.rate = rate;
    window.speechSynthesis.speak(utterance);
};

// ─────────────────────────────────────────────────────────────────────────────
// Column-hiding helpers (bilingual tables)
// ─────────────────────────────────────────────────────────────────────────────

const HIDE_COL_WHEN_JA = new Set(['vn', 'vi', 'vietnamese', 'tiếng việt']);
const HIDE_COL_WHEN_VI = new Set(['jp', 'ja', 'japanese', 'tiếng nhật', '日本語']);

const isHiddenColumn = (header: string, lang: string): boolean => {
    const h = header.trim().toLowerCase();
    if (lang === 'ja' ? HIDE_COL_WHEN_JA.has(h) : HIDE_COL_WHEN_VI.has(h)) return true;
    const tokens = h.match(/\(([^)]+)\)|[\w\u00C0-\u024F\u4E00-\u9FFF]+/g) || [];
    for (const tok of tokens) {
        const t = tok.replace(/[()]/g, '').trim();
        if (lang === 'ja' && HIDE_COL_WHEN_JA.has(t)) return true;
        if (lang !== 'ja' && HIDE_COL_WHEN_VI.has(t)) return true;
    }
    return false;
};

// ─────────────────────────────────────────────────────────────────────────────
// IPA detect & play button injection
// ─────────────────────────────────────────────────────────────────────────────

/** Regex matching an IPA transcription cell, e.g. `/ˈɡɑːdiən/` */
const IPA_CELL_RE = /^\/[^/\n]{1,60}\/$/;
/** IPA characters: diacritics + IPA letters */
const IPA_CHARS = /[ˈˌːˑ̃͡æɑɒɐɛɜəɘɞɔɥʊʌʋʎɲɳɴŋɱɰɯɪɫɬɭɮʟɾɽɹɻɺʀʁʂʃʈʧʤʦʨʝʒʑʋɣɤɡɠɢɦħhðθfszvxχɕʕʔʬʭɓɗʄɠʛ]/;

/**
 * Given a markdown table cell string, returns the contained IPA string (without slashes)
 * if it looks like an IPA transcription; otherwise null.
 */
const extractIPA = (cell: string): string | null => {
    const trimmed = cell.trim();
    if (!IPA_CELL_RE.test(trimmed)) return null;
    const inner = trimmed.slice(1, -1);
    // Must contain at least one IPA character or stress mark
    if (!IPA_CHARS.test(inner) && !/[ˈˌː]/.test(inner)) return null;
    return inner;
};

/**
 * Injects a speak-button HTML span after IPA cells in markdown table rows.
 * For each table row, scans cells; if a cell matches IPA pattern, appends a
 * `<span class="md-ipa-btn" data-ipa="..." data-word="...">` that the custom
 * `td` renderer will convert to an interactive button.
 *
 * Strategy: extract word from the first non-empty cell of the same row.
 */
const injectIPAButtons = (content: string): string => {
    const lines = content.split('\n');
    const result: string[] = [];
    let headerCells: string[] = [];
    let inTable = false;
    let ipaColIdxs: number[] = [];
    let wordColIdx = -1;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const isTableRow = line.trim().startsWith('|');

        if (!isTableRow) {
            inTable = false;
            headerCells = [];
            ipaColIdxs = [];
            wordColIdx = -1;
            result.push(line);
            continue;
        }

        const cells = line.split('|').slice(1, -1); // strip leading/trailing empty from | delimiters

        // Header row — detect all IPA columns and Word column
        if (!inTable) {
            headerCells = cells.map(c => c.trim().toLowerCase());
            ipaColIdxs = headerCells.reduce<number[]>((acc, h, idx) => {
                if (h.includes('ipa')) acc.push(idx);
                return acc;
            }, []);
            wordColIdx = headerCells.findIndex(h =>
                h === 'word' || h === 'phrase' || h === 'kanji' || h === 'term' || h === 'vocabulary' || h === '単語' || h === '語彙'
            );
            if (wordColIdx === -1) wordColIdx = 0; // fallback: first col is word
            inTable = true;
            result.push(line);
            continue;
        }

        // Align row (---|---|---) — pass through
        if (/^\s*\|[\s\-:|]+\|\s*$/.test(line)) {
            result.push(line);
            continue;
        }

        // Data rows — inject IPA button for every IPA column found
        if (ipaColIdxs.length > 0) {
            const newCells = [...cells];
            const word = wordColIdx >= 0 && wordColIdx < cells.length
                ? cells[wordColIdx].trim().replace(/\*+/g, '')
                : '';
            let injected = false;
            for (const idx of ipaColIdxs) {
                if (idx >= cells.length) continue;
                const ipaCell = cells[idx].trim();
                const ipa = extractIPA(ipaCell);
                if (ipa) {
                    newCells[idx] = `${ipaCell}<span class="md-ipa-btn" data-ipa="${ipa}" data-word="${word.replace(/"/g, '&quot;')}"></span>`;
                    injected = true;
                }
            }
            if (injected) {
                result.push('|' + newCells.join('|') + '|');
                continue;
            }
        }

        result.push(line);
    }
    return result.join('\n');
};

// ─────────────────────────────────────────────────────────────────────────────
// Markdown table column filtering
// ─────────────────────────────────────────────────────────────────────────────

const preprocessMarkdownTables = (content: string, lang: string): string => {
    const lines = content.split('\n');
    const result: string[] = [];
    let i = 0;
    while (i < lines.length) {
        const line = lines[i];
        const nextLine = i + 1 < lines.length ? lines[i + 1] : '';
        const isTableHeader = line.trim().startsWith('|');
        const nextIsAlignRow = /^\s*\|[\s\-:|]+\|\s*$/.test(nextLine);

        if (isTableHeader && nextIsAlignRow) {
            const tableLines: string[] = [];
            let j = i;
            while (j < lines.length && lines[j].trim().startsWith('|')) {
                tableLines.push(lines[j]);
                j++;
            }
            const headerParts = tableLines[0].split('|');
            const colsToHide = new Set<number>();
            headerParts.forEach((cell, idx) => {
                if (idx === 0 || idx === headerParts.length - 1) return;
                if (isHiddenColumn(cell, lang)) colsToHide.add(idx - 1);
            });
            if (colsToHide.size > 0) {
                const processed = tableLines.map(tl => {
                    const parts = tl.split('|');
                    const filtered = parts.filter((_, idx) => {
                        if (idx === 0 || idx === parts.length - 1) return true;
                        return !colsToHide.has(idx - 1);
                    });
                    return filtered.join('|');
                });
                result.push(...processed);
            } else {
                result.push(...tableLines);
            }
            i = j;
        } else {
            result.push(line);
            i++;
        }
    }
    return result.join('\n');
};

// ─────────────────────────────────────────────────────────────────────────────
// Furigana
// ─────────────────────────────────────────────────────────────────────────────

const preprocessFurigana = (content: string): string =>
    content.replace(
        /([^\s（）()「」【】\n\r]+)[（(]([ぁ-ん]+)[）)]/g,
        '<ruby class="jp-ruby" data-rt="$2">$1<rt>$2</rt></ruby>',
    );

// ─────────────────────────────────────────────────────────────────────────────
// Master preprocessMarkdown
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Apply all markdown transformations in order:
 * 1. Bilingual [vi]/[ja] tag stripping
 * 2. Audio placeholder link removal
 * 3. Table column filtering (VN/JP hide)
 * 4. Dialogue line hard-break injection
 * 5. IPA play button injection
 * 6. Furigana ruby conversion
 */
export const preprocessMarkdown = (content: string, lang: string): string => {
    let p = content;

    // 1. Bilingual tags
    if (lang === 'ja') {
        p = p.replace(/\[vi\][\s\S]*?\[\/vi\]/g, '').replace(/\[ja\]([\s\S]*?)\[\/ja\]/g, '$1');
    } else {
        p = p.replace(/\[ja\][\s\S]*?\[\/ja\]/g, '').replace(/\[vi\]([\s\S]*?)\[\/vi\]/g, '$1');
    }

    // 2. Strip audio placeholder lines (local .mp3 links / Audio: labels)
    p = p.replace(/^>[ \t]+[^\n]*\[[^\]\n]*\.mp3[^\]\n]*\][^\n]*(\n|$)/gimu, '');
    p = p.replace(/^>[ \t]+[^\n]*\*\*[Aa]udio\b[^*\n]*\*\*[^\n]*(\n|$)/gimu, '');

    // 3. Table column filter
    p = preprocessMarkdownTables(p, lang);

    // 4. Dialogue hard line-break between consecutive **Name：** lines
    const DIALOGUE_LINE_RE = /^\*\*[^*\n]+[：:]\*\*/;
    const dLines = p.split('\n');
    for (let i = 0; i < dLines.length - 1; i++) {
        if (DIALOGUE_LINE_RE.test(dLines[i]) && DIALOGUE_LINE_RE.test(dLines[i + 1])) {
            dLines[i] = dLines[i].trimEnd() + '  ';
        }
    }
    p = dLines.join('\n');

    // 5. IPA play button injection
    p = injectIPAButtons(p);

    // 6. Furigana
    p = preprocessFurigana(p);

    return p;
};

// ─────────────────────────────────────────────────────────────────────────────
// Markdown component overrides
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Custom `td` renderer: if the cell contains a `.md-ipa-btn` span (injected by
 * injectIPAButtons), replace it with an interactive speak button.
 */
const IPASpeakButton: React.FC<{ ipa: string; word: string }> = ({ ipa, word }) => (
    <button
        type="button"
        title={`Phát âm "${word || ipa}"`}
        onClick={(e) => { e.stopPropagation(); speakText(word || ipa); }}
        className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-50 text-blue-400 hover:bg-blue-100 hover:text-[#1A73E8] transition ml-1 align-middle"
    >
        <Volume2 size={12} />
    </button>
);

export const markdownComponents: Components = {
    h1: ({ children }) => (
        <h1 className="text-2xl font-bold text-gray-900 mt-8 mb-4 pb-3 border-b-2 border-blue-200">{children}</h1>
    ),
    h2: ({ children }) => (
        <h2 className="text-xl font-bold text-gray-800 mt-7 mb-3 pl-4 border-l-4 border-blue-500 py-1">{children}</h2>
    ),
    h3: ({ children }) => (
        <h3 className="text-base font-bold text-gray-800 mt-5 mb-2 flex items-center gap-2">{children}</h3>
    ),
    p: ({ children }) => (
        <p className="text-gray-700 leading-relaxed mb-3 text-[15px]">{children}</p>
    ),
    strong: ({ children }) => <strong className="font-bold text-gray-900">{children}</strong>,
    em: ({ children }) => <em className="italic text-gray-600">{children}</em>,
    blockquote: ({ children }) => (
        <blockquote className="bg-amber-50 border-l-4 border-amber-400 rounded-r-lg px-4 py-3 my-4 text-gray-700 text-sm">
            {children}
        </blockquote>
    ),
    ul: ({ children }) => (
        <ul className="list-disc pl-6 space-y-1 mb-3 text-gray-700 text-[15px]">{children}</ul>
    ),
    ol: ({ children }) => (
        <ol className="list-decimal pl-6 space-y-1 mb-3 text-gray-700 text-[15px]">{children}</ol>
    ),
    li: ({ children }) => <li className="text-gray-700 leading-relaxed">{children}</li>,
    table: ({ children }) => (
        <div className="overflow-x-auto my-5 rounded-xl border border-gray-200 shadow-sm">
            <table className="w-full border-collapse text-sm">{children}</table>
        </div>
    ),
    thead: ({ children }) => (
        <thead className="bg-gradient-to-r from-blue-600 to-blue-500 text-white">{children}</thead>
    ),
    tbody: ({ children }) => <tbody>{children}</tbody>,
    tr: ({ children }) => (
        <tr className="even:bg-blue-50/40 hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-0">
            {children}
        </tr>
    ),
    th: ({ children }) => (
        <th className="px-4 py-3 text-left font-semibold text-white text-sm whitespace-nowrap">{children}</th>
    ),
    td: ({ children, node }) => {
        // Detect injected IPA span in children via node's raw HTML
        // The span `<span class="md-ipa-btn" data-ipa="..." data-word="...">` is
        // rendered by rehype-raw as a React element with className="md-ipa-btn".
        const processedChildren = React.Children.map(children, (child) => {
            if (
                React.isValidElement(child) &&
                (child as React.ReactElement<React.HTMLAttributes<HTMLElement>>).props?.className === 'md-ipa-btn'
            ) {
                const props = (child as React.ReactElement<{ 'data-ipa'?: string; 'data-word'?: string }>).props;
                const ipa = props['data-ipa'] ?? '';
                const word = props['data-word'] ?? '';
                return <IPASpeakButton key="ipa-btn" ipa={ipa} word={word} />;
            }
            return child;
        }) ?? children;
        // Suppress unused `node` lint warning
        void node;
        return <td className="px-4 py-2.5 text-gray-700">{processedChildren}</td>;
    },
    pre: ({ children }) => (
        <pre className="bg-gray-900 text-green-300 rounded-xl p-4 overflow-x-auto text-sm my-4 font-mono leading-relaxed">
            {children}
        </pre>
    ),
    code: ({ children, className }) => (
        className
            ? <code className={`${className} font-mono`}>{children}</code>
            : <code className="bg-gray-100 text-pink-600 px-1.5 py-0.5 rounded text-[13px] font-mono">{children}</code>
    ),
    hr: () => <hr className="my-6 border-t border-gray-200" />,
    a: ({ href, children }) => (
        <a href={href} className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">
            {children}
        </a>
    ),
};

// ─────────────────────────────────────────────────────────────────────────────
// MarkdownContent — drop-in renderer
// ─────────────────────────────────────────────────────────────────────────────

export const MarkdownContent: React.FC<{ content: string }> = ({ content }) => {
    const { i18n } = useTranslation();
    const processed = preprocessMarkdown(content, i18n.language);
    return (
        <div className="markdown-body">
            <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkMath]}
                rehypePlugins={[rehypeKatex, rehypeRaw]}
                components={markdownComponents}
            >
                {processed}
            </ReactMarkdown>
        </div>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// AudioBlockItem
// ─────────────────────────────────────────────────────────────────────────────

export const AudioBlockItem: React.FC<{ url: string; name: string }> = ({ url, name }) => (
    <div className="flex items-center p-3 bg-blue-50 rounded-xl border border-blue-100 mb-3">
        <div className="bg-[#1A73E8] p-2 rounded-full text-white mr-3 shadow-sm">
            <Volume2 size={20} />
        </div>
        <div className="flex-grow min-w-0 mr-3">
            <p className="text-sm font-bold text-gray-700 truncate">{name}</p>
        </div>
        <audio controls className="h-8 w-32 md:w-64" controlsList="nodownload">
            <source src={url} />
        </audio>
    </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// MarkdownWithInlineAudio
// ─────────────────────────────────────────────────────────────────────────────

const RENDER_MD = (md: string, lang: string) => {
    const p = preprocessMarkdown(md, lang);
    return (
        <div className="markdown-body">
            <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex, rehypeRaw]} components={markdownComponents}>
                {p}
            </ReactMarkdown>
        </div>
    );
};

/**
 * Renders markdown with audio players injected inline next to conversation sections.
 * Matches `### Hội thoại N` / `### Conversation N` / `**Conversation N` headings
 * to audio files named `*-convN.mp3`.
 * Falls back to listing all audios at the bottom if no conv-numbered files found.
 */
export const MarkdownWithInlineAudio: React.FC<{
    markdownContent?: string;
    audios?: BlockAudio[];
}> = ({ markdownContent, audios }) => {
    const { i18n } = useTranslation();
    const lang = i18n.language;

    if (!markdownContent && (!audios || audios.length === 0)) return null;

    if (!markdownContent) {
        return (
            <div className="space-y-2 mb-6">
                {(audios ?? []).map(a => <AudioBlockItem key={a.id} url={a.url} name={a.name} />)}
            </div>
        );
    }

    if (!audios || audios.length === 0) {
        return <div className="mb-6">{RENDER_MD(markdownContent, lang)}</div>;
    }

    // Build conv-number → audio map
    const audioMap = new Map<number, BlockAudio>();
    const unindexed: BlockAudio[] = [];
    audios.forEach(a => {
        const m = a.name.match(/conv(\d+)/i);
        if (m) audioMap.set(parseInt(m[1]), a);
        else unindexed.push(a);
    });

    // No conv-numbered audios → markdown then all audios below
    if (audioMap.size === 0) {
        return (
            <div className="mb-6">
                {RENDER_MD(markdownContent, lang)}
                <div className="space-y-2 mt-4">
                    {audios.map(a => <AudioBlockItem key={a.id} url={a.url} name={a.name} />)}
                </div>
            </div>
        );
    }

    // Split at conversation headings
    // Supports: ### Hội thoại N, ### Conversation N, **Conversation N ...
    const CONV_HEADING_RE = /^(?:#{1,4}\s+|\*{1,2}\s*)(?:Hội\s*thoại|Conversation|会話)\s+(\d+)/i;
    const lines = markdownContent.split('\n');

    interface Section { lines: string[]; convN: number | null }
    const sections: Section[] = [];
    let curLines: string[] = [];
    let curConvN: number | null = null;

    for (const line of lines) {
        const m = line.match(CONV_HEADING_RE);
        if (m) {
            sections.push({ lines: curLines, convN: curConvN });
            curLines = [line];
            curConvN = parseInt(m[1]);
        } else {
            curLines.push(line);
        }
    }
    if (curLines.length > 0) sections.push({ lines: curLines, convN: curConvN });

    const renderSection = (section: Section, idx: number) => {
        const { lines: sLines, convN } = section;
        const audio = convN !== null ? audioMap.get(convN) : undefined;

        if (!audio) {
            return <React.Fragment key={idx}>{RENDER_MD(sLines.join('\n'), lang)}</React.Fragment>;
        }

        // Find split point: after context blockquote (🎧/answer-choices), before dialogue
        let splitIdx = Math.min(1, sLines.length);
        let firstMeaningfulIdx = -1;
        for (let i = 1; i < sLines.length; i++) {
            if (sLines[i].trim() !== '') { firstMeaningfulIdx = i; break; }
        }
        if (firstMeaningfulIdx >= 0) {
            const firstLine = sLines[firstMeaningfulIdx];
            if ((firstLine.startsWith('> ') || firstLine === '>') &&
                !/^>\s*\*\*[^*]+[：:]\*\*/.test(firstLine)) {
                // Non-dialogue blockquote → advance past it
                splitIdx = firstMeaningfulIdx + 1;
                while (splitIdx < sLines.length &&
                    (sLines[splitIdx].startsWith('> ') || sLines[splitIdx] === '>')) {
                    splitIdx++;
                }
                if (splitIdx < sLines.length && sLines[splitIdx].trim() === '') splitIdx++;
            }
        }

        const beforeMd = sLines.slice(0, splitIdx).join('\n');
        const afterMd  = sLines.slice(splitIdx).join('\n');

        return (
            <React.Fragment key={idx}>
                {beforeMd.trim() && RENDER_MD(beforeMd, lang)}
                <AudioBlockItem url={audio.url} name={audio.name} />
                {afterMd.trim() && RENDER_MD(afterMd, lang)}
            </React.Fragment>
        );
    };

    return (
        <div className="mb-6">
            {sections.map(renderSection)}
            {unindexed.map(a => <AudioBlockItem key={a.id} url={a.url} name={a.name} />)}
        </div>
    );
};
