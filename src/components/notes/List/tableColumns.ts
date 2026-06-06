export type NotesStaticTableColumnKey =
  | 'date'
  | 'bean'
  | 'agingDays'
  | 'scheme'
  | 'params'
  | 'tasteRatings'
  | 'totalRating'
  | 'notes';

export type NotesTableColumnKey = NotesStaticTableColumnKey;

export interface NotesTableColumnConfig {
  key: NotesTableColumnKey;
  label: string;
  defaultVisible: boolean;
}

export const NOTES_TABLE_STATIC_COLUMN_CONFIG: NotesTableColumnConfig[] = [
  { key: 'date', label: '日期', defaultVisible: true },
  { key: 'bean', label: '咖啡豆', defaultVisible: true },
  { key: 'agingDays', label: '养豆', defaultVisible: true },
  { key: 'scheme', label: '方案', defaultVisible: true },
  { key: 'params', label: '参数', defaultVisible: true },
  { key: 'tasteRatings', label: '评分维度', defaultVisible: true },
  { key: 'totalRating', label: '总评', defaultVisible: true },
  { key: 'notes', label: '备注', defaultVisible: true },
];

export const getNotesTableColumnConfig = (): NotesTableColumnConfig[] =>
  NOTES_TABLE_STATIC_COLUMN_CONFIG;

export const getDefaultVisibleNotesTableColumns = (): NotesTableColumnKey[] =>
  getNotesTableColumnConfig()
    .filter(column => column.defaultVisible)
    .map(column => column.key);
