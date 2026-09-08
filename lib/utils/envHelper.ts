import fs from 'fs';
import path from 'path';

/**
 * Safely update or insert environment variables in .env.local
 */
export function updateLocalEnv(updates: Record<string, string>): void {
  try {
    const envPath = path.join(process.cwd(), '.env.local');
    let content = '';

    if (fs.existsSync(envPath)) {
      content = fs.readFileSync(envPath, 'utf8');
    }

    const lines = content.split(/\r?\n/);
    const updatedKeys = new Set<string>();

    const newLines = lines.map((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) {
        return line;
      }

      const match = line.match(/^([A-Za-z0-9_]+)=(.*)$/);
      if (match) {
        const key = match[1];
        if (key in updates) {
          updatedKeys.add(key);
          process.env[key] = updates[key];
          return `${key}=${updates[key]}`;
        }
      }
      return line;
    });

    // Add any remaining keys that weren't in the file
    for (const [key, val] of Object.entries(updates)) {
      if (!updatedKeys.has(key)) {
        newLines.push(`${key}=${val}`);
        process.env[key] = val;
      }
    }

    fs.writeFileSync(envPath, newLines.join('\n'), 'utf8');
  } catch (err) {
    console.error('Failed to update .env.local:', err);
  }
}
