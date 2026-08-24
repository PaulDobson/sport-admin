/* eslint-disable import/no-anonymous-default-export */
import nextConfig from 'eslint-config-next';
import boundaries from 'eslint-plugin-boundaries';

export default [
  { ignores: ['src/presentation/styles/output.css'] },
  ...nextConfig,
  {
    plugins: {
      boundaries,
    },
    settings: {
      'boundaries/elements': [
        { type: 'domain', pattern: 'src/domain/*' },
        { type: 'application', pattern: 'src/application/*' },
        // capture the immediate subfolder name so rules can allow-list specific infrastructure modules.
        { type: 'infrastructure', pattern: 'src/infrastructure/(*)', capture: ['module'] },
        { type: 'presentation', pattern: 'src/presentation' },
        { type: 'presentation', pattern: 'src/presentation/*' },
        { type: 'presentation', pattern: 'src/app' },
        { type: 'presentation', pattern: 'src/app/*' },
        { type: 'presentation', pattern: 'src/proxy.ts' },
      ],
    },
    rules: {
      'boundaries/element-types': [
        'error',
        {
          default: 'disallow',
          rules: [
            { from: 'domain', allow: ['domain'] },
            { from: 'application', allow: ['domain', 'application'] },
            { from: 'infrastructure', allow: ['domain', 'application', 'infrastructure'] },
            // presentation may only wire the Supabase client factories (cookies() needs request context)
            // and the composition factories that build use-case dependencies; nothing else in infrastructure.
            {
              from: 'presentation',
              allow: ['domain', 'application', 'presentation', ['infrastructure', { module: ['supabase', 'composition'] }]],
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/domain/**/*.{js,mjs,ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', { patterns: ['**/src/application/**', '**/src/infrastructure/**', '**/src/presentation/**'] }],
    },
  },
  {
    files: ['src/application/**/*.{js,mjs,ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', { patterns: ['**/src/infrastructure/**', '**/src/presentation/**'] }],
    },
  },
  {
    files: ['src/presentation/**/*.{js,mjs,ts,tsx}', 'src/app/**/*.{js,mjs,ts,tsx}', 'src/proxy.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/src/infrastructure/**', '!**/src/infrastructure/supabase/**', '!**/src/infrastructure/composition/**'],
              message: 'Presentation may only import src/infrastructure/supabase (client factories) or src/infrastructure/composition (wired use-case factories); other infrastructure must be reached through those.',
            },
          ],
        },
      ],
    },
  },
];