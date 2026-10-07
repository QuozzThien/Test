const C = window.APP_CONFIG || {};
const ADMIN_MODE = window.ADMIN_MODE === true;

const sb =
  window.supabase?.createClient
    ? window.supabase.createClient(
        C.SUPABASE_URL,
        C.SUPABASE_ANON_KEY
      )
    : null;

const root = document.getElementById('app');

const S = {
  page: ADMIN_MODE ? 'login' : 'home',

  user: null,

  subject: null,
  lesson: null,
  exam: null,

  questions: [],
  answers: {},

  student: {
    name: '',
    className: ''
  },

  result: null
};


/* =========================================================
   UTILITIES
========================================================= */

function esc(s) {
  return String(s ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}


function go(page) {
  S.page = page;
  render();
  window.scrollTo(0, 0);
}


function loading(text = 'Đang tải...') {
  return layout(`
    <section class="card">
      <p>${esc(text)}</p>
    </section>
  `);
}


/* =========================================================
   LAYOUT
========================================================= */

function layout(body) {

  root.innerHTML = `
    <div class="wrap">

      <header class="top">

        <div>
          <div class="brand">
            ${ADMIN_MODE ? 'Quản trị' : 'Luyện Thi'}
          </div>

          ${
            ADMIN_MODE
              ? `<span class="tag">Khu vực quản trị</span>`
              : ''
          }
        </div>

        <div class="nav">

          ${
            ADMIN_MODE
              ? `
                ${
                  S.user
                    ? `
                      <button
                        class="btn"
                        onclick="go('admin')">
                        Quản trị
                      </button>

                      <button
                        class="btn"
                        onclick="logout()">
                        Đăng xuất
                      </button>
                    `
                    : ''
                }
              `
              : `
                <button
                  class="btn"
                  onclick="go('home')">
                  Môn học
                </button>

                <button
                  class="btn"
                  onclick="go('ranking')">
                  Xếp hạng
                </button>
              `
          }

        </div>

      </header>

      ${body}

    </div>
  `;
}


/* =========================================================
   PUBLIC - SUBJECTS
========================================================= */

async function home() {

  if (!sb) {
    return layout(`
      <section class="card">
        <h2>Không kết nối được Supabase</h2>
        <p>Kiểm tra lại config.js.</p>
      </section>
    `);
  }

  const { data, error } = await sb
    .from('subjects')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });

  if (error) {

    return layout(`
      <section class="card">
        <h2>Lỗi tải môn học</h2>
        <p>${esc(error.message)}</p>
      </section>
    `);
  }

  const subjects = data || [];

  if (!subjects.length) {

    return layout(`
      <section class="hero">

        <h1>Luyện Thi</h1>

        <p>
          Hiện chưa có môn học nào được mở.
        </p>

      </section>

      <section class="card empty-state">

        <h2>Chưa có môn học</h2>

        <p>
          Quản trị viên chưa thêm hoặc chưa mở môn học.
        </p>

      </section>
    `);
  }

  return layout(`
    <section class="hero">

      <h1>Luyện Thi</h1>

      <p>
        Chọn môn học để bắt đầu.
      </p>

    </section>

    <section class="subjects">

      ${subjects.map(x => `

        <button
          class="subject"
          style="
            --subject-color:${esc(x.color || '#7457ff')};
          "
          onclick='openSubject(${JSON.stringify(x)})'
        >

          <div
            class="subject-icon"
            style="
              background:${esc(x.color || '#7457ff')};
            "
          >
            ${esc(x.icon || '📚')}
          </div>

          <div class="subject-body">

            <h2>
              ${esc(x.name)}
            </h2>

            ${
              x.description
                ? `<p>${esc(x.description)}</p>`
                : ''
            }

          </div>

          <div class="arrow">
            →
          </div>

        </button>

      `).join('')}

    </section>
  `);
}


function openSubject(subject) {

  S.subject = subject;

  S.lesson = null;
  S.exam = null;

  go('lessons');
}


/* =========================================================
   LESSONS
========================================================= */

