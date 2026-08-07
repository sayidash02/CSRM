import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DataTable, ColumnDef } from './DataTable';
import { describe, it, expect, vi } from 'vitest';

describe('DataTable', () => {
  it('renders a quick add row if onAdd is provided', () => {
    const data = [{ id: 1, name: 'Task 1' }];
    const columns: ColumnDef<any>[] = [
      { header: 'ID', accessor: 'id' },
      { header: 'Name', accessor: 'name', editable: true, inputType: 'text' }
    ];

    render(<DataTable data={data} columns={columns} onAdd={async () => {}} />);
    
    // Quick Add row should render inputs
    const inputs = screen.getAllByRole('textbox');
    expect(inputs.length).toBeGreaterThan(0);
  });

  it('submits quick add on enter and retains focus', async () => {
    const user = userEvent.setup();
    const handleAdd = vi.fn().mockResolvedValue(undefined);
    const data: any[] = [];
    const columns: ColumnDef<any>[] = [
      { header: 'Name', accessor: 'name', editable: true, inputType: 'text' }
    ];

    render(<DataTable data={data} columns={columns} onAdd={handleAdd} />);
    
    const input = screen.getByRole('textbox');
    await user.type(input, 'New Task{Enter}');
    
    expect(handleAdd).toHaveBeenCalledWith({ name: 'New Task' });
    expect(input).toHaveValue('');
    expect(input).toHaveFocus();
  });

  it('enters edit mode on double click', async () => {
    const user = userEvent.setup();
    const data = [{ id: 1, name: 'Task 1' }];
    const columns: ColumnDef<any>[] = [
      { header: 'ID', accessor: 'id' },
      { header: 'Name', accessor: 'name', editable: true, inputType: 'text' }
    ];

    render(<DataTable data={data} columns={columns} onUpdate={async () => {}} />);
    
    const cell = screen.getByText('Task 1');
    await user.dblClick(cell);
    
    const input = screen.getByDisplayValue('Task 1');
    expect(input).toBeInTheDocument();
  });

  it('submits update on enter and escapes on esc', async () => {
    const user = userEvent.setup();
    const handleUpdate = vi.fn().mockResolvedValue(undefined);
    const data = [{ id: 1, name: 'Task 1' }];
    const columns: ColumnDef<any>[] = [
      { header: 'ID', accessor: 'id' },
      { header: 'Name', accessor: 'name', editable: true, inputType: 'text' }
    ];

    render(<DataTable data={data} columns={columns} onUpdate={handleUpdate} />);
    
    // Test Escape
    await user.dblClick(screen.getByText('Task 1'));
    let input = screen.getByDisplayValue('Task 1');
    await user.type(input, ' Updated{Escape}');
    expect(screen.getByText('Task 1')).toBeInTheDocument();
    
    // Test Enter
    await user.dblClick(screen.getByText('Task 1'));
    input = screen.getByDisplayValue('Task 1');
    await user.type(input, ' Updated{Enter}');
    expect(handleUpdate).toHaveBeenCalledWith(1, { name: 'Task 1 Updated' });
  });
});


