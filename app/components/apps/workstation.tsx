'use client';

import { TerminalApp } from './terminal';

export type WorkstationTool = 'terminal' | 'projects' | 'git' | 'codex';

// Computer tools live behind this boundary. Phase 1 only provides Terminal.
export function WorkstationApp({ active }: { active: boolean }) {
  return (
    <section className="workstation-app" aria-label="工作台">
      <div className="workstation-tool-heading">TERMINAL</div>
      <TerminalApp active={active} />
    </section>
  );
}
