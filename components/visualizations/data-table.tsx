import { TableComponent } from '@/lib/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface DataTableProps {
  component: TableComponent;
}

export function DataTable({ component }: DataTableProps) {
  const data = component.data || [];
  const columns = component.columns || [];

  return (
    <div className="h-full flex flex-col p-4">
      <h3 className="text-sm font-medium text-foreground mb-3 px-1">{component.title}</h3>
      <div className="flex-1 min-h-0 overflow-auto">
        {data.length > 0 ? (
          <div className="rounded-lg border border-border/60 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  {columns.map((column) => (
                    <TableHead 
                      key={column} 
                      className="text-xs font-semibold text-muted-foreground h-9"
                    >
                      {column}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((row, index) => (
                  <TableRow key={index} className="hover:bg-muted/30">
                    {columns.map((column) => (
                      <TableCell 
                        key={column} 
                        className="text-sm py-2.5"
                      >
                        {row[column] !== undefined ? String(row[column]) : '-'}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
            No data available
          </div>
        )}
      </div>
    </div>
  );
}
