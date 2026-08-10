import React from 'react';
import { render, screen } from '@testing-library/react';
import { DataTable, ColumnDef } from './DataTable';
import { describe, it, expect } from 'vitest';

describe('DataTable', () => {
  it('renders data and columns correctly', () => {
    const data = [{ id: 1, name: 'Task 1' }];
    const columns: ColumnDef<any>[] = [
      { header: 'ID', accessor: 'id' },
      { header: 'Name', accessor: 'name' }
    ];

    render(<DataTable data={data} columns={columns} />);
    
    expect(screen.getByText('Task 1')).toBeInTheDocument();
    expect(screen.getByText('ID')).toBeInTheDocument();
    expect(screen.getByText('Name')).toBeInTheDocument();
  });
});
