env "local" {
  # The source of the schema.
  src = "file://src/lib/schema.sql"

  # The URL of the database to manage.
  url = "postgres://postgres:password@localhost:5433/moneyprinter?sslmode=disable"

  # Dev database for calculating diffs.
  dev = "docker://postgres/15-alpine/dev"

  migration {
    dir = "file://migrations"
  }
}

env "docker" {
  # The source of the schema.
  src = "file://src/lib/schema.sql"

  # The URL of the database to manage (internal docker network).
  url = "postgres://postgres:password@db:5432/moneyprinter?sslmode=disable"

  # Dev database for calculating diffs.
  dev = "postgres://postgres:password@atlas-shadow-db:5432/moneyprinter?sslmode=disable"

  migration {
    dir = "file://migrations"
  }
}