async function lessons() {

  if (!S.subject) {
    return go('home');
  }

  const { data, error } = await sb
    .from('lessons')
    .select('*')
    .eq('subject_id', S.subject.id)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });

  if (error) {

    return layout(`
      <section class="card">

        <button
          class="btn"
          onclick="go('home')">
          ← Quay lại
        </button>

        <h2>Lỗi tải bài học</h2>

        <p>${esc(error.message)}</p>

      </section>
    `);
  }

  const rows = data || [];

  return layout(`

    <section class="card">

      <button
        class="btn"
        onclick="go('home')">
        ← Môn học
      </button>

      <h1>
        ${esc(S.subject.icon || '📚')}
        ${esc(S.subject.name)}
      </h1>

      <p>
        Chọn bài hoặc chủ đề.
      </p>

    </section>

    ${
      rows.length
        ? `
          <section class="grid">

            ${rows.map(x => `

              <button
                class="card"
                onclick='openLesson(${JSON.stringify(x)})'
              >

                <h2>
                  ${esc(x.name)}
                </h2>

                ${
                  x.description
                    ? `<p>${esc(x.description)}</p>`
                    : ''
                }

              </button>

            `).join('')}

          </section>
        `
        : `
          <section class="card">

            <h2>Chưa có bài học</h2>

            <p>
              Môn học này hiện chưa có bài/chủ đề.
            </p>

          </section>
        `
    }

  `);
}


function openLesson(lesson) {

  S.lesson = lesson;
  S.exam = null;

  go('exams');
}


/* =========================================================
   EXAMS
========================================================= */

async function exams() {

  if (!S.lesson) {
    return go('home');
  }

  const { data, error } = await sb
    .from('exams')
    .select('*')
    .eq('lesson_id', S.lesson.id)
    .eq('is_published', true)
    .order('created_at', { ascending: false });

  if (error) {

    return layout(`
      <section class="card">

        <button
          class="btn"
          onclick="go('lessons')">
          ← Quay lại
        </button>

        <h2>Lỗi tải đề</h2>

        <p>${esc(error.message)}</p>

      </section>
    `);
  }

  const rows = data || [];

  return layout(`

    <section class="card">

      <button
        class="btn"
        onclick="go('lessons')">
        ← Bài học
      </button>

      <h1>
        ${esc(S.lesson.name)}
      </h1>

      <p>
        Chọn đề thi.
      </p>

    </section>

    ${
      rows.length
        ? `
          <section class="grid">

            ${rows.map(x => `

              <button
                class="card"
                onclick='openExam(${JSON.stringify(x)})'
              >

                <h2>
                  ${esc(x.title || x.name || 'Đề thi')}
                </h2>

                ${
                  x.description
                    ? `<p>${esc(x.description)}</p>`
                    : ''
                }

                <p>

                  ${
                    x.duration_minutes
                      ? `${x.duration_minutes} phút`
                      : ''
                  }

                  ${
                    x.question_count
                      ? ` • ${x.question_count} câu`
                      : ''
                  }

                </p>

              </button>

            `).join('')}

          </section>
        `
        : `
          <section class="card">

            <h2>Chưa có đề thi</h2>

            <p>
              Bài này hiện chưa có đề được mở.
            </p>

          </section>
        `
    }

  `);
}


function openExam(exam) {

  S.exam = exam;

  S.questions = [];
  S.answers = {};

  go('info');
}


/* =========================================================
   EXAM INFO
========================================================= */

function info() {

  if (!S.exam) {
    return go('home');
  }

  const maxAttempts =
    S.exam.max_attempts === 0 ||
    S.exam.max_attempts == null
      ? 'Không giới hạn'
      : S.exam.max_attempts;

  return layout(`

    <section class="card">

      <button
        class="btn"
        onclick="go('exams')">
        ← Chọn đề khác
      </button>

      <h1>
        ${esc(S.exam.title || S.exam.name || 'Đề thi')}
      </h1>

      ${
        S.exam.description
          ? `<p>${esc(S.exam.description)}</p>`
          : ''
      }

      <div class="info-box">

        <p>
          <b>Thời gian:</b>
          ${
            S.exam.duration_minutes
              ? `${S.exam.duration_minutes} phút`
              : 'Không giới hạn'
          }
        </p>

        <p>
          <b>Số câu:</b>
          ${
            S.exam.question_count ||
            'Theo số câu trong đề'
          }
        </p>

        <p>
          <b>Số lần làm:</b>
          ${maxAttempts}
        </p>

      </div>

      <button
        class="btn primary"
        onclick="studentInfo()">

        Bắt đầu

      </button>

    </section>
  `);
}


