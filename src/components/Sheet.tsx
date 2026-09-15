import type { ReactNode } from 'react'
import { cx } from './ui'

// 커뮤 계정이 쓰던 구글 시트처럼: 위에 열 문자, 옆에 행 번호
export interface SheetCol<T> {
  key: string
  label: string
  width?: string
  align?: 'left' | 'right' | 'center'
  render: (row: T) => ReactNode
}

const letter = (i: number) => {
  let s = ''
  let n = i + 1
  while (n > 0) {
    const r = (n - 1) % 26
    s = String.fromCharCode(65 + r) + s
    n = Math.floor((n - 1) / 26)
  }
  return s
}

export function Sheet<T>({ cols, rows, rowKey, empty = '아직 비어 있습니다.', minWidth = 640 }: { cols: SheetCol<T>[]; rows: T[]; rowKey: (row: T) => string; empty?: string; minWidth?: number }) {
  const align = (a?: SheetCol<T>['align']) => (a === 'right' ? 'text-right' : a === 'center' ? 'text-center' : 'text-left')
  return (
    <div className="overflow-x-auto border border-rule bg-card">
      <table className="w-full table-fixed border-collapse text-[14px]" style={{ minWidth }}>
        <thead>
          <tr className="bg-muted font-mono text-[11px] text-muted-foreground">
            <th className="w-10 border-b border-r border-rule" aria-hidden="true" />
            {cols.map((c, i) => (
              <th key={c.key} className="border-b border-r border-rule py-1 text-center font-normal last:border-r-0" style={{ width: c.width }} aria-hidden="true">
                {letter(i)}
              </th>
            ))}
          </tr>
          <tr>
            <th className="border-b border-r border-rule bg-muted text-center font-mono text-[11px] font-normal text-muted-foreground">1</th>
            {cols.map((c) => (
              <th key={c.key} scope="col" className={cx('whitespace-nowrap border-b-2 border-r border-b-foreground border-r-rule px-2.5 py-2 text-[12.5px] font-bold last:border-r-0', align(c.align))}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={rowKey(r)} className="hover:bg-muted/60">
              <td className="border-b border-r border-rule bg-muted text-center font-mono text-[11px] text-muted-foreground">{i + 2}</td>
              {cols.map((c) => (
                <td key={c.key} className={cx('border-b border-r border-rule px-2.5 py-2 align-middle last:border-r-0', align(c.align))}>
                  {c.render(r)}
                </td>
              ))}
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td className="border-r border-rule bg-muted text-center font-mono text-[11px] text-muted-foreground">2</td>
              <td colSpan={cols.length} className="px-3 py-8 text-center text-[14px] text-muted-foreground">
                {empty}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
