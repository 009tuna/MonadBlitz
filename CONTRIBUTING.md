# Contributing to MonadBlitz

This repository is a Monad-focused Scaffold-ETH 2 starter. Contributions should
stay practical, easy to review, and scoped to a clear outcome.

## Before you start

- Read [README.md](README.md) for project context.
- Use [INSTALL.md](INSTALL.md) to get a local environment running.
- Keep changes focused. Do not mix unrelated refactors with feature work.

## Typical contribution areas

- Smart contract changes in `packages/foundry`
- Frontend work in `packages/nextjs`
- Documentation and onboarding improvements
- Developer experience fixes for scripts, setup, and tooling

## Development workflow

1. Create a branch for your work.
2. Make the smallest reasonable change that solves the problem.
3. Run the relevant checks locally.
4. Open a pull request with a clear description.

## Recommended checks

Run what matches your change:

```bash
yarn lint
yarn format
yarn test
yarn next:build
```

## Pull request guidelines

- Explain what changed and why.
- Include screenshots for UI changes when useful.
- Mention any env, network, or deployment assumptions.
- Note any follow-up work that is intentionally out of scope.

## Smart contract changes

If you touch Solidity code:

- keep deployment scripts in sync
- verify the frontend contract usage still matches the ABI
- avoid committing secrets or private keys

## Documentation changes

If you change setup steps, scripts, or network config, update the relevant docs
in the same PR.
