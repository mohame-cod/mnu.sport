const form = document.getElementById('sportsForm');
const toast = document.getElementById('formToast');
const count = document.getElementById('selectedCount');
const checks = Array.from(document.querySelectorAll('#sportsGrid input[type="checkbox"]'));
const val = id => document.getElementById(id).value;

function updateSelectedCount() {
  const n = checks.filter(c => c.checked).length;
  count.textContent = `${n} ${n === 1 ? 'لعبة مختارة' : 'ألعاب مختارة'}`;
}
checks.forEach(c => c.addEventListener('change', updateSelectedCount));
function showToast(message, type) { toast.textContent = message; toast.className = `toast show ${type}`; }

form.addEventListener('submit', event => {
  event.preventDefault();
  const fullName = val('fullName').trim().replace(/\s+/g, ' ');
  const nationalId = toEnglishDigits(val('nationalId').trim());
  const college = val('college').trim().replace(/\s+/g, ' ');
  const phone = toEnglishDigits(val('phone').trim());
  const gender = form.querySelector('input[name="gender"]:checked')?.value;
  const sports = checks.filter(c => c.checked).map(c => c.value);

  if (fullName.split(' ').length < 4 || fullName.length > 120 || !/^[\p{L}\s'’.-]+$/u.test(fullName)) return showToast('من فضلك اكتب الاسم الرباعي كاملًا بالحروف فقط.', 'error');
  if (!isValidNationalId(nationalId)) return showToast('الرقم القومي لازم يكون 14 رقمًا بصيغة صحيحة.', 'error');
  if (college.length < 2 || college.length > 100) return showToast('اكتب اسم الكلية.', 'error');
  if (!/^01[0125][0-9]{8}$/.test(phone)) return showToast('اكتب رقم هاتف مصري صحيح مكوّن من 11 رقمًا.', 'error');
  if (gender !== GENDERS.M && gender !== GENDERS.F) return showToast('اختار بنين أو بنات.', 'error');
  if (!sports.length) return showToast('اختار لعبة واحدة على الأقل.', 'error');

  const students = loadStudents();
  if (students.some(s => s.nationalId === nationalId)) return showToast('الرقم القومي ده مسجل قبل كده على الجهاز ده.', 'error');
  const student = { id: newId(students), fullName, nationalId, college, phone, gender, sports, status: STATUSES[0], createdAt: new Date().toISOString() };
  if (!saveStudents([...students, student])) return showToast('تعذر الحفظ في المتصفح. بياناتك لسه موجودة في الاستمارة.', 'error');
  form.reset(); updateSelectedCount();
  showToast('تم تسجيل طلبك بنجاح. البيانات محفوظة على هذا الجهاز فقط ولم تُرسل لأي جهة.', 'success');
});
