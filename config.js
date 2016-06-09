var connectionString = process.env.DATABASE_URL || 'postgres://localhost:5432/messenger';

module.exports = connectionString;