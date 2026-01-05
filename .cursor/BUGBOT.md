# Review Guidelines

## Database migrations

- When reviewing database migrations, ensure that they are backwards compatible. Specifically:

  - New tables, and new nullable or default columns on existing tables are OK.

  - New indices on existing tables (not brand new ones) must be created with keyword CONCURRENTLY. The statement should be isolated to its own migration file to avoid a prisma transaction error. You should warn on index creation and flag it for careful review.

  - Removing foreign keys and constraints is OK

  - Adding foreign keys is NOT OK

  - Removing indices is OK

  - Dropping columns is NOT OK. Instead, you should mark it as deprecated in the schema, and add a `@map` that corresponds to the original column name. For example, to deprecate the `hostname` column, you can change `hostname String?` to `hostname_DEPRECATED String? @map("hostname")`.

  - Renaming columns in the database, changing column types, or changing default values are NOT OK.

    - Exception: It is OK to increase the size of a VARCHAR column.

    - Exception: It is OK to make a non-null column nullable.

  - Dropping tables is NOT OK

- Enforce good guidelines when creating new tables and columns:

  - Prefer BIGINTEGER and BIGSERIAL over INTEGER and SERIAL, unless if you are absolutely sure that it will remain small (O(teams) or lower cardinality)

  - Using foreign keys for new tables is NOT OK. Handle this in the application layer instead.

  - Using cascading deletes for new tables is NOT OK, since a single delete may require the database to do an unbounded amount of work. Handle this in the application layer instead.

  - Prefer TEXT over VARCHAR

- Migrations and their corresponding schema.prisma changes should be isolated to their own PR when possible. We do not want unnecessary code changes that may need to be reverted to be coupled with migrations that have already been applied to production.

## Queries

- All new queries to maindb MUST use an index. It is NOT OK for the query to potentially execute a full table scan.

- All new queries to maindb MUST NOT do a `GROUP BY` or `JOIN`. Handle this in the application layer instead.

- Avoid Prisma's `skip` or SQL `OFFSET/LIMIT` on large tables - use cursor-based pagination instead by ordering on an indexed column


