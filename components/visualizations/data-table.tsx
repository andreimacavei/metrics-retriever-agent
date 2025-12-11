import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">{component.title}</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length > 0 ? (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  {columns.map((column) => (
                    <TableHead key={column}>{column}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((row, index) => (
                  <TableRow key={index}>
                    {columns.map((column) => (
                      <TableCell key={column}>
                        {row[column] !== undefined ? String(row[column]) : '-'}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="h-[200px] flex items-center justify-center text-muted-foreground">
            No data available
          </div>
        )}
      </CardContent>
    </Card>
  );
}
