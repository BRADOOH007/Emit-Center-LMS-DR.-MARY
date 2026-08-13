export function stripLatex(text: string): string {
  if (!text) return text;

  return text
    .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '$1/$2')
    .replace(/\\underline\s*\{[^}]*\}/g, '_______')
    .replace(/\\underline\b/g, '_______')
    .replace(/\\qquad|\\quad/g, '   ')
    .replace(/\\,|\\;|\\:/g, ' ')
    .replace(/\\!/g, '')
    .replace(/\\text(?:bf|it|rm|sf|tt|up)\{([^}]+)\}/g, '$1')
    .replace(/\\text\{([^}]+)\}/g, '$1')
    .replace(/\\mathbf\{([^}]+)\}/g, '$1')
    .replace(/\\mathrm\{([^}]+)\}/g, '$1')
    .replace(/\\boldsymbol\{([^}]+)\}/g, '$1')
    .replace(/\\sqrt\{([^}]+)\}/g, '√($1)')
    .replace(/\\sqrt\b/g, '√')
    .replace(/\^\{([^}]+)\}/g, '^$1')
    .replace(/_\{([^}]+)\}/g, '_$1')
    .replace(/\\times/g, '×')
    .replace(/\\div/g, '÷')
    .replace(/\\pm/g, '±')
    .replace(/\\leq/g, '≤')
    .replace(/\\geq/g, '≥')
    .replace(/\\neq/g, '≠')
    .replace(/\\approx/g, '≈')
    .replace(/\\infty/g, '∞')
    .replace(/\\pi/g, 'π')
    .replace(/\\alpha/g, 'α')
    .replace(/\\beta/g, 'β')
    .replace(/\\theta/g, 'θ')
    .replace(/\\Delta/g, 'Δ')
    .replace(/\\cdot/g, '·')
    .replace(/\\%/g, '%')
    .replace(/\\begin\{[^}]+\}/g, '')
    .replace(/\\end\{[^}]+\}/g, '')
    .replace(/\\\[|\\\]/g, '')
    .replace(/\\\(|\\\)/g, '')
    .replace(/\$\$[\s\S]*?\$\$/g, (m) => m.slice(2, -2).trim())
    .replace(/\$([^$]+)\$/g, '$1')
    .replace(/\\([a-zA-Z]+)\b/g, '$1')
    .replace(/\{([^{}]*)\}/g, '$1')
    .replace(/\{([^{}]*)\}/g, '$1')
    .replace(/[{}]/g, '')
    .replace(/  +/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function cleanAIText(text: string): string {
  if (!text) return text;

  let cleaned = stripLatex(text);

  return cleaned
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '$1')
    .replace(/(?<!_)_(?!_)(.+?)(?<!_)_(?!_)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^[-*_]{3,}\s*$/gm, '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^>\s+/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
