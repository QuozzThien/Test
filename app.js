const C = window.APP_CONFIG || {};
const ADMIN_MODE = window.ADMIN_MODE === true;

const sb = window.supabase?.createClient
  ? window.supabase.createClient(C.SUPABASE_URL, C.SUPABASE_ANON_KEY)
  : null;

window.sb = sb;

const root = document.getElementById("app");

const S = {
  page: ADMIN_MODE ? "login" : "home",
  user: null,
  subject: null,
  lesson: null,
  exam: null,
  questions: [],
  answers: {},
  result: null
};

window.S = S;

function esc(x){
  return String(x ?? "").replace(/[&<>"']/g,m=>({
    "&":"&amp;",
    "<":"&lt;",
    ">":"&gt;",
    '"':"&quot;",
    "'":"&#39;"
  }[m]));
}

function layout(body){
  root.innerHTML = `
    <div class="wrap">
      <header class="top">
        <div>
          <div class="brand">Luyện Thi</div>
        </div>

        <div class="nav">
          ${ADMIN_MODE ? `
            <button class="btn" onclick="admin()">Quản trị</button>
          ` : `
            <button class="btn" onclick="go('home')">Môn học</button>
          `}
        </div>
      </header>

      ${body}
    </div>
  `;
}

function go(page){
  S.page = page;

  if(page === "home") return home();
  if(page === "lessons") return lessons();
  if(page === "exams") return exams();
  if(page === "info") return info();
  if(page === "take") return take();
  if(page === "result") return result();
  if(page === "ranking") return ranking();

  if(page === "admin") return admin();
  if(page === "login") return login();

  if(page === "subjects") return subjectManager();
  if(page === "questions") return questionPanel();
  if(page === "examsAdmin") return examPanel();
  if(page === "results") return adminResults();

  home();
}

/* =========================================================
   STUDENT - MÔN HỌC
   ========================================================= */

async function home(){
  if(!sb){
    layout(`
      <div class="card notice">
        Không thể kết nối Supabase.
      </div>
    `);
    return;
  }

  layout(`
    <section class="card">
      <h2>Môn học</h2>
      <p class="muted">Chọn môn để bắt đầu luyện thi.</p>

      <div id="subjects" class="subjects">
        <div class="empty muted">
          Đang tải môn học...
        </div>
      </div>
    </section>
  `);

  const {data,error} = await sb
    .from("subjects")
    .select("*")
    .eq("is_active",true)
    .order("sort_order",{ascending:true})
    .order("name",{ascending:true});

  const box = document.getElementById("subjects");

  if(error){
    box.innerHTML = `
      <div class="notice">
        Không tải được môn học: ${esc(error.message)}
      </div>
    `;
    return;
  }

  if(!data?.length){
    box.innerHTML = `
      <div class="empty" style="grid-column:1/-1">
        <h3>Chưa có môn học</h3>
        <p class="muted">
          Hiện chưa có môn học nào được mở.
        </p>
      </div>
    `;
    return;
  }

  box.innerHTML = data.map(s=>`
    <button
      class="subject"
      style="--subject-color:${esc(s.color || "#7457ff")}"
      onclick="selectSubject('${esc(s.id)}')"
    >
      <div
        class="subject-icon"
        style="background:${esc(s.color || "#7457ff")}22"
      >
        ${esc(s.icon || "📚")}
      </div>

      <div class="subject-body">
        <h3>${esc(s.name)}</h3>
        <p>${esc(s.description || "Luyện tập trắc nghiệm")}</p>
      </div>

      <div class="arrow">›</div>
    </button>
  `).join("");
}

async function selectSubject(id){
  const {data,error} = await sb
    .from("subjects")
    .select("*")
    .eq("id",id)
    .single();

  if(error){
    alert(error.message);
    return;
  }

  S.subject = data;
  S.lesson = null;
  S.exam = null;

  lessons();
}

/* =========================================================
   LESSON
   ========================================================= */

