# Build Environment Note

## Current Status

The project source is ready for a production build. The rebrand from Textor to Crow has been completed and all source changes are committed to `main`.

## Environment Blocker

In this Termux/Android workspace, `npm install` hangs indefinitely (observed with both default flags and `--ignore-scripts`). The existing `node_modules/` directory was created by an interrupted install and is incomplete — for example, `node_modules/next/index.d.ts` is missing and `node_modules/.bin/` is empty. Because of this, the following cannot currently be run to completion in this environment:

- `npm run build`
- `npm run typecheck`
- `npm run test`

## Recommended Resolution

Run the build on a machine with a working npm/Node.js environment:

```bash
npm install --legacy-peer-deps
npm run build
```

The project targets Node.js ≥ 20.19 and Next.js 15. All source-level prerequisites for the build are satisfied.
