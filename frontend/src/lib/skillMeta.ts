export interface SkillMetaItem {
  iconName: string;
  color: string;
  category: string;
  description: string;
}

export const SKILL_META: Record<string, SkillMetaItem> = {
  React: {
    iconName: 'code',
    color: '#61DAFB',
    category: 'Frontend',
    description: 'UI Library for building interactive user interfaces',
  },
  TypeScript: {
    iconName: 'file-code',
    color: '#3178C6',
    category: 'Languages',
    description: 'Typed superset of JavaScript for large-scale applications',
  },
  'Next.js': {
    iconName: 'globe',
    color: '#000000',
    category: 'Frontend',
    description: 'React framework for server-rendered web applications',
  },
  Python: {
    iconName: 'terminal',
    color: '#3776AB',
    category: 'Backend / AI',
    description: 'High-level programming language for AI, data, and web backends',
  },
  'System Design': {
    iconName: 'cpu',
    color: '#7C3AED',
    category: 'Architecture',
    description: 'Designing scalable, resilient software architectures',
  },
};
