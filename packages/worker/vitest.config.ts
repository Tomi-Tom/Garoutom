import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Les lignes du journal (`src/journal.ts`) sont attendues dans ces tests :
    // les échecs, les retards, les sockets muettes y sont provoqués exprès.
    onConsoleLog: (ligne) => (ligne.startsWith('{"niveau"') ? false : undefined),
  },
});
