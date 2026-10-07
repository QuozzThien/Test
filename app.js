const C=window.APP_CONFIG||{};
const ADMIN_MODE=window.ADMIN_MODE===true;

const sb=window.supabase?.createClient
  ?window.supabase.createClient(C.SUPABASE_URL,C.SUPABASE_ANON_KEY)
  :null;

const root=document.getElementById('app');

const S={
  page:ADMIN_MODE?'login':'home',
  user:null,
  subject:null,
  lesson:null,
  exam:null,
  questions:[],
  answers:{},
  result:null
};

function esc(s){
  return String(s??'')
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;')
    .replaceAll("'","&#039;");
}

function go(p){
  S.page=p;
  render();
  window.scrollTo(0,0);
}

function layout(body){
  root.innerHTML=`
    <div class="wrap">
      <header class="top">
        <div>
          <div class="brand">KHO TRẮC NGHIỆM ĐA MÔN</div>
          <span class="tag">
            ${ADMIN_MODE?'Khu vực quản trị':'Học sinh làm bài'}
          </span>
        </div>

        <div class="nav">
          ${
            ADMIN_MODE
            ?`
              <button class="btn" onclick="go('admin')">Quản trị</button>
              ${S.user?`<button class="btn" onclick="logout()">Đăng xuất</button>`:''}
            `
            :`
              <button class="btn" onclick="go('home')">Môn học</button>
              <button class="btn" onclick="go('ranking')">Xếp hạng</button>
            `
          }
        </div>
      </header>

      ${body}
    </div>
  `;
}

/* =========================
   PUBLIC
========================= */

async function home(){
  if(!sb)return layout(`
    <section class="card">
      <h2>Không kết nối được Supabase</h2>
    </section>
  `);

  const {data,error}=await sb
    .from('subjects')
    .select('*')
    .order('name');

  if(error){
    return layout(`
      <section class="card">
        <h2>Lỗi tải môn học</h2>
        <p>${esc(error.message)}</p>
      </section>
    `);
  }

  return layout(`
    <section class="hero">
      <h1>Kho trắc nghiệm đa môn</h1>
      <p>Chọn môn học để bắt đầu.</p>
    </section>

    <section class="grid">
      ${(data||[]).map(x=>`
        <button class="card subject"
          onclick='openSubject(${JSON.stringify(x)})'>
          <h2>${esc(x.name)}</h2>
          ${x.description?`<p>${esc(x.description)}</p>`:''}
        </button>
      `).join('')}
    </section>
  `);
}

function openSubject(x){
  S.subject=x;
  go('lessons');
}

async function lessons(){
  const {data,error}=await sb
    .from('lessons')
    .select('*')
    .eq('subject_id',S.subject.id)
    .order('sort_order')
    .order('name');

  if(error)return layout(`
    <section class="card">
      <h2>Lỗi</h2>
      <p>${esc(error.message)}</p>
    </section>
  `);

  return layout(`
    <section class="card">
      <button class="btn" onclick="go('home')">← Quay lại</button>
      <h1>${esc(S.subject.name)}</h1>
      <p>Chọn bài/chủ đề.</p>
    </section>

    <section class="grid">
      ${(data||[]).map(x=>`
        <button class="card"
          onclick='openLesson(${JSON.stringify(x)})'>
          <h2>${esc(x.name)}</h2>
          ${x.description?`<p>${esc(x.description)}</p>`:''}
        </button>
      `).join('')}
    </section>
  `);
}

function openLesson(x){
  S.lesson=x;
  go('exams');
}

async function exams(){
  const {data,error}=await sb
    .from('exams')
    .select('*')
    .eq('lesson_id',S.lesson.id)
    .eq('is_published',true)
    .order('created_at',{ascending:false});

  if(error)return layout(`
    <section class="card">
      <h2>Lỗi</h2>
      <p>${esc(error.message)}</p>
    </section>
  `);

  return layout(`
    <section class="card">
      <button class="btn" onclick="go('lessons')">← Quay lại</button>
      <h1>${esc(S.lesson.name)}</h1>
      <p>Chọn đề thi.</p>
    </section>

    <section class="grid">
      ${(data||[]).map(x=>`
        <button class="card"
          onclick='openExam(${JSON.stringify(x)})'>
          <h2>${esc(x.title||x.name)}</h2>
          ${x.description?`<p>${esc(x.description)}</p>`:''}
          <p>
            ${x.duration_minutes?`${x.duration_minutes} phút`:''}
            ${x.question_count?` • ${x.question_count} câu`:''}
          </p>
        </button>
      `).join('')}
    </section>
  `);
}

