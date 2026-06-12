const fs = require('fs');

let existingUrl = '';
let existingKey = '';
let existingPassword = 'admin123';

try {
  const existing = fs.readFileSync('supabase-config.js', 'utf-8');
  const urlMatch = existing.match(/SUPABASE_URL\s*=\s*'([^']+)'/);
  const keyMatch = existing.match(/SUPABASE_ANON_KEY\s*=\s*'([^']+)'/);
  const passMatch = existing.match(/ADMIN_PASSWORD\s*=\s*'([^']+)'/);
  if (urlMatch) existingUrl = urlMatch[1];
  if (keyMatch) existingKey = keyMatch[1];
  if (passMatch) existingPassword = passMatch[1];
} catch (e) {}

const SUPABASE_URL = (process.env.VITE_SUPABASE_URL || existingUrl);
const SUPABASE_ANON_KEY = (process.env.VITE_SUPABASE_ANON_KEY || existingKey);
const ADMIN_PASSWORD = (process.env.ADMIN_PASSWORD || existingPassword);

const config = `// Gerado automaticamente pelo build do Vercel
window.SUPABASE_URL = '${SUPABASE_URL}';
window.SUPABASE_ANON_KEY = '${SUPABASE_ANON_KEY}';
window.ADMIN_PASSWORD = '${ADMIN_PASSWORD}';
`;

fs.writeFileSync('supabase-config.js', config);
console.log('supabase-config.js gerado. SUPABASE_URL definido:', !!SUPABASE_URL);
