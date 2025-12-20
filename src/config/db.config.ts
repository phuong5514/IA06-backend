export function getDatabaseUrl(): string {
  return (
    process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/mydb'
  );
}

export function getDbConnectionOptions(): { connectionString: string } {
  return { connectionString: getDatabaseUrl() };
}
