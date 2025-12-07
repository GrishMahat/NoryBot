# Architecture Overview

This document explains the technical choices, project structure, and the history behind NoryBot. It is designed to help improved developers understand *why* things are the way they are.

## Project History & Philosophy

NoryBot's origins date back to 2023. It started as a fork of an abandoned project named "Clienter," which was originally written in  JavaScript.

The project has undergone multiple complete rewrites:
1.  **JavaScript**: The original codebase.
1.  **ES6 JavaScript**: Migrated for to ES6 features. 
2.  **TypeScript Migration**: Migrated for type safety and better developer experience.
3.  **Modern Architecture**: The current iteration, which focuses on reliability and structure over feature bloat.

**Why are some features missing?**
The original v1 had many more features, but the current version intentionally strips them back. The goal of NoryBot is to serve as a **solid, reliable starting point** for new developers. It provides the essential core features you need in a modern bot, leaving specific implementations (like complex economy systems) up to you. It aims to be simple enough to learn from, but robust enough to handle production workloads.

## Tech Stack Choices

### Runtime: [Bun](https://bun.sh/)
-   **Legacy**: The project was originally written for Node.js.
-   **Why Switch?**: I migrated to Bun for its incredible startup speed and built-in tooling. It handles TypeScript natively without complex build steps, making the development loop significantly faster and more enjoyable.

### Linter/Formatter: [Biome](https://biomejs.dev/)
-   **Legacy**: Previously used ESLint.
-   **Why Switch?**: Biome (formerly Rome) unifies linting and formatting into a single, extremely fast tool. It simplifies the dev environment and configuration.

### Framework: [Discord.js v14](https://discord.js.org/)
-   **Reason**: The  standard for JavaScript/TypeScript Discord bots. It provides full coverage of the Discord API and strong typing support.

### Database: [MongoDB](https://www.mongodb.com/) w/ [Mongoose](https://mongoosejs.com/)
-   **History**: Chosen because it was the database the author was most familiar with in 2023.
-   **Why not SQL?**: During the rewrites, migrating to PostgreSQL was considered. However, it was decided that a relational database was "overkill" for the typically document-oriented data structure of a general-purpose Discord bot. MongoDB offers the flexibility needed for storing varied guild configurations and user profiles without rigid schema migrations for every small change.

## Project Structure

The `src/` directory is organized to separate concerns effectively:

### Command Handling (`src/commands`)
Contains all slash command definitions. Commands are loaded dynamically.
-   We use a custom handler system to load these and register them with Discord.

### Component Handling (`src/components`)
**Unique Decision**: Unlike many bots that separate buttons, select menus, and modals into different folders, we have **unified** them into `src/components`.
-   **Why?**: Often, a feature (like a "Ticket System") needs a button *and* a modal. deeply nesting them by type (e.g., `buttons/tickets/`, `modals/tickets/`) spreads related code too thin. Unifying them makes it easier to manage features holistically.

### Events (`src/events`)
Contains event listeners for Discord events (e.g., `ready`, `interactionCreate`, `messageCreate`).
-   Each file represents one or more event listeners.

### Database (`src/database`)
Centralized location for all Mongoose models and database connection logic.
-   Keeps data access logic separate from business logic.

### Services (`src/services`)
Contains the core business logic.
-   **Pattern**: Commands should remain "thin". they should parse user input and call a Service to do the actual work. This makes code reusable and testable.

### Configuration (`src/config`)
Stores configuration constants, environment validation, and other static settings.

### Context Menus (`src/contextmenus`)
Handles "Right-Click" commands on Users or Messages. These are separated from chat input commands because their structure and interaction type are different.