/* =========================================================
   STUDENT INFORMATION
========================================================= */

function studentInfo() {

  return layout(`

    <section class="card">

      <button
        class="btn"
        onclick="go('info')">
        ← Quay lại
      </button>

      <h1>
        Thông tin học sinh
      </h1>

      <p>
        Nhập thông tin trước khi bắt đầu làm bài.
      </p>

      <input
        id="studentName"
        class="input"
        type="text"
        placeholder="Họ và tên"
        value="${esc(S.student.name)}"
      >

      <input
        id="studentClass"
        class="input"
        type="text"
        placeholder="Lớp"
        value="${esc(S.student.className)}"
      >

      <button
        class="btn primary"
        onclick="confirmStudentInfo()">

        Tiếp tục làm bài

      </button>

    </section>

  `);
}


function confirmStudentInfo() {

  const name =
    document.getElementById('studentName')
      ?.value
      .trim();

  const className =
    document.getElementById('studentClass')
      ?.value
      .trim();

  if (!name) {
    alert('Vui lòng nhập họ và tên.');
    return;
  }

  if (!className) {
    alert('Vui lòng nhập lớp.');
    return;
  }

  S.student = {
    name,
    className
  };

  startExam();
}


/* =========================================================
   START EXAM
========================================================= */

async function startExam() {

  if (!S.exam) {
    return;
  }

  const { data, error } = await sb
    .from('questions')
    .select('*')
    .eq('exam_id', S.exam.id)
    .order('id');

  if (error) {

    alert(error.message);
    return;
  }

  let questions = data || [];

  if (!questions.length) {

    return layout(`
      <section class="card">

        <h2>Đề chưa có câu hỏi</h2>

        <p>
          Quản trị viên chưa thêm câu hỏi cho đề này.
        </p>

        <button
          class="btn"
          onclick="go('exams')">
          Quay lại
        </button>

      </section>
    `);
  }

  if (
    S.exam.question_count &&
    questions.length > S.exam.question_count
  ) {

    questions = [...questions]
      .sort(() => Math.random() - 0.5)
      .slice(0, S.exam.question_count);
  }

  S.questions = questions;
  S.answers = {};

  go('take');
}


/* =========================================================
   TAKE EXAM
========================================================= */

function take() {

  if (!S.questions.length) {

    return layout(`
      <section class="card">

        <h2>Không có câu hỏi</h2>

        <button
          class="btn"
          onclick="go('exams')">
          Quay lại
        </button>

      </section>
    `);
  }

  return layout(`

    <section class="card">

      <h1>
        ${esc(
          S.exam.title ||
          S.exam.name ||
          'Đề thi'
        )}
      </h1>

      <p>
        <b>${esc(S.student.name)}</b>
        —
        ${esc(S.student.className)}
      </p>

    </section>

    <section class="question-list">

      ${S.questions.map((q, i) => `

        <div class="question card">

          <h3>
            Câu ${i + 1}.
            ${esc(
              q.question_text ||
              q.question ||
              ''
            )}
          </h3>

          <div class="options">

            ${['A', 'B', 'C', 'D'].map(letter => {

              const key =
                `option_${letter.toLowerCase()}`;

              const checked =
                S.answers[q.id] === letter
                  ? 'checked'
                  : '';

              return `

                <label class="option">

                  <input
                    type="radio"
                    name="q_${q.id}"
                    value="${letter}"
                    ${checked}
                    onchange="
                      S.answers[${JSON.stringify(q.id)}]='${letter}'
                    "
                  >

                  <span>

                    <b>${letter}.</b>

                    ${esc(q[key] || '')}

                  </span>

                </label>

              `;

            }).join('')}

          </div>

        </div>

      `).join('')}

    </section>

    <section class="card">

      <button
        class="btn primary"
        onclick="submitExam()">

        Nộp bài

      </button>

    </section>

  `);
}


/* =========================================================
   SUBMIT
========================================================= */

