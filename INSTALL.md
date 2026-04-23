# Installation

This guide covers local setup for MonadBlitz.

## Prerequisites

- Node.js `>=20.18.3`
- Yarn `4.x`
- Git
- Foundry

If Yarn is not available, enable Corepack first:

```bash
corepack enable
corepack prepare yarn@4.13.0 --activate
```

## 1. Install dependencies

```bash
yarn install
```

## 2. Create local env files

Copy the package examples before running the app:

```bash
cp packages/foundry/.env.example packages/foundry/.env
cp packages/nextjs/.env.example packages/nextjs/.env.local
```

On Windows PowerShell:

```powershell
Copy-Item packages/foundry/.env.example packages/foundry/.env
Copy-Item packages/nextjs/.env.example packages/nextjs/.env.local
```

## 3. Start local development

Run each command in a separate terminal:

```bash
yarn chain
yarn deploy
yarn start
```

Open `http://localhost:3000`.

## 4. Useful commands

```bash
yarn test
yarn lint
yarn format
yarn compile
yarn next:build
```

## 5. Deploying beyond local

For non-local networks, update:

- `packages/foundry/foundry.toml`
- `packages/nextjs/scaffold.config.ts`

Then provide the required RPC and wallet credentials in env files before using:

```bash
yarn deploy --network <network>
```

## Notes

- Contract ABIs and deployment data are generated into
  `packages/nextjs/contracts/deployedContracts.ts`.
- The repo currently starts from the default Scaffold-ETH example contract and
  frontend, so expect to replace those as the product takes shape.
