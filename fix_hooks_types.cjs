const fs = require('fs');
let content = fs.readFileSync('hooks/useDataPersistence.ts', 'utf8');

content = content.replace(
  /if \(cloudData && \(cloudData\.clients\?\.length > 0 \|\| cloudData\.products\?\.length > 0 \|\| cloudData\.users\?\.length > 0\)\)/g,
  'if (cloudData && ((cloudData.clients?.length ?? 0) > 0 || (cloudData.products?.length ?? 0) > 0 || (cloudData.users?.length ?? 0) > 0))'
);

fs.writeFileSync('hooks/useDataPersistence.ts', content);
