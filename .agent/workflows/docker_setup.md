---
description: How to set up the database using Docker
---
1. Start the database container:
   ```bash
   docker-compose up -d
   ```

2. Update your `.env.local` file with the Docker database credentials:
   ```
   DATABASE_URL=postgres://postgres:password@localhost:5432/moneyprinter
   ```

3. Initialize the database schema:
   ```bash
   node scripts/init-db.js
   ```

4. (Optional) Seed the database with initial data:
   ```bash
   node scripts/seed-networth.js
   ```

5. To stop the database:
   ```bash
   docker-compose down
   ```
