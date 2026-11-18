# Token Radar

A token launch radar that reads a sealed DeFiLlama protocol snapshot and ranks pre-token protocols by implied launch value. Built for the [make.fun token-radar-01 bounty](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01).

[![make.fun · token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/rudiuciha50/token-radar-01/rank.svg)](https://make.fun/bounty/token-radar-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![reward](https://make.fun/badge/token-radar-01/rudiuciha50/token-radar-01/reward.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)

## How it works

`main.ts` reads `/input/snapshot.json` (a frozen snapshot of 758 DeFiLlama protocols), scores each pre-token protocol using the model in `lib/model.ts`, and writes:

- `/output/board.json` — 200 ranked protocol rows
- `/output/data.js` — the dashboard's self-contained dataset
- `/output/dashboard/` — the web dashboard (static, no network)
- `/output/screenshots/` — 3 dashboard screenshots
- `/output/dossier.json` — the judge-ready dossier

## Scoring model (radar-2)

Each protocol is scored by a single function of the snapshot's own figures:

```
implied = round( TVL × base_multiple × growth_multiplier × maturity_multiplier × category_multiplier )
```

- **TVL base**: 25% of the protocol's TVL
- **Growth**: 7-day TVL change, clamped to [-60%, +120%], weighted at 0.5
- **Maturity**: Age since listed (0.6–1.0 over 1,095 days)
- **Category boost**: Lending/CDP ×1.30, DEX/Yield ×1.25, Bridge/Staking ×1.20, Derivatives ×1.15, Curator/RWA ×1.10, Stablecoin ×1.05, others ×1.00

No protocol name is hardcoded. Every row is scored by the same function.

## Dashboard

- Dark terminal-themed design
- Filterable and sortable board (search by name, category, chain; filter by category; sort by rank, TVL, growth, age)
- Pre-token and Live token tabs
- Detail drawer per protocol with model breakdown and 6-step farm plan
- No network dependencies — all data is embedded in `data.js`

## Quick start

```bash
# Copy snapshot (for local testing)
mkdir -p input
cp /path/to/snapshot.json input/

# Run
mkdir -p out
MAKEFUN_OUTPUT_DIR=out npx tsx main.ts --input input/snapshot.json

# View dashboard
open out/dashboard/index.html
```

## Requirements

- Node.js 22.18+ (runs TypeScript directly)
- Standard library only — zero dependencies
- A browser for taking screenshots

## License

MIT — see [LICENSE](LICENSE)