async function lessons(){
  if(!S.subject){
    return home();
  }

  layout(`
    <section class="card">
      <button class="btn" onclick="go('home')">← Môn học</button>

      <h2 style="margin-top:14px">
        ${esc(S.subject.icon || "📚")}
        ${esc(S.subject.name)}
      </h2>

      <div id="lessonList">
        <div class="empty muted">Đang tải...</div>
      </div>
    </section>
  `);

  const {data,error} = await sb
    .from("lessons")
    .select("*")
    .eq("subject_id",S.subject.id)
    .order("sort_order",{ascending:true})
    .order("name",{ascending:true});

  const box = document.getElementById("lessonList");

  if(error){
    box.innerHTML = `
      <div class="notice">
        ${esc(error.message)}
      </div>
    `;
    return;
  }

  if(!data?.length){
    box.innerHTML = `
      <div class="empty">
        <h3>Chưa có bài học</h3>
        <p class="muted">
          Môn này hiện chưa có bài học.
        </p>
      </div>
    `;
    return;
  }

  box.innerHTML = data.map(l=>`
    <button
      class="exam"
      onclick="selectLesson('${esc(l.id)}')"
    >
      <h3>${esc(l.name)}</h3>
      <div class="muted">
        ${esc(l.description || "")}
      </div>
    </button>
  `).join("");
}

async function selectLesson(id){
  const {data,error} = await sb
    .from("lessons")
    .select("*")
    .eq("id",id)
    .single();

  if(error){
    alert(error.message);
    return;
  }

  S.lesson = data;
  exams();
}

/* =========================================================
   EXAMS
   ========================================================= */

async function exams(){
  if(!S.lesson){
    return lessons();
  }

  layout(`
    <section class="card">
      <button class="btn" onclick="go('lessons')">← Bài học</button>

      <h2 style="margin-top:14px">
        ${esc(S.lesson.name)}
      </h2>

      <div id="examList">
        <div class="empty muted">
          Đang tải đề...
        </div>
      </div>
    </section>
  `);

  const {data,error} = await sb
    .from("exams")
    .select("*")
    .eq("lesson_id",S.lesson.id)
    .eq("is_open",true)
    .order("created_at",{ascending:false});

  const box = document.getElementById("examList");

  if(error){
    box.innerHTML = `
      <div class="notice">${esc(error.message)}</div>
    `;
    return;
  }

  if(!data?.length){
    box.innerHTML = `
      <div class="empty">
        <h3>Chưa có đề thi</h3>
      </div>
    `;
    return;
  }

  box.innerHTML = data.map(e=>`
    <button
      class="exam"
      onclick="selectExam('${esc(e.id)}')"
    >
      <h3>${esc(e.title || e.name || "Đề thi")}</h3>

      <div class="muted">
        ${Number(e.question_count || 0)} câu
        ${e.time_limit ? ` • ${Number(e.time_limit)} phút` : ""}
      </div>
    </button>
  `).join("");
}

async function selectExam(id){
  const {data,error} = await sb
    .from("exams")
    .select("*")
    .eq("id",id)
    .single();

  if(error){
    alert(error.message);
    return;
  }

  S.exam = data;
  info();
}

/* =========================================================
   INFO
   ========================================================= */

function info(){
  if(!S.exam){
    return exams();
  }

  layout(`
    <section class="card">
      <button class="btn" onclick="go('exams')">← Đề thi</button>

      <h2 style="margin-top:14px">
        ${esc(S.exam.title || S.exam.name || "Đề thi")}
      </h2>

      <div class="field">
        <label>Họ và tên</label>
        <input id="studentName" placeholder="Nhập họ và tên">
      </div>

      <div class="field">
        <label>Lớp</label>
        <input id="studentClass" placeholder="Ví dụ: 12A3">
      </div>

      <button class="btn primary" onclick="startExam()">
        Bắt đầu làm bài
      </button>
    </section>
  `);
}

/* =========================================================
   START
   ========================================================= */

async function startExam(){
  const name = document.getElementById("studentName")?.value.trim();
  const cls = document.getElementById("studentClass")?.value.trim();

  if(!name || !cls){
    alert("Vui lòng nhập họ tên và lớp.");
    return;
  }

  S.studentName = name;
  S.studentClass = cls;

  const {data,error} = await sb
    .from("exam_questions")
    .select(`
      *,
      question:questions(*)
    `)
    .eq("exam_id",S.exam.id)
    .order("sort_order",{ascending:true});

  if(error){
    alert(error.message);
    return;
  }

  S.questions = (data || [])
    .map(x=>x.question)
    .filter(Boolean);

  if(!S.questions.length){
    alert("Đề thi chưa có câu hỏi.");
    return;
  }

  S.answers = {};
  S.startedAt = Date.now();

  take();
}

/* =========================================================
   TAKE
   ========================================================= */

