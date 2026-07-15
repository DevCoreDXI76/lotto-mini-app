import { describe, it, expect } from 'vitest';
import { parseCsvRows, csvRowsToObjects } from './parseCsv';

describe('parseCsvRows', () => {
  it('parses simple comma-separated rows', () => {
    expect(parseCsvRows('a,b,c\n1,2,3')).toEqual([
      ['a', 'b', 'c'],
      ['1', '2', '3'],
    ]);
  });

  it('handles quoted fields containing commas', () => {
    expect(parseCsvRows('name,addr\n"foo","서울시, 강남구"')).toEqual([
      ['name', 'addr'],
      ['foo', '서울시, 강남구'],
    ]);
  });

  it('handles escaped double quotes inside quoted fields', () => {
    expect(parseCsvRows('name\n"foo ""bar"""')).toEqual([['name'], ['foo "bar"']]);
  });

  it('handles CRLF line endings', () => {
    expect(parseCsvRows('a,b\r\n1,2\r\n')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });

  it('ignores a trailing blank line', () => {
    expect(parseCsvRows('a,b\n1,2\n')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });

  it('does not drop a final row that is a single empty quoted field with no trailing newline', () => {
    expect(parseCsvRows('name\n""')).toEqual([['name'], ['']]);
  });
});

describe('csvRowsToObjects', () => {
  it('maps rows to objects keyed by trimmed header', () => {
    const rows = [
      [' name ', 'count'],
      ['foo', '3'],
      ['bar', '1'],
    ];
    expect(csvRowsToObjects(rows)).toEqual([
      { name: 'foo', count: '3' },
      { name: 'bar', count: '1' },
    ]);
  });

  it('returns an empty array for an empty input', () => {
    expect(csvRowsToObjects([])).toEqual([]);
  });
});
