import fs from 'node:fs';
import path from 'node:path';

const schemaPath = path.resolve(__dirname, '..', '..', 'prisma', 'schema.prisma');

describe('CRMS v3 schema contract', () => {
  const prismaSchema = fs.readFileSync(schemaPath, 'utf8');

  it('models local accounts and MySQL photo storage', () => {
    expect(prismaSchema).toContain('model users');
    expect(prismaSchema).toContain('model daily_activity_photos');
    expect(prismaSchema).toContain('model grievance_photos');
    expect(prismaSchema).toContain('photo_data    Bytes            @db.MediumBlob');
  });

  it('models user-managed sharepoint_links and excludes automatic graph sync fields', () => {
    expect(prismaSchema).not.toMatch(/proposal_file|assessment_file|supporting_files|sync_log/i);
    expect(prismaSchema).toContain('sharepoint_links    Json?');
    expect(prismaSchema).toContain('model export_logs');
  });

  it('keeps the LRP contract with program, year, and sharepoint_links', () => {
    const lrpModel = prismaSchema.match(/model lrp \{[\s\S]*?\n\}/)?.[0] ?? '';
    expect(lrpModel).toContain('program');
    expect(lrpModel).toContain('year');
    expect(lrpModel).toContain('sharepoint_links');
  });
});