function take(){
  if(!S.questions.length){
    return exams();
  }

  layout(`
    <section class="card">
      <div class="row">
        <div>
          <h2>${esc(S.exam.title || S.exam.name)}</h2>
          <div class="muted">
            ${esc(S.studentName)} • ${esc(S.studentClass)}
          </div>
        </div>

        <div id="timer" class="timer"></div>
      </div>
    </section>

    <section class="card">
      ${S.questions.map((q,i)=>`
        <div class="question-card">
          <h3>
            Câu ${i+1}. ${esc(q.question || q.content || "")}
          </h3>

          ${["A","B","C","D"].map(letter=>{
            const value =
              q["option_"+letter.toLowerCase()] ??
              q[letter.toLowerCase()] ??
              q["choice_"+letter.toLowerCase()] ??
              "";

            return `
              <button
                class="option ${S.answers[q.id]===letter ? "sel":""}"
                onclick="answer('${esc(q.id)}','${letter}')"
              >
                <b>${letter}.</b>
                ${esc(value)}
              </button>
            `;
          }).join("")}
        </div>
      `).join("")}

      <button class="btn primary" onclick="submitExam()">
        Nộp bài
      </button>
    </section>
  `);

  startTimer();
}

function answer(id,value){
  S.answers[id] = value;
  take();
}

let timerInterval = null;

function startTimer(){
  clearInterval(timerInterval);

  const minutes = Number(S.exam?.time_limit || 0);

  if(!minutes){
    const timer = document.getElementById("timer");
    if(timer) timer.textContent = "Không giới hạn";
    return;
  }

  const end = S.startedAt + minutes * 60000;

  function tick(){
    const remain = Math.max(0,end-Date.now());

    const min = Math.floor(remain/60000);
    const sec = Math.floor((remain%60000)/1000);

    const timer = document.getElementById("timer");

    if(timer){
      timer.textContent =
        `${String(min).padStart(2,"0")}:${String(sec).padStart(2,"0")}`;
    }

    if(remain <= 0){
      clearInterval(timerInterval);
      submitExam(true);
    }
  }

  tick();
  timerInterval = setInterval(tick,1000);
}

/* =========================================================
   SUBMIT
   ========================================================= */

async function submitExam(auto=false){
  clearInterval(timerInterval);

  if(!auto){
    const ok = confirm("Bạn chắc chắn muốn nộp bài?");
    if(!ok) return;

    take();
  }

  let correct = 0;

  for(const q of S.questions){
    const answer = S.answers[q.id];

    if(answer && answer === q.correct_answer){
      correct++;
    }
  }

  const total = S.questions.length;
  const score = total ? (correct / total) * 10 : 0;

  S.result = {
    correct,
    total,
    score,
    name:S.studentName,
    class:S.studentClass
  };

  try{
    await sb.from("results").insert({
      exam_id:S.exam.id,
      student_name:S.studentName,
      student_class:S.studentClass,
      score:Number(score.toFixed(2)),
      correct_count:correct,
      total_questions:total
    });
  }catch(e){
    console.error(e);
  }

  result();
}

/* =========================================================
   RESULT
   ========================================================= */

function result(){
  const r = S.result;

  layout(`
    <section class="card center">
      <h1>Hoàn thành bài thi</h1>

      <div class="kpi" style="justify-content:center;margin:20px 0">
        <span>Đúng: ${r.correct}/${r.total}</span>
        <span>Điểm: ${r.score.toFixed(2)}</span>
      </div>

      <p>
        ${esc(r.name)} • ${esc(r.class)}
      </p>

      <div class="row" style="justify-content:center">
        <button class="btn primary" onclick="go('home')">
          Về môn học
        </button>

        <button class="btn" onclick="ranking()">
          Xếp hạng
        </button>
      </div>
    </section>
  `);
}

/* =========================================================
   RANKING
   ========================================================= */

