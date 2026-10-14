interface ChartTableProps {
  caption: string;
  columns: string[];
  rows: (string | number)[][];
}

export function ChartTable({ caption, columns, rows }: ChartTableProps) {
  return (
    <details className="mt-3 text-sm">
      <summary className="cursor-pointer text-xs font-medium text-muted-foreground hover:text-foreground">
        Als Tabelle anzeigen
      </summary>
      <div className="overflow-x-auto">
        <table className="mt-2 w-full text-left text-xs">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr>
              {columns.map((column, index) => (
                <th key={column} scope="col" className={`py-1 font-medium text-muted-foreground ${index > 0 ? "text-right" : ""}`}>
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex} className={`py-1 ${cellIndex > 0 ? "tabular-nums text-right" : ""}`}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
