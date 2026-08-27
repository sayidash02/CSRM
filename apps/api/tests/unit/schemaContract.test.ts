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

  it('models user-managed sharepoint_links and excludes automatic graph sync fields', () => {
    for (const schema of [prismaSchema, sqlSchema]) {
      expect(schema).not.toMatch(/proposal_file|assessment_file|supporting_files|sync_log/i);
    }
    expect(prismaSchema).toContain('sharepoint_links    Json?');
    expect(sqlSchema).toContain('`sharepoint_links` JSON DEFAULT NULL');
    expect(prismaSchema).toContain('model export_logs');
    expect(sqlSchema).toContain('CREATE TABLE `export_logs`');
  });

  it('keeps the LRP contract with program, year, and sharepoint_links', () => {
    const lrpModel = prismaSchema.match(/model lrp \{[\s\S]*?\n\}/)?.[0] ?? '';
    expect(lrpModel).toContain('program');
    expect(lrpModel).toContain('year');
    expect(lrpModel).toContain('sharepoint_links');
  });
});
