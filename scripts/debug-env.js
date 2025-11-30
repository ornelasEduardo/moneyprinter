require('dotenv').config({ path: '.env' });

const url = process.env.DATABASE_URL;
console.log('Loaded DATABASE_URL:', url ? 'Found' : 'Not Found');
if (url) {
  // Mask password for safety in logs
  const masked = url.replace(/:([^:@]+)@/, ':****@');
  console.log('Value:', masked);
}
