import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function NewTable({
  caption,
  tableHead,
  tableRows,
  styles,
}: {
  caption?: string;
  tableHead: string[];
  tableRows: Array<Array<string | React.ReactNode>>;
  styles?: React.CSSProperties;
}) {
  return (
    <div className="bg-white w-full">
      <div className="border-slate-300 border rounded-lg w-full" style={styles}>
        <Table className="w-full ">
          {caption && (
            <TableCaption className="border-t-[1px] py-1">
              {caption}
            </TableCaption>
          )}
          <TableHeader className="bg-slate-200 text-slate-600">
            <TableRow>
              {tableHead.map((header, index) => (
                <TableCell key={index} className="font-medium">
                  {header}
                </TableCell>
              ))}
            </TableRow>
          </TableHeader>

          <TableBody>
            {tableRows.map((row, rowIndex) => (
              <TableRow key={rowIndex}>
                {row.map((cell, cellIndex) => (
                  <TableCell key={cellIndex}>{cell}</TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
