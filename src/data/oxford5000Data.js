// src/data/oxford5000Data.js
// Quản lý và tổng hợp dữ liệu 20 Unit Oxford 5000 Extra (Unit 31 - Unit 50, 1.996 mục từ)

import u31 from '../../unit/oxford_5000_unit_31.json';
import u32 from '../../unit/oxford_5000_unit_32.json';
import u33 from '../../unit/oxford_5000_unit_33.json';
import u34 from '../../unit/oxford_5000_unit_34.json';
import u35 from '../../unit/oxford_5000_unit_35.json';
import u36 from '../../unit/oxford_5000_unit_36.json';
import u37 from '../../unit/oxford_5000_unit_37.json';
import u38 from '../../unit/oxford_5000_unit_38.json';
import u39 from '../../unit/oxford_5000_unit_39.json';
import u40 from '../../unit/oxford_5000_unit_40.json';
import u41 from '../../unit/oxford_5000_unit_41.json';
import u42 from '../../unit/oxford_5000_unit_42.json';
import u43 from '../../unit/oxford_5000_unit_43.json';
import u44 from '../../unit/oxford_5000_unit_44.json';
import u45 from '../../unit/oxford_5000_unit_45.json';
import u46 from '../../unit/oxford_5000_unit_46.json';
import u47 from '../../unit/oxford_5000_unit_47.json';
import u48 from '../../unit/oxford_5000_unit_48.json';
import u49 from '../../unit/oxford_5000_unit_49.json';
import u50 from '../../unit/oxford_5000_unit_50.json';

// Danh sách 20 Unit của Oxford 5000 Extra
export const OXFORD_5000_EXTRA_UNIT_NAMES = Array.from({ length: 20 }, (_, i) => `Unit ${i + 31}`);

// Danh sách 30 Unit tương ứng của Oxford 3000
export const OXFORD_3000_UNIT_NAMES = Array.from({ length: 30 }, (_, i) => `Unit ${i + 1}`);

// Danh sách trọn vẹn 50 Unit
export const ALL_50_UNIT_NAMES = Array.from({ length: 50 }, (_, i) => `Unit ${i + 1}`);

export const OXFORD_5000_EXTRA_NAME = 'Oxford 5000 Extra';
export const OXFORD_5000_ALL_NAME = 'Tất cả Oxford 5000';

// Khởi tạo thuộc tính học tập mặc định cho mỗi từ Oxford 5000 Extra
const rawOxford5000Data = [
  ...u31, ...u32, ...u33, ...u34, ...u35,
  ...u36, ...u37, ...u38, ...u39, ...u40,
  ...u41, ...u42, ...u43, ...u44, ...u45,
  ...u46, ...u47, ...u48, ...u49, ...u50
];

export const defaultOxford5000WordsData = rawOxford5000Data.map(item => ({
  id: item.id,
  word: item.word,
  phonetic: item.phonetic || '',
  type: item.type || '',
  meaning: item.meaning || '',
  example: item.example || '',
  exampleMeaning: item.exampleMeaning || '',
  unit: `Unit ${item.unit}`,
  rawUnit: item.unit,
  level: item.level || 'C1',
  status: item.status || 'new',
  nextReviewDate: item.nextReviewDate || 0,
  repetition: item.repetition || 0,
  easeFactor: item.easeFactor || 2.5,
  interval: item.interval || 0
}));

/**
 * Cắt đúng số từ tương ứng cho từng Unit (1 - 30) của Oxford 3000
 * Mỗi Unit có 100 từ (Unit 30 có 78 từ cuối)
 */
export const getOxford3000UnitWords = (oxford3000Words, unitName) => {
  if (!oxford3000Words || oxford3000Words.length === 0) return [];
  const match = unitName.match(/^Unit\s+(\d+)$/);
  if (!match) return oxford3000Words;
  const unitNum = parseInt(match[1], 10);
  if (unitNum < 1 || unitNum > 30) return oxford3000Words;
  const startIdx = (unitNum - 1) * 100;
  const endIdx = unitNum === 30 ? oxford3000Words.length : unitNum * 100;
  return oxford3000Words.slice(startIdx, endIdx);
};

/**
 * Lấy danh sách từ cho từng Unit (31 - 50) của Oxford 5000 Extra
 */
export const getOxford5000UnitWords = (oxford5000Words, unitName) => {
  if (!oxford5000Words || oxford5000Words.length === 0) return [];
  const match = unitName.match(/^Unit\s+(\d+)$/);
  if (!match) return oxford5000Words;
  const unitNum = parseInt(match[1], 10);
  return oxford5000Words.filter(w => w.unit === `Unit ${unitNum}` || w.rawUnit === unitNum || w.unit === unitNum);
};
