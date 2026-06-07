const fs = require('fs');
const path = require('path');

let target = process.argv[2];
if (target === 'postgres') {
  target = 'postgresql';
}

if (target !== 'sqlite' && target !== 'mysql' && target !== 'postgresql') {
  console.error('Usage: node switch-db.js [sqlite|mysql|postgresql]');
  process.exit(1);
}

const schemaPath = path.join(__dirname, 'prisma/schema.prisma');
if (!fs.existsSync(schemaPath)) {
  console.error(`Schema file not found at ${schemaPath}`);
  process.exit(1);
}

let schema = fs.readFileSync(schemaPath, 'utf8');

if (target === 'sqlite') {
  schema = schema.replace(/provider\s*=\s*"(mysql|postgresql)"/g, 'provider = "sqlite"');
  schema = schema.replace(/url\s*=\s*env\("DATABASE_URL"\)/g, 'url = "file:../algosphere.db"');
} else {
  schema = schema.replace(/provider\s*=\s*"(sqlite|mysql|postgresql)"/g, `provider = "${target}"`);
  schema = schema.replace(/url\s*=\s*"file:\.\.\/algosphere\.db"/g, 'url = env("DATABASE_URL")');
}

fs.writeFileSync(schemaPath, schema, 'utf8');
console.log(`Successfully switched schema.prisma to ${target}.`);

