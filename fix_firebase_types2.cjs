const fs = require('fs');
let content = fs.readFileSync('services/firebaseService.ts', 'utf8');

const lines = content.split('\n');

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('callback({ users: snap.docs.map(d => d.data()) });')) {
    lines[i] = lines[i].replace('d.data()', 'd.data() as AppUser');
  } else if (lines[i].includes('callback({ clients: snap.docs.map(d => d.data()) });')) {
    lines[i] = lines[i].replace('d.data()', 'd.data() as EnrichedClient');
  }
}

fs.writeFileSync('services/firebaseService.ts', lines.join('\n'));
