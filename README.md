# MonadBlitz

MonadBlitz is a Monad-oriented dApp starter built on top of Scaffold-ETH 2.
It keeps the fast local development workflow from SE-2 while giving this repo
its own project-level docs and contribution flow.

## Stack

- Frontend: Next.js 15, React 19, TypeScript
- Web3: Wagmi, Viem, RainbowKit, Scaffold-ETH hooks/components
- Contracts: Solidity + Foundry
- Styling: Tailwind CSS 4 + DaisyUI
- Package manager: Yarn 4 workspaces

## Repository Layout

- `packages/nextjs`: frontend application
- `packages/foundry`: smart contracts, tests, deploy scripts
- `.agents`: local project skills and agent guidance
- `AGENTS.md`: repository-specific instructions for coding agents

## Quick Start

See [INSTALL.md](INSTALL.md) for full setup.

```bash
yarn install
yarn chain
yarn deploy
yarn start
```

After startup:

- local chain runs on `http://127.0.0.1:8545`
- frontend runs on `http://localhost:3000`

## Common Commands

```bash
yarn chain
yarn deploy
yarn start
yarn test
yarn lint
yarn format
yarn next:build
yarn verify --network <network>
```

## Environment Files

This monorepo uses package-level env files:

- `packages/foundry/.env`
- `packages/nextjs/.env.local`

Use the example files in those folders as your starting point:

- `packages/foundry/.env.example`
- `packages/nextjs/.env.example`

## Developing for Monad

The current repo still uses the default local Foundry network configuration out
of the box. To target Monad testnet or mainnet, update both of these files:

- `packages/foundry/foundry.toml`
- `packages/nextjs/scaffold.config.ts`

At a minimum you should:

1. Add the Monad RPC endpoint to Foundry.
2. Add the target Monad chain configuration to the frontend.
3. Set the matching chain as the active target network.
4. Store RPC and wallet-related secrets in env files, not in code.

## Current Starter State

This repository still contains the default Scaffold-ETH starter contract and
homepage. The main places you will typically customize first are:

- `packages/foundry/contracts/YourContract.sol`
- `packages/foundry/script/DeployYourContract.s.sol`
- `packages/nextjs/app/page.tsx`

## Contributing

Project contribution guidance lives in [CONTRIBUTING.md](CONTRIBUTING.md).