async function submitExam() {

  if (!S.questions.length) {
    return;
  }

  const unanswered =
    S.questions.filter(
      q => !S.answers[q.id]
    ).length;

  if (unanswered > 0) {

    const ok = confirm(
      `Bạn còn ${unanswered} câu chưa chọn đáp án.\n\n` +
      `Bạn có chắc muốn nộp bài không?`
    );

    if (!ok) {
      return;
    }
  }

  let correct = 0;

  for (const q of S.questions) {

    if (
      S.answers[q.id] ===
      q.correct_answer
    ) {
      correct++;
    }
  }

  const total = S.questions.length;

  const score = Number(
    ((correct / total) * 10)
      .toFixed(2)
  );

  S.result = {

    name: S.student.name,

    className:
      S.student.className,

    correct,

    total,

    score
  };

  try {

    const { error } =
      await sb.functions.invoke(
        'submit-attempt',
        {
          body: {

            exam_id:
              S.exam.id,

            student_name:
              S.student.name,

            student_class:
              S.student.className,

            answers:
              S.answers,

            score,

            correct_count:
              correct,

            total_questions:
              total

          }
        }
      );

    if (error) {
      console.error(
        'submit-attempt:',
        error
      );
    }

  } catch (e) {

    console.error(
      'submit-attempt:',
      e
    );
  }

  go('result');
}


/* =========================================================
   RESULT
========================================================= */

function result() {

  if (!S.result) {

    return layout(`
      <section class="card">

        <h2>Không có kết quả</h2>

        <button
          class="btn"
          onclick="go('home')">
          Trang chủ
        </button>

      </section>
    `);
  }

  return layout(`

    <section class="card result">

      <h1>
        Đã nộp bài
      </h1>

      <h2>
        ${esc(S.result.name)}
      </h2>

      <p>
        Lớp:
        ${esc(S.result.className)}
      </p>

      <div class="score">
        ${S.result.score}/10
      </div>

      <p>
        Đúng
        <b>${S.result.correct}</b>
        /
        ${S.result.total}
        câu
      </p>

      <div>

        <button
          class="btn"
          onclick="go('home')">
          Về trang chủ
        </button>

        <button
          class="btn"
          onclick="go('ranking')">
          Xếp hạng
        </button>

      </div>

    </section>

  `);
}


/* =========================================================
   RANKING
========================================================= */

async function ranking() {

  const { data, error } = await sb
    .from('attempts')
    .select('*')
    .order('score', {
      ascending: false
    })
    .order('created_at', {
      ascending: true
    })
    .limit(100);

  if (error) {

    return layout(`
      <section class="card">

        <h2>
          Không tải được xếp hạng
        </h2>

        <p>
          ${esc(error.message)}
        </p>

      </section>
    `);
  }

  return layout(`

    <section class="card">

      <h1>
        Xếp hạng
      </h1>

      <p>
        Thành tích các lượt làm bài.
      </p>

    </section>

    <section class="card table-wrap">

      <table>

        <thead>

          <tr>

            <th>#</th>
            <th>Họ tên</th>
            <th>Lớp</th>
            <th>Điểm</th>

          </tr>

        </thead>

        <tbody>

          ${(data || []).map((x, i) => `

            <tr>

              <td>
                ${i + 1}
              </td>

              <td>
                ${esc(
                  x.student_name || ''
                )}
              </td>

              <td>
                ${esc(
                  x.student_class || ''
                )}
              </td>

              <td>
                <b>
                  ${x.score}
                </b>
              </td>

            </tr>

          `).join('')}

        </tbody>

      </table>

    </section>

  `);
}


/* =========================================================
   ADMIN LOGIN
========================================================= */

function login() {

  return layout(`

    <section class="card login-card">

      <h1>
        Quản trị
      </h1>

      <p>
        Đăng nhập tài khoản quản trị.
      </p>

      <input
        id="loginEmail"
        class="input"
        type="email"
        placeholder="Email"
      >

      <input
        id="loginPassword"
        class="input"
        type="password"
        placeholder="Mật khẩu"
      >

      <button
        class="btn primary"
        onclick="loginAdmin()">

        Đăng nhập

      </button>

    </section>

  `);
}


async function loginAdmin() {

  const email =
    document.getElementById(
      'loginEmail'
    )?.value.trim();

  const password =
    document.getElementById(
      'loginPassword'
    )?.value;

  if (!email || !password) {

    alert(
      'Vui lòng nhập email và mật khẩu.'
    );

    return;
  }

  const { data, error } =
    await sb.auth.signInWithPassword({
      email,
      password
    });

  if (error) {

    alert(error.message);
    return;
  }

  S.user = data.user;
  S.page = 'admin';

  render();
}


