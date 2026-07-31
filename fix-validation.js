const fs = require('fs');
const path = require('path');

const controllersDir = path.join(__dirname, 'apps/api/src/controllers');

const controllers = fs.readdirSync(controllersDir);
controllers.forEach(file => {
  if (!file.endsWith('.ts')) return;
  const filePath = path.join(controllersDir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // Fix error handling to return 400 for Prisma Validation Errors
  content = content.replace(/console\.error\(error\);\s*res\.status\(500\)\.json\(\{ error: 'Internal server error' \}\);/g, 
    `console.error(error);
    if (error && (error as any).name === 'PrismaClientValidationError') {
      res.status(400).json({ error: 'Validation error: invalid data type or missing field' });
      return;
    }
    res.status(500).json({ error: 'Internal server error' });`);

  fs.writeFileSync(filePath, content);
});
console.log("Done");
