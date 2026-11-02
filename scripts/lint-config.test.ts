// @vitest-environment node

import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';

describe('compatibilité de la configuration ESLint', () => {
  it('conserve les exclusions du build et des dépendances', async () => {
    const eslint = new ESLint();
    for (const file of [
      '.next/server/app/page.js',
      'node_modules/example/index.js',
      'out/index.js',
      'build/nested/index.js',
      'next-env.d.ts',
    ]) {
      expect(await eslint.isPathIgnored(file), file).toBe(true);
    }
    for (const file of ['app/page.tsx', 'components/HeaderAuthButton.tsx', 'lib/roles.ts']) {
      expect(await eslint.isPathIgnored(file), file).toBe(false);
    }
  });

  it('conserve les diagnostics Next.js et accessibilité sur les fichiers TSX', async () => {
    const [result] = await new ESLint().lintText(
      'export default function Probe() { return <img src="/demo.png" />; }',
      { filePath: 'components/LintProbe.tsx' },
    );
    const rules = result.messages.map((message) => message.ruleId);
    expect(rules).toContain('@next/next/no-img-element');
    expect(rules).toContain('jsx-a11y/alt-text');
    expect(result.fatalErrorCount).toBe(0);
  });

  it('conserve les exceptions par motif des règles React', async () => {
    const eslint = new ESLint({
      overrideConfig: {
        rules: { 'react/jsx-pascal-case': ['error', { ignore: ['Ignored*'] }] },
      },
    });
    const [result] = await eslint.lintText(
      'export default function Probe() { return <><Ignored_component /><Other_component /></>; }',
      { filePath: 'components/LintProbe.tsx' },
    );
    const messages = result.messages.filter((message) => message.ruleId === 'react/jsx-pascal-case');
    expect(messages).toHaveLength(1);
    expect(messages[0].message).toContain('Other_component');
    expect(result.fatalErrorCount).toBe(0);
  });

  it('conserve les restrictions d’import utilisant la conversion des motifs en expressions régulières', async () => {
    const eslint = new ESLint({
      overrideConfig: {
        rules: { 'import/no-internal-modules': ['error', { forbid: ['internal/**'] }] },
      },
    });
    const [result] = await eslint.lintText(
      'import value from "internal/private"; export default value;',
      { filePath: 'components/LintProbe.tsx' },
    );
    expect(result.messages.some((message) => message.ruleId === 'import/no-internal-modules')).toBe(true);
    expect(result.fatalErrorCount).toBe(0);
  });

  it('conserve la détection des contrôles personnalisés sans libellé accessible', async () => {
    const eslint = new ESLint({
      overrideConfig: {
        rules: {
          'jsx-a11y/control-has-associated-label': ['error', {
            controlComponents: ['ControlSave'],
          }],
        },
      },
    });
    const [result] = await eslint.lintText(
      'export default function Probe() { return <><ControlSave /><ControlSave aria-label="Enregistrer" /></>; }',
      { filePath: 'components/LintProbe.tsx' },
    );
    const messages = result.messages.filter((message) => message.ruleId === 'jsx-a11y/control-has-associated-label');
    expect(messages).toHaveLength(1);
    expect(result.fatalErrorCount).toBe(0);
  });
});
