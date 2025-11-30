---
description: How to set up and use Atlas for database migrations
---

1. **Install Atlas** (Optional if using Docker):
   If you want to run atlas locally, you can install it:
   ```bash
   curl -sSf https://atlasgo.sh | sh
   ```

2. **Automatic Migrations with Docker**:
   The `docker-compose.yml` is configured to automatically apply pending migrations when you start the services.
   ```bash
   docker-compose up -d
   ```
   The `atlas` service waits for the database to be healthy and then runs `migrate apply`.

3. **Running Atlas Commands via Docker**:
   We have a helper script `scripts/atlas.sh` that runs Atlas commands inside the Docker container.

   **Generate a new migration (diff):**
   ```bash
   ./scripts/atlas.sh migrate diff --env docker
   ```
   *Note: This compares `src/lib/schema.sql` with the current migration state.*

   **Apply migrations manually:**
   ```bash
   ./scripts/atlas.sh migrate apply --env docker
   ```

   **Check status:**
   ```bash
   ./scripts/atlas.sh migrate status --env docker
   ```

4. **Workflow for making schema changes**:
   - Edit `src/lib/schema.sql` with your desired changes.
   - Run `./scripts/atlas.sh migrate diff --env docker` to generate a new migration file.
   - Run `docker-compose up -d` (or the apply script) to apply changes.