function openExam(x){
  S.exam=x;
  go('info');
}

function info(){
  return layout(`
    <section class="card">
      <button class="btn" onclick="go('exams')">← Quay lại</button>

      <h1>${esc(S.exam.title||S.exam.name)}</h1>

      ${
        S.exam.description
        ?`<p>${esc(S.exam.description)}</p>`
        :''
      }

      <div class="info-box">
        <p><b>Thời gian:</b>
          ${S.exam.duration_minutes||0} phút
        </p>

        <p><b>Số câu:</b>
          ${S.exam.question_count||'Theo đề'}
        </p>

        <p><b>Số lần làm:</b>
          ${
            S.exam.max_attempts===0||S.exam.max_attempts==null
            ?'Không giới hạn'
            :S.exam.max_attempts
          }
        </p>
      </div>

      <button class="btn primary" onclick="startExam()">
        Bắt đầu làm bài
      </button>
    </section>
  `);
}

async function startExam(){
  const {data,error}=await sb
    .from('questions')
    .select('*')
    .eq('exam_id',S.exam.id)
    .order('id');

  if(error){
    alert(error.message);
    return;
  }

  S.questions=data||[];
  S.answers={};

  if(S.exam.question_count && S.questions.length>S.exam.question_count){
    S.questions=S.questions
      .sort(()=>Math.random()-0.5)
      .slice(0,S.exam.question_count);
  }

  go('take');
}

function take(){
  if(!S.questions.length){
    return layout(`
      <section class="card">
        <h2>Đề chưa có câu hỏi</h2>
        <button class="btn" onclick="go('exams')">Quay lại</button>
      </section>
    `);
  }

  return layout(`
    <section class="card">
      <h1>${esc(S.exam.title||S.exam.name)}</h1>

      <div class="question-list">
        ${S.questions.map((q,i)=>`
          <div class="question card">
            <h3>Câu ${i+1}. ${esc(q.question_text||q.question||'')}</h3>

            <div class="options">
              ${['A','B','C','D'].map(letter=>{
                const key='option_'+letter.toLowerCase();

                return `
                  <label class="option">
                    <input
                      type="radio"
                      name="q${q.id}"
                      value="${letter}"
                      ${S.answers[q.id]===letter?'checked':''}
                      onchange="S.answers[${JSON.stringify(q.id)}]='${letter}'"
                    >
                    <span>
                      <b>${letter}.</b>
                      ${esc(q[key]||'')}
                    </span>
                  </label>
                `;
              }).join('')}
            </div>
          </div>
        `).join('')}
      </div>

      <button class="btn primary" onclick="submitExam()">
        Nộp bài
      </button>
    </section>
  `);
}

async function submitExam(){
  const name=prompt('Nhập họ và tên:');
  if(!name)return;

  const className=prompt('Nhập lớp:');
  if(!className)return;

  let correct=0;

  for(const q of S.questions){
    if(S.answers[q.id]===q.correct_answer){
      correct++;
    }
  }

  const score=Number(
    ((correct/S.questions.length)*10).toFixed(2)
  );

  S.result={
    name,
    className,
    correct,
    total:S.questions.length,
    score
  };

  try{
    await sb.functions.invoke('submit-attempt',{
      body:{
        exam_id:S.exam.id,
        student_name:name,
        student_class:className,
        answers:S.answers,
        score,
        correct_count:correct,
        total_questions:S.questions.length
      }
    });
  }catch(e){
    console.error(e);
  }

  go('result');
}

