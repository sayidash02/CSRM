import fs from 'node:fs';
import path from 'node:path';

const schemaPath = path.resolve(process.cwd(), 'prisma', 'schema.prisma');
const sqlPath = path.resolve(process.cwd(), '..', '..', 'schema.sql');

describe('CRMS v3 schema contract', () => {
  const prismaSchema = fs.readFileSync(schemaPath, 'utf8');
  const sqlSchema = fs.readFileSync(sqlPath, 'utf8');

  it('models local accounts and MySQL photo storage', () => {
    expect(prismaSchema).toContain('model users');
    expect(prismaSchema).toContain('model daily_activity_photos');
    expect(prismaSchema).toContain('photo_data    Bytes            @db.MediumBlob');
    expect(sqlSchema).toContain('CREATE TABLE `users`');
    expect(sqlSchema).toContain('CREATE TABLE `daily_activity_photos`');
    expect(sqlSchema).toContain('`photo_data` MEDIUMBLOB NOT NULL');
  });

  it('does not expose SharePoint link or automatic sync fields', () => {
    for (const schema of [prismaSchema, sqlSchema]) {
      expect(schema).not.toMatch(/sharepoint_link|document_link|proposal_file|assessment_file|supporting_files|sync_log/i);
    }
    expect(prismaSchema).toContain('model export_logs');
    expect(sqlSchema).toContain('CREATE TABLE `export_logs`');
  });

  it('keeps the LRP contract limited to program and year', () => {
    const lrpModel = prismaSchema.match(/model lrp \{[\s\S]*?\n\}/)?.[0] ?? '';
    expect(lrpModel).toContain('program');
    expect(lrpModel).toContain('year');
    expect(lrpModel).not.toMatch(/sharepoint|document|link/i);
  });
});