async function logout() {

  await sb.auth.signOut();

  S.user = null;
  S.page = 'login';

  render();
}


/* =========================================================
   ADMIN DASHBOARD
========================================================= */

async function admin() {

  if (!S.user) {

    S.page = 'login';

    return login();
  }

  return layout(`

    <section class="hero">

      <h1>
        Quản trị hệ thống
      </h1>

      <p>
        Quản lý môn học, bài học,
        câu hỏi, đề thi và kết quả.
      </p>

    </section>

    <section class="grid">

      <button
        class="card"
        onclick="subjectManager()">

        <h2>
          Môn học
        </h2>

        <p>
          Thêm, sửa, bật/tắt môn học.
        </p>

      </button>


      <button
        class="card"
        onclick="adminLessons()">

        <h2>
          Bài học
        </h2>

        <p>
          Quản lý bài/chủ đề.
        </p>

      </button>


      <button
        class="card"
        onclick="adminQuestions()">

        <h2>
          Ngân hàng câu hỏi
        </h2>

        <p>
          Quản lý câu hỏi.
        </p>

      </button>


      <button
        class="card"
        onclick="adminExams()">

        <h2>
          Đề thi
        </h2>

        <p>
          Tạo và quản lý đề.
        </p>

      </button>


      <button
        class="card"
        onclick="adminResults()">

        <h2>
          Kết quả
        </h2>

        <p>
          Xem kết quả học sinh.
        </p>

      </button>


      ${
        typeof aiPanel === 'function'
          ? `
            <button
              class="card"
              onclick="aiPanel()">

              <h2>
                AI
              </h2>

              <p>
                Tạo câu hỏi bằng AI,
                OCR và nhập từ URL.
              </p>

            </button>
          `
          : ''
      }

    </section>

  `);
}


/* =========================================================
   SUBJECT MANAGER
========================================================= */

async function subjectManager() {

  const { data, error } = await sb
    .from('subjects')
    .select('*')
    .order('sort_order', {
      ascending: true
    })
    .order('name', {
      ascending: true
    });

  if (error) {

    alert(error.message);
    return;
  }

  const subjects = data || [];

  layout(`

    <section class="card">

      <button
        class="btn"
        onclick="go('admin')">
        ← Quản trị
      </button>

      <h1>
        Quản lý môn học
      </h1>

      <p>
        Môn học được tạo tại đây sẽ tự động
        xuất hiện ở trang Luyện Thi khi được bật.
      </p>

      <input
        id="subjectName"
        class="input"
        placeholder="Tên môn học"
      >

      <input
        id="subjectIcon"
        class="input"
        placeholder="Icon, ví dụ: 📐"
        value="📚"
      >

      <input
        id="subjectColor"
        class="input"
        type="color"
        value="#7457ff"
      >

      <input
        id="subjectDesc"
        class="input"
        placeholder="Mô tả môn học"
      >

      <input
        id="subjectOrder"
        class="input"
        type="number"
        value="0"
        placeholder="Thứ tự"
      >

      <button
        class="btn primary"
        onclick="createSubjectManual()">

        + Thêm môn học

      </button>

    </section>


    <section class="subject-admin-list">

      ${
        subjects.length
          ? subjects.map(x => `

              <div class="subject-admin-item">

                <div
                  class="subject-admin-icon"
                  style="
                    background:${esc(
                      x.color ||
                      '#7457ff'
                    )};
                  "
                >
                  ${esc(x.icon || '📚')}
                </div>

                <div class="subject-admin-info">

                  <strong>
                    ${esc(x.name)}
                  </strong>

                  <div>
                    ${esc(
                      x.description || ''
                    )}
                  </div>

                  <small>
                    ${
                      x.is_active
                        ? '<span class="status-active">Đang hiển thị</span>'
                        : '<span class="status-hidden">Đang ẩn</span>'
                    }
                  </small>

                </div>

                <div>

                  <button
                    class="btn"
                    onclick="toggleSubject('${x.id}', ${!x.is_active})">

                    ${
                      x.is_active
                        ? 'Ẩn'
                        : 'Hiện'
                    }

                  </button>

                  <button
                    class="btn"
                    onclick='editSubject(${JSON.stringify(x)})'>

                    Sửa

                  </button>

                  <button
                    class="btn"
                    onclick="deleteSubject('${x.id}')">

                    Xóa

                  </button>

                </div>

              </div>

            `).join('')
          : `
              <section class="card">

                <h2>
                  Chưa có môn học
                </h2>

                <p>
                  Hãy thêm môn học đầu tiên.
                </p>

              </section>
          `
      }

    </section>

  `);
}


