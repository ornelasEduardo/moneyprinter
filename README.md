# 🖨️ MoneyPrinter

**MoneyPrinter** is a local-first, privacy-focused personal finance dashboard designed to give you complete control over your financial data. Built with a neubrutalist design philosophy and a focus on functionality and simplicity.

![MoneyPrinter Dashboard](https://via.placeholder.com/800x400?text=MoneyPrinter+Dashboard+Preview)

## ✨ Features

-   **📊 Comprehensive Dashboard**: Real-time view of your Net Worth, Monthly Spending, and Budget status.
-   **🔮 Financial Projections**: Project your net worth growth based on current spending, income, and windfalls.
-   **🎯 Goal Tracking**: Track progress towards your Primary Goal and Emergency Fund.
-   **💰 Transaction Management**: Log and categorize income and expenses.
-   **🏦 Account Management**: Track balances across multiple accounts (Checking, Savings, Investments).
-   **🎨 Dynamic Theming**: Switch between themes like "Latverian Day" (Light) and "Latverian Night" (Dark).
-   **🔒 Local-First & Private**: Your data lives in a local Dockerized Postgres database. No external cloud dependencies.

## 🛠️ Tech Stack

-   **Framework**: [Next.js 15](https://nextjs.org/) (App Router)
-   **Language**: [TypeScript](https://www.typescriptlang.org/)
-   **Database**: [PostgreSQL](https://www.postgresql.org/) (via Docker)
-   **ORM**: [Prisma](https://www.prisma.io/)
-   **Migrations**: [Atlas](https://atlasgo.io/)
-   **Styling**: Vanilla CSS Variables + [Styled Components](https://emotion.sh/)
-   **Testing**: [Vitest](https://vitest.dev/) + React Testing Library

## 🚀 Getting Started

### Prerequisites

-   **Node.js** (v18+)
-   **Docker** & **Docker Compose** (for the database)

### Quick Start (Recommended)

We provide a helper script to spin up the database, run migrations, and start the app in one go:

```bash
# 1. Install dependencies
npm install

# 2. Start the development environment (Docker + Next.js)
./scripts/dev.sh
```

The app will be available at [http://localhost:3000](http://localhost:3000).

### Manual Setup

If you prefer running steps manually:

1.  **Start the Database**:
    ```bash
    docker-compose up -d
    ```

2.  **Initialize the Database Schema**:
    ```bash
    node scripts/init-db.js
    ```

3.  **Run the Development Server**:
    ```bash
    npm run dev
    ```

## 🧪 Testing

We use **Vitest** for unit and integration testing.

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch
```

## 🗄️ Database Management

Database schema changes are managed using **Atlas** and **Prisma**.

-   **Schema Definition**: `src/lib/schema.sql` (Source of Truth)
-   **Migrations**: Located in `migrations/` directory.

To apply migrations manually (if not using `dev.sh`):

```bash
# Using Atlas CLI (if installed) or via the docker container
docker-compose run atlas migrate apply --env docker
```

## 🎨 Design System

MoneyPrinter features a custom-built Design System located in `src/components/DesignSystem`. It prioritizes:
-   **Responsiveness**: Fluid layouts for laptops and ultra-wide monitors.
-   **Interaction**: Subtle, modifier-based hover states (brightness, opacity) rather than abrupt color swaps.
-   **Accessibility**: Semantic HTML and keyboard navigation support.

## 🤝 Contributing

1.  Fork the repository.
2.  Create a feature branch (`git checkout -b feature/amazing-feature`).
3.  Commit your changes (`git commit -m 'Add some amazing feature'`).
4.  Push to the branch (`git push origin feature/amazing-feature`).
5.  Open a Pull Request.

## 📄 License

This project is licensed under the MIT License
