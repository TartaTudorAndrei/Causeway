const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Determine port to check (support .env override, default 5432)
let pgPort = process.env.PGPORT_HOST || process.env.PGPORT || '5432';
try {
  const envPath = path.join(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
    for (const line of lines) {
      const match = line.match(/^\s*(PGPORT_HOST|PGPORT)\s*=\s*(.+)$/);
      if (match) {
        pgPort = match[2].trim().replace(/^["']|["']$/g, '');
        break;
      }
    }
  }
} catch {
  // Ignore env read error, keep default
}

// 1. Check if PostgreSQL already running on port
try {
  const isWin = process.platform === 'win32';
  if (isWin) {
    const netstat = execSync(`netstat -ano | findstr :${pgPort}`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
    if (netstat && netstat.includes('LISTENING')) {
      console.log(`PostgreSQL is already running on port ${pgPort}.`);
      process.exit(0);
    }
  }
} catch {
  // Not running, proceed to start
}

// 2. Start PostgreSQL via Docker Compose if docker is available
const isWin = process.platform === 'win32';
let dockerAvailable = false;
try {
  execSync(isWin ? 'where docker' : 'which docker', { stdio: 'ignore' });
  dockerAvailable = true;
} catch {
  dockerAvailable = false;
}

if (dockerAvailable) {
  console.log('Attempting to start PostgreSQL database via Docker Compose...');
  try {
    execSync('docker compose up -d db', { stdio: 'inherit' });
    console.log('Database container started or already running.');
  } catch {
    console.warn('Warning: Could not start PostgreSQL via Docker Compose. Ensure Docker is running.');
  }
} else {
  console.log('Docker not detected on host. Backend will start using in-memory H2 database.');
}