async function createSubjectManual() {

  const name =
    document.getElementById(
      'subjectName'
    )?.value.trim();

  const icon =
    document.getElementById(
      'subjectIcon'
    )?.value.trim() ||
    '📚';

  const color =
    document.getElementById(
      'subjectColor'
    )?.value ||
    '#7457ff';

  const description =
    document.getElementById(
      'subjectDesc'
    )?.value.trim() ||
    '';

  const sortOrder =
    Number(
      document.getElementById(
        'subjectOrder'
      )?.value || 0
    );

  if (!name) {

    alert(
      'Vui lòng nhập tên môn học.'
    );

    return;
  }

  const { error } =
    await sb
      .from('subjects')
      .insert({
        name,
        icon,
        color,
        description,
        sort_order: sortOrder,
        is_active: true,
        created_by: S.user?.id || null
      });

  if (error) {

    alert(error.message);
    return;
  }

  subjectManager();
}


async function toggleSubject(
  id,
  active
) {

  const { error } =
    await sb
      .from('subjects')
      .update({
        is_active: active
      })
      .eq('id', id);

  if (error) {

    alert(error.message);
    return;
  }

  subjectManager();
}


function editSubject(subject) {

  layout(`

    <section class="card">

      <button
        class="btn"
        onclick="subjectManager()">
        ← Quản lý môn
      </button>

      <h1>
        Sửa môn học
      </h1>

      <input
        id="editSubjectName"
        class="input"
        value="${esc(subject.name)}"
        placeholder="Tên môn"
      >

      <input
        id="editSubjectIcon"
        class="input"
        value="${esc(subject.icon || '📚')}"
        placeholder="Icon"
      >

      <input
        id="editSubjectColor"
        class="input"
        type="color"
        value="${esc(subject.color || '#7457ff')}"
      >

      <input
        id="editSubjectDesc"
        class="input"
        value="${esc(subject.description || '')}"
        placeholder="Mô tả"
      >

      <input
        id="editSubjectOrder"
        class="input"
        type="number"
        value="${Number(subject.sort_order || 0)}"
      >

      <button
        class="btn primary"
        onclick="saveSubjectEdit('${subject.id}')">

        Lưu thay đổi

      </button>

    </section>

  `);
}


async function saveSubjectEdit(id) {

  const name =
    document.getElementById(
      'editSubjectName'
    )?.value.trim();

  const icon =
    document.getElementById(
      'editSubjectIcon'
    )?.value.trim() ||
    '📚';

  const color =
    document.getElementById(
      'editSubjectColor'
    )?.value ||
    '#7457ff';

  const description =
    document.getElementById(
      'editSubjectDesc'
    )?.value.trim() ||
    '';

  const sort_order =
    Number(
      document.getElementById(
        'editSubjectOrder'
      )?.value || 0
    );

  if (!name) {

    alert(
      'Tên môn không được để trống.'
    );

    return;
  }

  const { error } =
    await sb
      .from('subjects')
      .update({
        name,
        icon,
        color,
        description,
        sort_order
      })
      .eq('id', id);

  if (error) {

    alert(error.message);
    return;
  }

  subjectManager();
}


async function deleteSubject(id) {

  const ok = confirm(
    'Xóa môn học này?\n\n' +
    'Nếu môn đã có bài học hoặc dữ liệu liên quan, ' +
    'Supabase có thể không cho phép xóa.'
  );

  if (!ok) {
    return;
  }

  const { error } =
    await sb
      .from('subjects')
      .delete()
      .eq('id', id);

  if (error) {

    alert(error.message);
    return;
  }

  subjectManager();
}


/* =========================================================
   ADMIN LESSONS
========================================================= */

