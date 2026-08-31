# Repository Guidelines

## Project Structure & Module Organization

This repository contains two independently installed packages. `client/` is the React 17/Webpack interface: application entry points live in `client/src/`, reusable UI in `client/src/components/`, blockchain access in `client/src/api/`, and static fonts, token icons, and the HTML shell in `client/assets/`. Generated or copied contract interfaces live in `client/abi/`.

`contracts/` is the Hardhat workspace. Keep Solidity sources in `contracts/contracts/`, deployment definitions in `contracts/deploy/`, TypeScript tests in `contracts/test/`, and operational scripts in `contracts/scripts/`. Contract ABI exports are written to `contracts/abi/` during compilation. Local-chain helper scripts and example configuration are under `env/`.

## Build, Test, and Development Commands

Run commands from the relevant package directory after installing dependencies with that package's checked-in lockfile.

- `cd client && yarn local` starts the HTTPS Webpack dev server on port 3100; use `yarn debug` for source maps.
- `cd client && yarn build` creates the production bundle in `client/dist/`.
- `cd contracts && yarn compile` compiles contracts and refreshes ABI exports.
- `cd contracts && yarn test` runs the Hardhat/Mocha contract tests.
- `cd contracts && yarn coverage` produces Solidity coverage; `yarn gas` runs tests with gas reporting.
- `cd contracts && yarn check` runs Hardhat checks before contract changes.

Do not run deployment commands (`deploy-dc`, `deploy-tweet`) unless the task explicitly requires a configured local chain or named network.

## Coding Style & Naming Conventions

Follow the local ESLint configurations. Client code uses Standard, React, and accessibility rules; use two-space indentation, semicolons only when the existing file uses them, PascalCase for components (`Layout.jsx`), and camelCase for helpers and variables.

Contracts and Hardhat code use TypeScript/Standard rules. Preserve the existing four-space Solidity indentation and Prettier Solidity settings (160-column width). Name contracts and deploy modules in PascalCase (`DCDeployer.sol`, `DCDeployer.ts`); keep test files lowercase and descriptive, such as `test/dc.ts`.

## Testing & Configuration

Add or update a focused Hardhat test whenever contract behavior changes. Test locally against Hardhat before relying on external networks. Copy, never commit, secrets from `client/.env.example` or `contracts/.env.example`; network URLs and mnemonics are environment-specific.

## Commit & Pull Request Guidelines

Recent history uses short imperative subjects, for example `fix repeated words` and `cleanup`. Keep commits small and scoped. In pull requests, explain the user-visible or contract-level change, list validation commands and results, link the issue when available, and include screenshots for client UI changes. Call out ABI, deployment, network, or environment-variable impacts explicitly.