function result(){
  if(!S.result){
    return layout(`
      <section class="card">
        <h2>Không có kết quả</h2>
      </section>
    `);
  }

  return layout(`
    <section class="card result">
      <h1>Đã nộp bài</h1>

      <h2>${esc(S.result.name)}</h2>
      <p>Lớp: ${esc(S.result.className)}</p>

      <div class="score">
        ${S.result.score}/10
      </div>

      <p>
        Đúng ${S.result.correct}/${S.result.total} câu
      </p>

      <div>
        <button class="btn" onclick="go('home')">
          Về trang chủ
        </button>

        <button class="btn" onclick="go('ranking')">
          Xem xếp hạng
        </button>
      </div>
    </section>
  `);
}

async function ranking(){
  const {data,error}=await sb
    .from('attempts')
    .select('*')
    .order('score',{ascending:false})
    .order('created_at',{ascending:true})
    .limit(100);

  if(error)return layout(`
    <section class="card">
      <h2>Không tải được xếp hạng</h2>
      <p>${esc(error.message)}</p>
    </section>
  `);

  return layout(`
    <section class="card">
      <h1>Xếp hạng</h1>

      <div class="table-wrap">
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
            ${(data||[]).map((x,i)=>`
              <tr>
                <td>${i+1}</td>
                <td>${esc(x.student_name||'')}</td>
                <td>${esc(x.student_class||'')}</td>
                <td><b>${x.score}</b></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </section>
  `);
}

/* =========================
   ADMIN LOGIN
========================= */

function login(){
  return layout(`
    <section class="card login-card">
      <h1>Quản trị</h1>

      <p>Đăng nhập tài khoản quản trị.</p>

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

      <button class="btn primary" onclick="loginAdmin()">
        Đăng nhập
      </button>

      <p id="loginMsg"></p>
    </section>
  `);
}

async function loginAdmin(){
  const email=document.getElementById('loginEmail').value.trim();
  const password=document.getElementById('loginPassword').value;

  if(!email||!password){
    alert('Vui lòng nhập đầy đủ email và mật khẩu.');
    return;
  }

  const {data,error}=await sb.auth.signInWithPassword({
    email,
    password
  });

  if(error){
    alert(error.message);
    return;
  }

  S.user=data.user;
  S.page='admin';
  render();
}

async function logout(){
  await sb.auth.signOut();
  S.user=null;
  S.page=ADMIN_MODE?'login':'home';
  render();
}

/* =========================
   ADMIN
========================= */

async function admin(){
  if(!S.user){
    S.page='login';
    return login();
  }

  return layout(`
    <section class="hero">
      <h1>Quản trị hệ thống</h1>
      <p>Quản lý môn học, bài học, câu hỏi và đề thi.</p>
    </section>

    <section class="grid">
      <button class="card" onclick="adminSubjects()">
        <h2>Môn học</h2>
        <p>Quản lý các môn.</p>
      </button>

      <button class="card" onclick="adminQuestions()">
        <h2>Ngân hàng câu hỏi</h2>
        <p>Quản lý câu hỏi.</p>
      </button>

      <button class="card" onclick="adminExams()">
        <h2>Đề thi</h2>
        <p>Tạo và quản lý đề.</p>
      </button>

      <button class="card" onclick="adminResults()">
        <h2>Kết quả</h2>
        <p>Xem bài làm của học sinh.</p>
      </button>
    </section>
  `);
}

async function adminSubjects(){
  const {data,error}=await sb
    .from('subjects')
    .select('*')
    .order('name');

  if(error){
    alert(error.message);
    return;
  }

  layout(`
    <section class="card">
      <button class="btn" onclick="go('admin')">← Quản trị</button>

      <h1>Quản lý môn học</h1>

      <input id="subjectName"
        class="input"
        placeholder="Tên môn học">

      <input id="subjectDesc"
        class="input"
        placeholder="Mô tả">

      <button class="btn primary" onclick="addSubject()">
        Thêm môn
      </button>
    </section>

    <section class="grid">
      ${(data||[]).map(x=>`
        <div class="card">
          <h2>${esc(x.name)}</h2>
          <p>${esc(x.description||'')}</p>
        </div>
      `).join('')}
    </section>
  `);
}

async function addSubject(){
  const name=document.getElementById('subjectName').value.trim();
  const description=document.getElementById('subjectDesc').value.trim();

  if(!name){
    alert('Nhập tên môn.');
    return;
  }

  const {error}=await sb
    .from('subjects')
    .insert({name,description});

  if(error){
    alert(error.message);
    return;
  }

  adminSubjects();
}

async function adminQuestions(){
  const {data,error}=await sb
    .from('questions')
    .select('*')
    .order('id',{ascending:false})
    .limit(100);

  if(error){
    alert(error.message);
    return;
  }

  layout(`
    <section class="card">
      <button class="btn" onclick="go('admin')">← Quản trị</button>

      <h1>Ngân hàng câu hỏi</h1>

      <button class="btn primary"
        onclick="alert('Bạn có thể dùng chức năng AI để tạo câu hỏi.')">
        AI tạo câu hỏi
      </button>
    </section>

    <section>
      ${(data||[]).map((q,i)=>`
        <div class="card">
          <b>Câu ${i+1}</b>
          <p>${esc(q.question_text||q.question||'')}</p>

          <p>A. ${esc(q.option_a||'')}</p>
          <p>B. ${esc(q.option_b||'')}</p>
          <p>C. ${esc(q.option_c||'')}</p>
          <p>D. ${esc(q.option_d||'')}</p>

          <p>
            Đáp án:
            <b>${esc(q.correct_answer||'')}</b>
          </p>
        </div>
      `).join('')}
    </section>
  `);
}

async function adminExams(){
  const {data,error}=await sb
    .from('exams')
    .select('*')
    .order('created_at',{ascending:false});

  if(error){
    alert(error.message);
    return;
  }

  layout(`
    <section class="card">
      <button class="btn" onclick="go('admin')">← Quản trị</button>

      <h1>Quản lý đề thi</h1>
    </section>

    <section class="grid">
      ${(data||[]).map(x=>`
        <div class="card">
          <h2>${esc(x.title||x.name)}</h2>

          <p>
            ${x.question_count||0} câu
            ${x.duration_minutes?` • ${x.duration_minutes} phút`:''}
          </p>

          <p>
            Trạng thái:
            ${x.is_published?'Đang mở':'Đang đóng'}
          </p>
        </div>
      `).join('')}
    </section>
  `);
}

async function adminResults(){
  const {data,error}=await sb
    .from('attempts')
    .select('*')
    .order('created_at',{ascending:false})
    .limit(200);

  if(error){
    alert(error.message);
    return;
  }

  layout(`
    <section class="card">
      <button class="btn" onclick="go('admin')">← Quản trị</button>

      <h1>Kết quả học sinh</h1>

      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Họ tên</th>
              <th>Lớp</th>
              <th>Điểm</th>
              <th>Thời gian</th>
            </tr>
          </thead>

          <tbody>
            ${(data||[]).map(x=>`
              <tr>
                <td>${esc(x.student_name||'')}</td>
                <td>${esc(x.student_class||'')}</td>
                <td><b>${x.score}</b></td>
                <td>${esc(x.created_at||'')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </section>
  `);
}

/* =========================
   RENDER
========================= */

async function render(){

  if(ADMIN_MODE){

    if(S.page==='login')
      return login();

    if(S.page==='admin')
      return admin();

    if(!S.user){
      S.page='login';
      return login();
    }

    return admin();
  }

  if(S.page==='home')
    return home();

  if(S.page==='lessons')
    return lessons();

  if(S.page==='exams')
    return exams();

  if(S.page==='info')
    return info();

  if(S.page==='take')
    return take();

  if(S.page==='result')
    return result();

  if(S.page==='ranking')
    return ranking();
}

/* =========================
   AUTH
========================= */

(async()=>{

  if(sb){
    const {
      data:{session}
    }=await sb.auth.getSession();

    S.user=session?.user||null;
  }

  S.page=ADMIN_MODE
    ?(S.user?'admin':'login')
    :'home';

  render();

  if(sb){

    sb.auth.onAuthStateChange(
      (_e,session)=>{

        S.user=session?.user||null;

        if(ADMIN_MODE){
          S.page=S.user?'admin':'login';
        }

        render();
      }
    );

  }

})();
