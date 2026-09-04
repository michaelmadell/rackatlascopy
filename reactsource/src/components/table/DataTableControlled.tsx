import { type Table, flexRender } from '@tanstack/react-table'
import { Button, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@patchdocs/ui'
import {
  TbChevronLeftPipe,
  TbChevronRightPipe,
  TbChevronLeft,
  TbChevronRight,
  TbSortAscending,
  TbSortDescending,
  TbArrowsSort
} from 'react-icons/tb'
import * as m from '@/paraglide/messages'

// biome-ignore lint/suspicious/noExplicitAny: too complex to fix
const DataTableControlled = ({ table }: { table: Table<any> }) => {
  return (
    <div className="w-0 min-w-full">
      <div className="overflow-x-auto scrollbar-styled">
        <table className="min-w-full text-sm border-t border-b">
          <thead className="bg-muted/50 [&_tr]:border-b">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <th
                      key={header.id}
                      colSpan={header.colSpan}
                      scope="col"
                      className="text-xs md:text-sm text-foreground h-8 md:h-10 px-2 text-left align-middle font-medium whitespace-nowrap">
                      <div
                        {...{
                          className: `flex items-center gap-1.5 md:gap-2 ${header.column.getCanSort() ? 'cursor-pointer select-none' : ''}`,
                          onClick: header.column.getToggleSortingHandler()
                        }}>
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {header.column.getCanSort() &&
                          ({
                            asc: <TbSortAscending className="size-3.5" />,
                            desc: <TbSortDescending className="size-3.5" />
                          }[header.column.getIsSorted() as string] ?? (
                            <TbArrowsSort className="size-3.5 text-muted-foreground" />
                          ))}
                      </div>
                    </th>
                  )
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={table.getAllColumns().length} className="px-2 h-20 text-center text-muted-foreground">
                  {m.command_no_results()}
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => {
                return (
                  <tr key={row.id} className="hover:bg-muted/50">
                    {row.getVisibleCells().map((cell) => {
                      return (
                        <td
                          key={cell.id}
                          className="px-2 h-8 md:h-10 text-[13px] md:text-sm align-middle whitespace-nowrap">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      )
                    })}
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
      <div className="flex justify-end items-center gap-4 mt-4 px-3 text-xs">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="xs-icon"
            onClick={() => table.firstPage()}
            disabled={!table.getCanPreviousPage()}>
            <TbChevronLeftPipe />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="xs-icon"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}>
            <TbChevronLeft />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="xs-icon"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}>
            <TbChevronRight />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="xs-icon"
            onClick={() => table.lastPage()}
            disabled={!table.getCanNextPage()}>
            <TbChevronRightPipe />
          </Button>
        </div>
        <div>
          {m.data_table_page()} {table.getState().pagination.pageIndex + 1} {m.data_table_of()}{' '}
          {table.getPageCount().toLocaleString()}
        </div>
        <Select
          value={String(table.getState().pagination.pageSize)}
          onValueChange={(value) => {
            table.setPageSize(Number(value))
          }}>
          <SelectTrigger size="sm" className="w-25 h-7! text-xs!">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[10, 25, 50, 100].map((pageSize) => (
              <SelectItem key={pageSize} value={String(pageSize)} className="text-xs">
                {m.data_table_show({ count: pageSize })}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}

export default DataTableControlled
