/* دوال ومعلومات مشتركة بين صفحة التسجيل ولوحة الإدارة */
const STORAGE_KEY = 'minya_sports_students';
const ORG_NAME = 'جامعة المنيا الأهلية';
const GENDERS = { M: 'بنين', F: 'بنات' };
const STATUSES = ['قيد المراجعة', 'مقبول', 'مرفوض'];
const SPORTS = [
  { name: 'كرة القدم', file: 'كرة_القدم' }, { name: 'الكرة الطائرة', file: 'كرة_الطائرة' },
  { name: 'كرة اليد', file: 'كرة_اليد' }, { name: 'كرة السلة', file: 'كرة_السلة' },
  { name: 'تنس الطاولة (بينج)', file: 'تنس_الطاولة' }, { name: 'السباحة', file: 'السباحة' },
  { name: 'ألعاب القوى', file: 'ألعاب_القوى' }, { name: 'البادل', file: 'البادل' }
];
function newId(existing) {
  const used = new Set((existing || []).map(s => s.id));
  let id;
  do { const b = crypto.getRandomValues(new Uint8Array(3)); id = 'SP-' + [...b].map(x => x.toString(16).padStart(2, '0')).join('').toUpperCase(); } while (used.has(id));
  return id;
}
function normalizeStudent(s) {
  if (!s || typeof s !== 'object') return null;
  const str = v => (typeof v === 'string' ? v : '');
  const g = str(s.gender);
  const gender = (g === 'بنين' || g === 'ذكر') ? GENDERS.M : (g === 'بنات' || g === 'أنثى') ? GENDERS.F : '';
  const nationalId = str(s.nationalId);
  if (!nationalId || !gender) return null;
  const known = SPORTS.map(x => x.name);
  return { id: str(s.id), fullName: str(s.fullName), nationalId, college: str(s.college), phone: str(s.phone), gender,
    sports: Array.isArray(s.sports) ? [...new Set(s.sports.filter(x => known.includes(x)))] : [],
    status: STATUSES.includes(s.status) ? s.status : STATUSES[0], createdAt: str(s.createdAt) };
}
function loadStudents() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    if (!Array.isArray(data)) return [];
    const list = data.map(normalizeStudent).filter(Boolean);
    const seen = new Set();
    list.forEach(s => { if (!s.id || seen.has(s.id)) s.id = newId(list); seen.add(s.id); });
    return list;
  } catch (e) { return []; }
}
function saveStudents(list) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); return true; } catch (e) { return false; }
}
function toEnglishDigits(s) {
  return String(s).replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d));
}
function isValidNationalId(id) {
  if (!/^[23]\d{13}$/.test(id)) return false;
  const m = +id.slice(3, 5), d = +id.slice(5, 7);
  return m >= 1 && m <= 12 && d >= 1 && d <= 31;
}
function formatDate(iso) {
  const d = new Date(iso);
  return isNaN(d) ? '' : d.toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' });
}
