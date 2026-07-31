const fs = require('fs');
const path = require('path');

const controllersDir = path.join(__dirname, 'apps/api/src/controllers');

const controllers = fs.readdirSync(controllersDir);
controllers.forEach(file => {
  if (!file.endsWith('.ts')) return;
  const filePath = path.join(controllersDir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // Fix findMany serialization
  content = content.replace(/const serialized = (\w+)\.map\([^;]+;\s*res\.status\(200\)\.json\(\{ data: serialized \}\);/m, 
    'res.status(200).json({ data: $1 });');

  // Fix create/update/delete serialization
  content = content.replace(/res\.status\((\d+)\)\.json\(\{ data: \{\s*\.\.\.result,\s*id:\s*result\.id[^}]+\}\s*\}\);/g, 
    'res.status($1).json({ data: result });');

  fs.writeFileSync(filePath, content);
});
console.log("Done");
