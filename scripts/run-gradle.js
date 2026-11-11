const { spawn } = require('child_process');
const path = require('path');
const os = require('os');
const fs = require('fs');

const args = process.argv.slice(2);
const isWin = os.platform() === 'win32';
const cmd = isWin ? 'gradlew.bat' : './gradlew';

// Load variables from .env files if they exist
const envPaths = [
  path.join(__dirname, '..', '.env'),
  path.join(__dirname, '..', 'backend', '.env')
];
const customEnv = { ...process.env };

for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    const relPath = path.relative(path.join(__dirname, '..'), envPath);
    console.log(`Loading environment variables from ${relPath}`);
    try {
      const content = fs.readFileSync(envPath, 'utf8');
      content.split(/\r?\n/).forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const eqIdx = trimmed.indexOf('=');
          if (eqIdx !== -1) {
            const key = trimmed.slice(0, eqIdx).trim();
            const val = trimmed.slice(eqIdx + 1).trim();
            // Remove optional surrounding quotes
            const cleanedVal = val.replace(/^["']|["']$/g, '');
            customEnv[key] = cleanedVal;
          }
        }
      });
    } catch (err) {
      console.error(`Error loading env from ${envPath}:`, err);
    }
  }
}

// Parse DATABASE_URL into discrete PG* env vars for Spring application.properties
if (customEnv.DATABASE_URL) {
  try {
    const dbUrl = new URL(customEnv.DATABASE_URL.replace('postgresql://', 'http://'));
    if (dbUrl.hostname) customEnv.PGHOST = dbUrl.hostname;
    if (dbUrl.port) customEnv.PGPORT = dbUrl.port;
    if (dbUrl.pathname && dbUrl.pathname.length > 1) customEnv.PGDATABASE = dbUrl.pathname.slice(1);
    if (dbUrl.username) customEnv.PGUSER = decodeURIComponent(dbUrl.username);
    if (dbUrl.password) customEnv.PGPASSWORD = decodeURIComponent(dbUrl.password);
    const sslmode = dbUrl.searchParams.get('sslmode');
    if (sslmode) customEnv.PGSSLMODE = sslmode;
  } catch (err) {
    console.error('Error parsing DATABASE_URL:', err.message);
  }
}

// Free port if running bootRun
if (args.includes('bootRun')) {
  try {
    if (isWin) {
      const portOutput = require('child_process').execSync('netstat -ano | findstr :8080', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
      const pids = new Set();
      portOutput.split(/\r?\n/).forEach(line => {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 5 && parts[1].endsWith(':8080')) {
          const pid = parts[parts.length - 1];
          if (pid && pid !== '0' && pid !== `${process.pid}`) {
            pids.add(pid);
          }
        }
      });
      for (const pid of pids) {
        console.log(`Port 8080 in use by PID ${pid}. Terminating process...`);
        try {
          require('child_process').execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' });
        } catch {}
      }
    }
  } catch {
    // Port not in use, continue
  }
}

console.log(`Running Gradle: ${cmd} ${args.join(' ')}`);

const proc = spawn(cmd, args, {
  cwd: path.join(__dirname, '..', 'backend'),
  stdio: 'inherit',
  shell: true,
  env: customEnv
});

function killProcessTree() {
  if (!proc || !proc.pid) return;
  if (isWin) {
    try {
      require('child_process').execSync(`taskkill /F /T /PID ${proc.pid}`, { stdio: 'ignore' });
    } catch {}
  } else {
    try {
      proc.kill('SIGTERM');
    } catch {}
  }
}

process.on('SIGINT', () => {
  killProcessTree();
  process.exit(0);
});

process.on('SIGTERM', () => {
  killProcessTree();
  process.exit(0);
});

process.on('exit', () => {
  killProcessTree();
});

proc.on('close', (code) => {
  process.exit(code || 0);
});


