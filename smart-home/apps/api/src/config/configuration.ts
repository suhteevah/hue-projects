export default () => ({
  port: parseInt(process.env.PORT || '3000', 10),
  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret-change-in-production-32ch',
    expiration: process.env.JWT_EXPIRATION || '24h',
  },
  database: {
    url: process.env.DATABASE_URL || 'file:./data/smarthome.db',
  },
});