async function adminLessons() {

  const { data, error } =
    await sb
      .from('lessons')
      .select(`
        *,
        subjects (
          name
        )
      `)
      .order('name');

  if (error) {

    alert(error.message);
    return;
  }

  const subjects =
    await getAllSubjects();

  layout(`

    <section class="card">

      <button
        class="btn"
        onclick="go('admin')">
        ← Quản trị
      </button>

      <h1>
        Quản lý bài học
      </h1>

      <select
        id="lessonSubject"
        class="input">

        <option value="">
          Chọn môn học
        </option>

        ${subjects.map(s => `

          <option value="${s.id}">
            ${esc(s.name)}
          </option>

        `).join('')}

      </select>

      <input
        id="lessonName"
        class="input"
        placeholder="Tên bài/chủ đề"
      >

      <input
        id="lessonDesc"
        class="input"
        placeholder="Mô tả"
      >

      <input
        id="lessonOrder"
        class="input"
        type="number"
        value="0"
        placeholder="Thứ tự"
      >

      <button
        class="btn primary"
        onclick="createLesson()">

        + Thêm bài

      </button>

    </section>

    <section class="grid">

      ${(data || []).map(x => `

        <div class="card">

          <h2>
            ${esc(x.name)}
          </h2>

          <p>
            Môn:
            ${esc(
              x.subjects?.name || ''
            )}
          </p>

          ${
            x.description
              ? `<p>${esc(x.description)}</p>`
              : ''
          }

          <button
            class="btn"
            onclick="deleteLesson('${x.id}')">

            Xóa

          </button>

        </div>

      `).join('')}

    </section>

  `);
}


async function getAllSubjects() {

  const { data, error } =
    await sb
      .from('subjects')
      .select('*')
      .order('sort_order')
      .order('name');

  if (error) {

    console.error(error);
    return [];
  }

  return data || [];
}


async function createLesson() {

  const subject_id =
    document.getElementById(
      'lessonSubject'
    )?.value;

  const name =
    document.getElementById(
      'lessonName'
    )?.value.trim();

  const description =
    document.getElementById(
      'lessonDesc'
    )?.value.trim() || '';

  const sort_order =
    Number(
      document.getElementById(
        'lessonOrder'
      )?.value || 0
    );

  if (!subject_id) {

    alert(
      'Hãy chọn môn học.'
    );

    return;
  }

  if (!name) {

    alert(
      'Hãy nhập tên bài.'
    );

    return;
  }

  const { error } =
    await sb
      .from('lessons')
      .insert({
        subject_id,
        name,
        description,
        sort_order
      });

  if (error) {

    alert(error.message);
    return;
  }

  adminLessons();
}


async function deleteLesson(id) {

  if (
    !confirm(
      'Xóa bài học này?'
    )
  ) {
    return;
  }

  const { error } =
    await sb
      .from('lessons')
      .delete()
      .eq('id', id);

  if (error) {

    alert(error.message);
    return;
  }

  adminLessons();
}


/* =========================================================
   ADMIN QUESTIONS
========================================================= */

async function adminQuestions() {

  const { data, error } =
    await sb
      .from('questions')
      .select(`
        *,
        exams (
          title,
          name
        )
      `)
      .order('id', {
        ascending: false
      })
      .limit(200);

  if (error) {

    alert(error.message);
    return;
  }

  layout(`

    <section class="card">

      <button
        class="btn"
        onclick="go('admin')">
        ← Quản trị
      </button>

      <h1>
        Ngân hàng câu hỏi
      </h1>

      ${
        typeof aiPanel === 'function'
          ? `
            <button
              class="btn primary"
              onclick="aiPanel()">

              AI tạo câu hỏi

            </button>
          `
          : ''
      }

    </section>


    <section>

      ${(data || []).map((q, i) => `

        <div class="card">

          <b>
            Câu ${i + 1}
          </b>

          ${
            q.exams
              ? `
                <p>
                  Đề:
                  ${esc(
                    q.exams.title ||
                    q.exams.name ||
                    ''
                  )}
                </p>
              `
              : ''
          }

          <p>
            ${esc(
              q.question_text ||
              q.question ||
              ''
            )}
          </p>

          <p>
            A. ${esc(q.option_a || '')}
          </p>

          <p>
            B. ${esc(q.option_b || '')}
          </p>

          <p>
            C. ${esc(q.option_c || '')}
          </p>

          <p>
            D. ${esc(q.option_d || '')}
          </p>

          <p>
            Đáp án:
            <b>
              ${esc(
                q.correct_answer || ''
              )}
            </b>
          </p>

        </div>

      `).join('')}

    </section>

  `);
}


/* =========================================================
   ADMIN EXAMS
========================================================= */