async function ranking(){
  if(!S.exam){
    return home();
  }

  layout(`
    <section class="card">
      <button class="btn" onclick="result()">← Kết quả</button>

      <h2 style="margin-top:14px">
        Xếp hạng
      </h2>

      <div id="rankingList">
        <div class="empty muted">Đang tải...</div>
      </div>
    </section>
  `);

  const {data,error} = await sb
    .from("results")
    .select("*")
    .eq("exam_id",S.exam.id)
    .order("score",{ascending:false})
    .limit(100);

  const box = document.getElementById("rankingList");

  if(error){
    box.innerHTML =
      `<div class="notice">${esc(error.message)}</div>`;
    return;
  }

  box.innerHTML = `
    <table class="table">
      <thead>
        <tr>
          <th>#</th>
          <th>Học sinh</th>
          <th>Lớp</th>
          <th>Điểm</th>
        </tr>
      </thead>

      <tbody>
        ${(data || []).map((r,i)=>`
          <tr>
            <td>${i+1}</td>
            <td>${esc(r.student_name)}</td>
            <td>${esc(r.student_class)}</td>
            <td>${Number(r.score).toFixed(2)}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

/* =========================================================
   ADMIN LOGIN
   ========================================================= */

function login(){
  layout(`
    <section class="card" style="max-width:450px;margin:auto">
      <h2>Admin</h2>

      <div class="field">
        <label>Email</label>
        <input id="loginEmail" type="email">
      </div>

      <div class="field">
        <label>Mật khẩu</label>
        <input id="loginPassword" type="password">
      </div>

      <button class="btn primary" onclick="doLogin()">
        Đăng nhập
      </button>
    </section>
  `);
}

async function doLogin(){
  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value;

  const {data,error} =
    await sb.auth.signInWithPassword({email,password});

  if(error){
    alert(error.message);
    return;
  }

  S.user = data.user;
  admin();
}

async function logout(){
  await sb.auth.signOut();
  S.user = null;
  login();
}

/* =========================================================
   ADMIN
   ========================================================= */

function admin(){
  layout(`
    <section class="card">
      <div class="admin-head">
        <div>
          <h2>Quản trị</h2>
          <p class="muted">
            Quản lý toàn bộ hệ thống Luyện Thi
          </p>
        </div>

        <button class="btn danger" onclick="logout()">
          Đăng xuất
        </button>
      </div>
    </section>

    <section class="admin-grid">

      <button class="admin-card" onclick="subjectManager()">
        <span>📚</span>
        <b>Môn học</b>
        <small>Thêm, sửa, xóa, ẩn/hiện môn</small>
      </button>

      <button class="admin-card" onclick="questionPanel()">
        <span>❓</span>
        <b>Câu hỏi</b>
        <small>Quản lý ngân hàng câu hỏi</small>
      </button>

      <button class="admin-card" onclick="examPanel()">
        <span>📝</span>
        <b>Đề thi</b>
        <small>Tạo và quản lý đề thi</small>
      </button>

      <button class="admin-card" onclick="aiPanel()">
        <span>🤖</span>
        <b>AI</b>
        <small>Tạo câu hỏi bằng AI</small>
      </button>

      <button class="admin-card" onclick="adminResults()">
        <span>📊</span>
        <b>Kết quả</b>
        <small>Xem kết quả học sinh</small>
      </button>

    </section>
  `);
}

/* =========================================================
   ADMIN SUBJECT MANAGER
   ========================================================= */

async function subjectManager(){
  layout(`
    <section class="card">
      <div class="admin-head">
        <div>
          <h2>Quản lý môn học</h2>
          <p class="muted">
            Môn được bật sẽ xuất hiện trên trang học sinh.
          </p>
        </div>

        <button class="btn" onclick="admin()">← Quản trị</button>
      </div>

      <div class="row" style="margin-top:12px">
        <button class="btn primary" onclick="createSubjectForm()">
          + Thêm môn
        </button>

        <button class="btn" onclick="aiCreateSubject()">
          🤖 Tạo môn bằng AI
        </button>
      </div>
    </section>

    <section class="card">
      <div id="adminSubjects">
        <div class="empty muted">Đang tải...</div>
      </div>
    </section>

    <section id="subjectEditor"></section>
  `);

  await loadAdminSubjects();
}

async function loadAdminSubjects(){
  const box = document.getElementById("adminSubjects");

  const {data,error} = await sb
    .from("subjects")
    .select("*")
    .order("sort_order",{ascending:true})
    .order("name",{ascending:true});

  if(error){
    box.innerHTML =
      `<div class="notice">${esc(error.message)}</div>`;
    return;
  }

  if(!data?.length){
    box.innerHTML = `
      <div class="empty">
        <h3>Chưa có môn học</h3>
        <p class="muted">
          Hãy thêm môn học đầu tiên.
        </p>
      </div>
    `;
    return;
  }

  box.innerHTML = `
    <div class="subject-admin-list">
      ${data.map(s=>`
        <div class="subject-admin-item">

          <div
            class="subject-admin-icon"
            style="
              background:${esc(s.color || "#7457ff")}22;
              border:1px solid ${esc(s.color || "#7457ff")}66
            "
          >
            ${esc(s.icon || "📚")}
          </div>

          <div class="subject-admin-info">
            <b>${esc(s.name)}</b>
            <small>${esc(s.description || "Chưa có mô tả")}</small>

            <div>
              <span class="${s.is_active ? "status-active":"status-hidden"}">
                ${s.is_active ? "● Đang hiển thị":"● Đang ẩn"}
              </span>
            </div>
          </div>

          <div class="subject-admin-actions">
            <button
              class="btn"
              onclick="editSubject('${esc(s.id)}')"
            >
              Sửa
            </button>

            <button
              class="btn ${s.is_active ? "danger":"success"}"
              onclick="toggleSubject('${esc(s.id)}',${!!s.is_active})"
            >
              ${s.is_active ? "Ẩn":"Hiện"}
            </button>

            <button
              class="btn danger"
              onclick="deleteSubject('${esc(s.id)}')"
            >
              Xóa
            </button>
          </div>

        </div>
      `).join("")}
    </div>
  `;
}

function createSubjectForm(subject=null){
  const edit = !!subject;

  document.getElementById("subjectEditor").innerHTML = `
    <section class="card">

      <div class="row">
        <h2>${edit ? "Sửa môn học":"Thêm môn học"}</h2>

        <button
          class="btn right"
          onclick="closeSubjectForm()"
        >
          Đóng
        </button>
      </div>

      <div class="field">
        <label>Tên môn</label>
        <input
          id="subjectName"
          value="${esc(subject?.name || "")}"
          placeholder="Ví dụ: Toán"
        >
      </div>

      <div class="field">
        <label>Icon</label>
        <input
          id="subjectIcon"
          value="${esc(subject?.icon || "📚")}"
          maxlength="10"
          placeholder="📐"
        >
      </div>

      <div class="field">
        <label>Màu</label>
        <input
          id="subjectColor"
          type="color"
          value="${esc(subject?.color || "#7457ff")}"
          style="height:45px;padding:4px"
        >
      </div>

      <div class="field">
        <label>Mô tả</label>
        <textarea
          id="subjectDescription"
          placeholder="Mô tả ngắn"
        >${esc(subject?.description || "")}</textarea>
      </div>

      <div class="field">
        <label>Thứ tự</label>
        <input
          id="subjectOrder"
          type="number"
          value="${Number(subject?.sort_order || 0)}"
        >
      </div>

      <label class="row">
        <input
          id="subjectActive"
          type="checkbox"
          ${subject?.is_active !== false ? "checked":""}
          style="width:auto"
        >
        Hiển thị cho học sinh
      </label>

      <div class="row" style="margin-top:12px">

        <button
          class="btn primary"
          onclick="saveSubject(${edit ? `'${esc(subject.id)}'`:"null"})"
        >
          ${edit ? "Lưu thay đổi":"Tạo môn"}
        </button>

        <button
          class="btn"
          onclick="closeSubjectForm()"
        >
          Hủy
        </button>

      </div>
    </section>
  `;

  document
    .getElementById("subjectEditor")
    .scrollIntoView({behavior:"smooth"});
}

async function editSubject(id){
  const {data,error} = await sb
    .from("subjects")
    .select("*")
    .eq("id",id)
    .single();

  if(error){
    alert(error.message);
    return;
  }

  createSubjectForm(data);
}

async function saveSubject(id){
  const name =
    document.getElementById("subjectName")?.value.trim();

  if(!name){
    alert("Vui lòng nhập tên môn.");
    return;
  }

  const payload = {
    name,
    icon:
      document.getElementById("subjectIcon")?.value.trim() ||
      "📚",

    color:
      document.getElementById("subjectColor")?.value ||
      "#7457ff",

    description:
      document.getElementById("subjectDescription")?.value.trim() ||
      "",

    sort_order:
      Number(document.getElementById("subjectOrder")?.value || 0),

    is_active:
      !!document.getElementById("subjectActive")?.checked
  };

  let result;

  if(id){
    result = await sb
      .from("subjects")
      .update(payload)
      .eq("id",id);
  }else{
    const {data:userData} = await sb.auth.getUser();

    if(userData?.user?.id){
      payload.created_by = userData.user.id;
    }

    result = await sb
      .from("subjects")
      .insert(payload);
  }

  if(result.error){
    alert("Không lưu được môn học:\n\n"+result.error.message);
    return;
  }

  closeSubjectForm();
  await loadAdminSubjects();
}

async function toggleSubject(id,current){
  const {error} = await sb
    .from("subjects")
    .update({is_active:!current})
    .eq("id",id);

  if(error){
    alert(error.message);
    return;
  }

  loadAdminSubjects();
}

async function deleteSubject(id){
  const {data} = await sb
    .from("subjects")
    .select("name")
    .eq("id",id)
    .single();

  if(!data) return;

  if(!confirm(`Xóa môn "${data.name}"?`)){
    return;
  }

  const {error} = await sb
    .from("subjects")
    .delete()
    .eq("id",id);

  if(error){
    alert(
      "Không thể xóa môn.\n\n"+
      error.message+
      "\n\nNếu môn đã có dữ liệu, hãy dùng Ẩn thay vì Xóa."
    );
    return;
  }

  loadAdminSubjects();
}

function closeSubjectForm(){
  const box = document.getElementById("subjectEditor");
  if(box) box.innerHTML = "";
}

/* =========================================================
   FALLBACK ADMIN MODULES
   ========================================================= */

function questionPanel(){
  if(window.questionManager){
    return window.questionManager();
  }

  layout(`
    <section class="card">
      <button class="btn" onclick="admin()">← Quản trị</button>
      <h2 style="margin-top:14px">Ngân hàng câu hỏi</h2>
      <div class="empty muted">
        Module câu hỏi đang được tải...
      </div>
    </section>
  `);
}

function examPanel(){
  if(window.examManager){
    return window.examManager();
  }

  layout(`
    <section class="card">
      <button class="btn" onclick="admin()">← Quản trị</button>
      <h2 style="margin-top:14px">Đề thi</h2>
      <div class="empty muted">
        Module đề thi đang được tải...
      </div>
    </section>
  `);
}

function adminResults(){
  layout(`
    <section class="card">
      <button class="btn" onclick="admin()">← Quản trị</button>

      <h2 style="margin-top:14px">
        Kết quả
      </h2>

      <div id="resultsBox">
        <div class="empty muted">
          Đang tải...
        </div>
      </div>
    </section>
  `);

  loadAdminResults();
}

async function loadAdminResults(){
  const box = document.getElementById("resultsBox");

  const {data,error} = await sb
    .from("results")
    .select("*")
    .order("created_at",{ascending:false})
    .limit(200);

  if(error){
    box.innerHTML =
      `<div class="notice">${esc(error.message)}</div>`;
    return;
  }

  box.innerHTML = `
    <table class="table">
      <thead>
        <tr>
          <th>Học sinh</th>
          <th>Lớp</th>
          <th>Điểm</th>
          <th>Đúng</th>
        </tr>
      </thead>

      <tbody>
        ${(data || []).map(r=>`
          <tr>
            <td>${esc(r.student_name)}</td>
            <td>${esc(r.student_class)}</td>
            <td>${Number(r.score).toFixed(2)}</td>
            <td>
              ${r.correct_count}/${r.total_questions}
            </td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

/* =========================================================
   INIT
   ========================================================= */

async function init(){
  if(!sb){
    root.innerHTML = `
      <div class="wrap">
        <div class="card notice">
          Không thể khởi tạo Supabase.
          Kiểm tra config.js.
        </div>
      </div>
    `;
    return;
  }

  if(ADMIN_MODE){
    const {data} = await sb.auth.getSession();

    if(data?.session){
      S.user = data.session.user;
      admin();
    }else{
      login();
    }

    return;
  }

  home();
}

init();

/* expose */
window.go = go;
window.home = home;
window.lessons = lessons;
window.exams = exams;
window.info = info;
window.startExam = startExam;
window.take = take;
window.answer = answer;
window.submitExam = submitExam;
window.result = result;
window.ranking = ranking;
window.selectSubject = selectSubject;
window.selectLesson = selectLesson;
window.selectExam = selectExam;

window.login = login;
window.doLogin = doLogin;
window.logout = logout;
window.admin = admin;

window.subjectManager = subjectManager;
window.createSubjectForm = createSubjectForm;
window.editSubject = editSubject;
window.saveSubject = saveSubject;
window.toggleSubject = toggleSubject;
window.deleteSubject = deleteSubject;
window.closeSubjectForm = closeSubjectForm;
window.questionPanel = questionPanel;
window.examPanel = examPanel;
window.adminResults = adminResults;
