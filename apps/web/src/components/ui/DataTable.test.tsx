import React from 'react';
import { renderToString } from 'react-dom/server';
import { DataTable, ColumnDef } from './DataTable';
import { describe, it, expect } from 'vitest';

describe('DataTable', () => {
  it('renders data and columns correctly', () => {
    const data = [{ id: 1, name: 'Task 1' }];
    const columns: ColumnDef<any>[] = [
      { header: 'ID', accessor: 'id' },
      { header: 'Name', accessor: 'name' }
    ];

    const html = renderToString(<DataTable data={data} columns={columns} />);
    
    expect(html).toContain('Task 1');
    expect(html).toContain('ID');
    expect(html).toContain('Name');
  });
});

