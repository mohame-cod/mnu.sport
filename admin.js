
/* =====================================================
   لوحة إدارة الأنشطة الرياضية - جامعة المنيا الأهلية
   ===================================================== */

const $ = id => document.getElementById(id);

let students = [];
let pending = null;
let timer = null;

const revealed = new Set();

/* ================= بيانات دخول الإدارة ================= */

const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'asdm132006';

const LOCK_KEY = 'sports_admin_lock';
const SESSION_KEY = 'sports_admin_session';

const MAX_FAILS = 5;
const LOCK_MS = 5 * 60 * 1000;
const SESSION_MS = 15 * 60 * 1000;

const readJSON = (storage, key) => {
  try {
    return JSON.parse(storage.getItem(key));
  } catch {
    return null;
  }
};

const writeJSON = (storage, key, value) => {
  try {
    storage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
};

function gateMsg(message) {
  const element = $('gateMsg');
  element.textContent = message;
  element.className = 'toast show error';
}

function setupGate() {
  $('gateTitle').textContent = 'دخول الإدارة';
  $('gateSub').textContent = 'أدخل اسم المستخدم وكلمة المرور';
  $('gateBtn').textContent = 'دخول';
}

function handleGate(event) {
  event.preventDefault();

  $('gateMsg').className = 'toast';

  const username = $('username').value.trim();
  const password = $('pw').value;

  try {
    const lock = readJSON(localStorage, LOCK_KEY) || {
      fails: 0,
      until: 0
    };

    if (lock.until > Date.now()) {
      const minutes = Math.ceil(
        (lock.until - Date.now()) / 60000
      );

      gateMsg(`تم قفل الدخول. حاول بعد ${minutes} دقيقة.`);
      return;
    }

    if (
      username === ADMIN_USERNAME &&
      password === ADMIN_PASSWORD
    ) {
      localStorage.removeItem(LOCK_KEY);

      $('username').value = '';
      $('pw').value = '';

      startSession();
      return;
    }

    lock.fails = (lock.fails || 0) + 1;

    if (lock.fails >= MAX_FAILS) {
      lock.until = Date.now() + LOCK_MS;
      lock.fails = 0;
    }

    writeJSON(localStorage, LOCK_KEY, lock);

    gateMsg('اسم المستخدم أو كلمة المرور غير صحيحة.');
  } catch (error) {
    gateMsg('حدث خطأ أثناء تسجيل الدخول.');
  } finally {
    $('pw').value = '';
  }
}

/* ================= إدارة الجلسة ================= */

const sessionValid = () => {
  const session = readJSON(sessionStorage, SESSION_KEY);

  return !!(
    session &&
    session.exp > Date.now()
  );
};

function touch() {
  writeJSON(sessionStorage, SESSION_KEY, {
    exp: Date.now() + SESSION_MS
  });
}

function startSession() {
  touch();

  $('gate').hidden = true;
  $('app').hidden = false;

  students = loadStudents();
  refresh();

  clearInterval(timer);

  timer = setInterval(() => {
    if (!sessionValid()) {
      logout();
    }
  }, 30000);
}

function logout() {
  clearInterval(timer);

  sessionStorage.removeItem(SESSION_KEY);

  students = [];
  revealed.clear();

  $('tableBody').textContent = '';
  $('sportExports').textContent = '';

  $('app').hidden = true;
  $('gate').hidden = false;

  $('username').value = '';
  $('pw').value = '';

  setupGate();
}

['click', 'keydown', 'touchstart'].forEach(eventName => {
  document.addEventListener(eventName, () => {
    if (!$('app').hidden && sessionValid()) {
      touch();
    }
  }, { passive: true });
});

/* ================= أدوات العرض ================= */

const cell = (tr, text, cls) => {
  const td = document.createElement('td');
  td.textContent = text;

  if (cls) td.className = cls;

  tr.append(td);
};

const el = (tag, text, cls) => {
  const element = document.createElement(tag);

  if (text !== undefined) {
    element.textContent = text;
  }

  if (cls) element.className = cls;

  return element;
};

const mask = value =>
  value.length > 6
    ? value.slice(0, 3) +
      '*'.repeat(value.length - 6) +
      value.slice(-3)
    : '*'.repeat(value.length);

const statusClass = status =>
  status === 'مقبول'
    ? 'accepted'
    : status === 'مرفوض'
      ? 'rejected'
      : 'pending';

const count = (list, gender) =>
  list.filter(student => student.gender === gender).length;

function showToast(message, success) {
  const toast = $('adminToast');

  toast.textContent = message;
  toast.className =
    'toast show ' + (success ? 'success' : 'error');
}

/* ================= الإحصائيات ================= */

function renderStats() {
  $('totalCount').textContent = students.length;

  STATUSES.forEach((status, index) => {
    const ids = [
      'pendingCount',
      'acceptedCount',
      'rejectedCount'
    ];

    $(ids[index]).textContent =
      students.filter(student =>
        student.status === status
      ).length;
  });

  $('boysCount').textContent =
    count(students, GENDERS.M);

  $('girlsCount').textContent =
    count(students, GENDERS.F);

  const box = $('sportExports');
  box.textContent = '';

  SPORTS.forEach(sport => {
    const list = students.filter(student =>
      student.sports.includes(sport.name)
    );

    const item = el('div', undefined, 'export-item');

    const button = el(
      'button',
      'تصدير ملف ' + sport.name,
      'btn btn-primary'
    );

    button.type = 'button';
    button.addEventListener('click', () => exportSport(sport));

    item.append(
      el('h3', sport.name),
      el(
        'p',
        `الإجمالي ${list.length} · بنين ${
          count(list, GENDERS.M)
        } · بنات ${count(list, GENDERS.F)}`
      ),
      button
    );

    box.append(item);
  });
}

/* ================= البحث والتصفية ================= */

function filtered() {
  const query = $('searchInput').value.trim().toLowerCase();
  const status = $('statusFilter').value;
  const sport = $('sportFilter').value;
  const gender = $('genderFilter').value;

  return students.filter(student =>
    (!status || student.status === status) &&
    (!sport || student.sports.includes(sport)) &&
    (!gender || student.gender === gender) &&
    (!query || [
      student.id,
      student.fullName,
      student.college
    ].some(value =>
      value.toLowerCase().includes(query)
    ))
  );
}

/* ================= جدول الطلاب ================= */

function renderTable() {
  const body = $('tableBody');
  body.textContent = '';

  const list = filtered();

  if (!list.length) {
    const row = document.createElement('tr');

    cell(row, 'مفيش طلبات مطابقة.', 'empty');
    row.firstChild.colSpan = 9;

    body.append(row);
    return;
  }

  list.forEach(student => {
    const row = document.createElement('tr');
    const isRevealed = revealed.has(student.id);

    cell(row, student.id);
    cell(row, student.fullName, 'student');

    cell(
      row,
      isRevealed
        ? student.nationalId
        : mask(student.nationalId),
      'masked'
    );

    cell(row, student.college);

    cell(
      row,
      isRevealed
        ? student.phone
        : mask(student.phone),
      'masked'
    );

    cell(row, student.gender);
    cell(row, student.sports.join('، '));

    const statusCell = document.createElement('td');

    statusCell.append(
      el(
        'span',
        student.status,
        'status ' + statusClass(student.status)
      )
    );

    row.append(statusCell);

    const actionCell = document.createElement('td');
    const actions = el('div', undefined, 'table-actions');

    const buttons = [
      [
        'قبول',
        () => openConfirm(student.id, 'مقبول'),
        'approve'
      ],
      [
        'رفض',
        () => openConfirm(student.id, 'مرفوض'),
        'reject'
      ],
      [
        isRevealed ? 'إخفاء' : 'إظهار',
        () => {
          if (isRevealed) {
            revealed.delete(student.id);
          } else {
            revealed.add(student.id);
          }

          renderTable();
        },
        'review'
      ]
    ];

    buttons.forEach(([label, callback, className]) => {
      const button = el('button', label, className);

      button.type = 'button';
      button.addEventListener('click', callback);

      actions.append(button);
    });

    actionCell.append(actions);
    row.append(actionCell);

    body.append(row);
  });
}

function refresh() {
  renderStats();
  renderTable();
}

/* ================= تأكيد الإجراءات ================= */

function openConfirm(id, status) {
  pending = { id, status };

  $('modalText').textContent =
    `تغيير حالة الطلب ${id} إلى "${status}"؟`;

  $('modalBackdrop').classList.add('show');
}

function closeModal() {
  $('modalBackdrop').classList.remove('show');
  pending = null;
}

/* ================= تصدير Excel ================= */

const safe = value => {
  value = String(value ?? '');

  return /^[=+\-@\t\r]/.test(value)
    ? "'" + value
    : value;
};

const sheetName = name =>
  name.replace(/[\\/?*\[\]:]/g, ' ').slice(0, 31);

function buildSheet(title, statLines, headers, rows, widths) {
  const data = [
    [ORG_NAME],
    ['تقرير تسجيل الأنشطة الرياضية'],
    [title],
    ['تاريخ إنشاء التقرير: ' +
      formatDate(new Date().toISOString())],
    ...statLines,
    [],
    headers,
    ...rows
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(data);

  worksheet['!cols'] = widths.map(width => ({
    wch: width
  }));

  worksheet['!freeze'] = {
    xSplit: 0,
    ySplit: 4 + statLines.length + 2
  };

  worksheet['!views'] = [
    { rightToLeft: true }
  ];

  return worksheet;
}

const HEAD_SPORT = [
  'مسلسل',
  'الاسم بالكامل',
  'الرقم القومي',
  'الكلية',
  'رقم الهاتف',
  'النوع',
  'الحالة',
  'تاريخ التسجيل'
];

const HEAD_FULL = [
  'مسلسل',
  'الاسم بالكامل',
  'الرقم القومي',
  'الكلية',
  'رقم الهاتف',
  'النوع',
  'الألعاب',
  'الحالة',
  'تاريخ التسجيل'
];

const rowSport = (student, index) => [
  index + 1,
  safe(student.fullName),
  student.nationalId,
  safe(student.college),
  student.phone,
  student.gender,
  student.status,
  formatDate(student.createdAt)
];

const rowFull = (student, index) => [
  index + 1,
  safe(student.fullName),
  student.nationalId,
  safe(student.college),
  student.phone,
  student.gender,
  safe(student.sports.join('، ')),
  student.status,
  formatDate(student.createdAt)
];

const sportSheet = (sport, list) =>
  buildSheet(
    'اللعبة: ' + sport.name,
    [
      ['إجمالي المسجلين', list.length],
      ['عدد البنين', count(list, GENDERS.M)],
      ['عدد البنات', count(list, GENDERS.F)]
    ],
    HEAD_SPORT,
    list.map(rowSport),
    [8, 30, 18, 24, 16, 8, 14, 24]
  );

const genderSheet = (gender, list) =>
  buildSheet(
    'النوع: ' + gender,
    [
      ['إجمالي ' + gender, list.length],
      ...SPORTS.map(sport => [
        'المسجلين في ' + sport.name,
        list.filter(student =>
          student.sports.includes(sport.name)
        ).length
      ])
    ],
    HEAD_FULL,
    list.map(rowFull),
    [8, 30, 18, 24, 16, 8, 36, 14, 24]
  );

const allSheet = list =>
  buildSheet(
    'كل الطلاب',
    [
      ['إجمالي الطلاب', list.length],
      ['عدد البنين', count(list, GENDERS.M)],
      ['عدد البنات', count(list, GENDERS.F)]
    ],
    HEAD_FULL,
    list.map(rowFull),
    [8, 30, 18, 24, 16, 8, 36, 14, 24]
  );

function download(build, filename, successMessage) {
  try {
    if (typeof XLSX === 'undefined') {
      throw new Error(
        'مكتبة Excel غير محملة: assets/lib/xlsx.full.min.js'
      );
    }

    const workbook = XLSX.utils.book_new();

    workbook.Workbook = {
      Views: [{ RTL: true }]
    };

    build(workbook);

    XLSX.writeFile(workbook, filename);

    showToast(successMessage, true);
  } catch (error) {
    showToast(
      'تعذر التصدير: ' + error.message,
      false
    );
  }
}

const add = (workbook, worksheet, name) =>
  XLSX.utils.book_append_sheet(
    workbook,
    worksheet,
    sheetName(name)
  );

const exportSport = sport => {
  const list = students.filter(student =>
    student.sports.includes(sport.name)
  );

  download(
    workbook =>
      add(workbook, sportSheet(sport, list), sport.name),
    sport.file + '.xlsx',
    `تم إنشاء ملف ${sport.name} (${list.length} مسجل).`
  );
};

const exportGender = gender => {
  const list = students.filter(student =>
    student.gender === gender
  );

  download(
    workbook =>
      add(workbook, genderSheet(gender, list), gender),
    gender + '.xlsx',
    `تم إنشاء ملف ${gender} (${list.length}).`
  );
};

const exportAll = () => download(
  workbook => {
    add(workbook, allSheet(students), 'كل الطلاب');

    [GENDERS.M, GENDERS.F].forEach(gender => {
      add(
        workbook,
        genderSheet(
          gender,
          students.filter(student =>
            student.gender === gender
          )
        ),
        gender
      );
    });

    SPORTS.forEach(sport => {
      add(
        workbook,
        sportSheet(
          sport,
          students.filter(student =>
            student.sports.includes(sport.name)
          )
        ),
        sport.file.replace(/_/g, ' ')
      );
    });
  },
  'جميع_التسجيلات.xlsx',
  'تم إنشاء ملف جميع التسجيلات.'
);

/* ================= ربط الأحداث ================= */

SPORTS.forEach(sport => {
  $('sportFilter').append(
    new Option(sport.name, sport.name)
  );
});

$('gateForm').addEventListener('submit', handleGate);

$('logoutBtn').addEventListener('click', logout);

$('exportBoys').addEventListener('click', () => {
  exportGender(GENDERS.M);
});

$('exportGirls').addEventListener('click', () => {
  exportGender(GENDERS.F);
});

$('exportAll').addEventListener('click', exportAll);

[
  'searchInput',
  'statusFilter',
  'sportFilter',
  'genderFilter'
].forEach(id => {
  $(id).addEventListener(
    id === 'searchInput' ? 'input' : 'change',
    renderTable
  );
});

$('confirmAction').addEventListener('click', () => {
  if (!pending) return;

  const student = students.find(
    item => item.id === pending.id
  );

  if (student) {
    student.status = pending.status;

    if (!saveStudents(students)) {
      showToast('تعذر حفظ التغيير.', false);
    }
  }

  closeModal();
  refresh();
});

$('cancelAction').addEventListener('click', closeModal);

$('modalBackdrop').addEventListener('click', event => {
  if (event.target === $('modalBackdrop')) {
    closeModal();
  }
});

/* ================= بدء التطبيق ================= */

setupGate();

if (sessionValid()) {
  startSession();
}