async function adminExams() {

  const { data, error } =
    await sb
      .from('exams')
      .select(`
        *,
        lessons (
          name,
          subjects (
            name
          )
        )
      `)
      .order('created_at', {
        ascending: false
      });

  if (error) {

    alert(error.message);
    return;
  }

  layout(`

    <section class="card">

      <button
        class="btn"
        onclick="go('admin')">
        ← Quản trị
      </button>

      <h1>
        Quản lý đề thi
      </h1>

      <p>
        Các đề đã tạo trong hệ thống.
      </p>

    </section>

    <section class="grid">

      ${(data || []).map(x => `

        <div class="card">

          <h2>
            ${esc(
              x.title ||
              x.name ||
              'Đề thi'
            )}
          </h2>

          ${
            x.lessons
              ? `
                <p>
                  Môn:
                  ${esc(
                    x.lessons.subjects?.name ||
                    ''
                  )}
                </p>

                <p>
                  Bài:
                  ${esc(
                    x.lessons.name ||
                    ''
                  )}
                </p>
              `
              : ''
          }

          <p>
            ${x.question_count || 0}
            câu

            ${
              x.duration_minutes
                ? ` • ${x.duration_minutes} phút`
                : ''
            }
          </p>

          <p>
            Trạng thái:
            ${
              x.is_published
                ? '<span class="status-active">Đang mở</span>'
                : '<span class="status-hidden">Đang đóng</span>'
            }
          </p>

        </div>

      `).join('')}

    </section>

  `);
}


/* =========================================================
   ADMIN RESULTS
========================================================= */

async function adminResults() {

  const { data, error } =
    await sb
      .from('attempts')
      .select('*')
      .order('created_at', {
        ascending: false
      })
      .limit(500);

  if (error) {

    alert(error.message);
    return;
  }

  layout(`

    <section class="card">

      <button
        class="btn"
        onclick="go('admin')">
        ← Quản trị
      </button>

      <h1>
        Kết quả học sinh
      </h1>

    </section>


    <section class="card table-wrap">

      <table>

        <thead>

          <tr>

            <th>Họ tên</th>
            <th>Lớp</th>
            <th>Điểm</th>
            <th>Số câu đúng</th>
            <th>Thời gian</th>

          </tr>

        </thead>

        <tbody>

          ${(data || []).map(x => `

            <tr>

              <td>
                ${esc(
                  x.student_name || ''
                )}
              </td>

              <td>
                ${esc(
                  x.student_class || ''
                )}
              </td>

              <td>
                <b>
                  ${x.score}
                </b>
              </td>

              <td>
                ${
                  x.correct_count ??
                  ''
                }
                /
                ${
                  x.total_questions ??
                  ''
                }
              </td>

              <td>
                ${esc(
                  x.created_at || ''
                )}
              </td>

            </tr>

          `).join('')}

        </tbody>

      </table>

    </section>

  `);
}


/* =========================================================
   RENDER
========================================================= */

async function render() {

  if (ADMIN_MODE) {

    if (S.page === 'login') {
      return login();
    }

    if (!S.user) {

      S.page = 'login';

      return login();
    }

    if (S.page === 'admin') {
      return admin();
    }

    return admin();
  }


  if (S.page === 'home') {
    return home();
  }

  if (S.page === 'lessons') {
    return lessons();
  }

  if (S.page === 'exams') {
    return exams();
  }

  if (S.page === 'info') {
    return info();
  }

  if (S.page === 'studentInfo') {
    return studentInfo();
  }

  if (S.page === 'take') {
    return take();
  }

  if (S.page === 'result') {
    return result();
  }

  if (S.page === 'ranking') {
    return ranking();
  }

  return home();
}


/* =========================================================
   AUTH
========================================================= */

(async () => {

  if (sb) {

    const {
      data: {
        session
      }
    } = await sb.auth.getSession();

    S.user =
      session?.user ||
      null;
  }

  S.page =
    ADMIN_MODE
      ? (
          S.user
            ? 'admin'
            : 'login'
        )
      : 'home';

  render();


  if (sb) {

    sb.auth.onAuthStateChange(
      (_event, session) => {

        S.user =
          session?.user ||
          null;

        if (ADMIN_MODE) {

          S.page =
            S.user
              ? 'admin'
              : 'login';
        }

        render();
      }
    );

  }

})();
