const C=window.APP_CONFIG||{};
const ADMIN_MODE=window.ADMIN_MODE===true;

let sb=null;
let SUPABASE_INIT_ERROR=null;

function initSupabase(){
  try{
    if(
      !C.SUPABASE_URL||
      !C.SUPABASE_ANON_KEY||
      String(C.SUPABASE_ANON_KEY).includes('DAN_')
    ){
      throw new Error('Thiếu SUPABASE_URL hoặc SUPABASE_ANON_KEY trong config.js');
    }

    if(
      !window.supabase||
      typeof window.supabase.createClient!=='function'
    ){
      throw new Error('Không tải được thư viện Supabase JS.');
    }

    sb=window.supabase.createClient(
      C.SUPABASE_URL,
      C.SUPABASE_ANON_KEY
    );

  }catch(e){
    SUPABASE_INIT_ERROR=e;
    sb=null;
  }
}

initSupabase();

let S={
  page:'home',
  subject:null,
  lesson:null,
  exam:null,
  attempt:null,
  answers:{},
  seconds:0,
  timer:null,
  user:null,
  result:null
};

window.TRACNGHIEM={
  get sb(){return sb},
  config:C,
  state:S,
  get initError(){return SUPABASE_INIT_ERROR},
  go
};

const esc=x=>
  String(x??'').replace(
    /[&<>\"']/g,
    m=>({
      '&':'&amp;',
      '<':'&lt;',
      '>':'&gt;',
      '\"':'&quot;',
      "'":'&#39;'
    }[m])
  );

const root=document.getElementById('app');


/* =========================================================
   GIAO DIỆN CHUNG
========================================================= */

function layout(body){

  root.innerHTML=`
    <div class="wrap">

      <header class="top">

        <div>
          <div class="brand">Luyện Thi</div>
        </div>

        <div class="nav">

          ${
            ADMIN_MODE
            ?
            `
              <button
                class="btn"
                onclick="go('admin')">
                Quản trị
              </button>

              ${
                S.user
                ?
                `
                  <button
                    class="btn"
                    onclick="logout()">
                    Đăng xuất
                  </button>
                `
                :
                ''
              }
            `
            :
            `
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
   ĐIỀU HƯỚNG
========================================================= */

async function go(p){

  stopTimer();

  S.page=p;

  await render();
}


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


/* =========================================================
   TRANG HỌC SINH
========================================================= */

async function home(){

  let subs=[];

  if(sb){

    const r=await sb
      .from('subjects')
      .select('*')
      .eq('is_active',true)
      .order('sort_order',{ascending:true})
      .order('name',{ascending:true});

    if(r.error){

      return layout(`
        <section class="card">
          <h2>Không thể tải môn học</h2>
          <p class="muted">
            ${esc(r.error.message)}
          </p>
        </section>
      `);

    }

    subs=r.data||[];
  }


  /*
    QUAN TRỌNG:
    Không còn fallback môn học.
    Supabase không có môn => trang trống.
  */

  if(!subs.length){

    return layout(`
      <section class="card empty">

        <div class="empty-icon">
          📚
        </div>

        <h2>Chưa có môn học</h2>

        <p class="muted">
          Hiện chưa có môn học nào được mở.
        </p>

      </section>
    `);
  }


  layout(`

    <section class="hero">

      <div class="eyebrow">
        LUYỆN THI
      </div>

      <h1>
        Chọn môn học
      </h1>

      <p class="muted">
        Chọn môn học để xem các bài kiểm tra.
      </p>

    </section>


    <section class="grid subjects">

      ${
        subs.map(x=>`

          <button
            class="subject"
            style="--subject-color:${esc(x.color||'#7457ff')}"
            onclick="chooseSubject('${x.id}')">

            <div class="subject-icon">
              ${esc(x.icon||'📚')}
            </div>

            <div class="subject-body">

              <h3>
                ${esc(x.name)}
              </h3>

              <p>
                ${esc(
                  x.description||
                  'Xem các bài kiểm tra'
                )}
              </p>

            </div>

            <div class="arrow">
              ›
            </div>

          </button>

        `).join('')
      }

    </section>

  `);
}


async function chooseSubject(id){

  S.subject=id;

  S.lesson=null;

  go('lessons');
}


/* =========================================================
   BÀI HỌC
========================================================= */

async function lessons(){

  if(!sb){

    return layout(`
      <section class="card">
        <h2>Chưa kết nối Supabase</h2>
        <p class="muted">
          Kiểm tra config.js.
        </p>
      </section>
    `);
  }


  const r=await sb
    .from('lessons')
    .select('*')
    .eq('subject_id',S.subject)
    .eq('is_active',true)
    .order('sort_order',{ascending:true});


  if(r.error){

    return layout(`
      <section class="card">

        <button
          class="btn"
          onclick="go('home')">
          ← Môn học
        </button>

        <h2 style="margin-top:10px">
          Không thể tải bài học
        </h2>

        <p class="muted">
          ${esc(r.error.message)}
        </p>

      </section>
    `);
  }


  layout(`

    <section class="card">

      <button
        class="btn"
        onclick="go('home')">
        ← Môn học
      </button>

      <h2 style="margin-top:10px">
        Chọn bài
      </h2>

      ${
        (r.data||[]).map(x=>`

          <button
            class="exam"
            onclick="chooseLesson('${x.id}')">

            <b>
              ${esc(x.title)}
            </b>

            <div class="muted">
              ${esc(x.description||'')}
            </div>

          </button>

        `).join('')
        ||
        `
          <div class="empty">
            <div class="empty-icon">📖</div>
            <h3>Chưa có bài học</h3>
            <p class="muted">
              Môn học này chưa có bài kiểm tra.
            </p>
          </div>
        `
      }

    </section>

  `);
}


function chooseLesson(id){

  S.lesson=id;

  go('exams');
}


/* =========================================================
   DANH SÁCH ĐỀ
========================================================= */

async function exams(){

  const r=await sb
    .from('exams')
    .select('*')
    .eq('subject_id',S.subject)
    .eq('lesson_id',S.lesson)
    .eq('is_published',true)
    .order('created_at',{ascending:false});


  if(r.error){

    return layout(`
      <section class="card">

        <button
          class="btn"
          onclick="go('lessons')">
          ← Bài
        </button>

        <h2 style="margin-top:10px">
          Không thể tải đề
        </h2>

        <p class="muted">
          ${esc(r.error.message)}
        </p>

      </section>
    `);
  }


  layout(`

    <section class="card">

      <button
        class="btn"
        onclick="go('lessons')">
        ← Bài
      </button>

      <h2 style="margin-top:10px">
        Chọn bài kiểm tra
      </h2>

      ${
        (r.data||[]).map(e=>`

          <button
            class="exam"
            onclick="openInfo('${e.id}')">

            <b>
              ${esc(e.title)}
            </b>

            <div class="muted">
              ${e.question_count} câu
              •
              ${e.minutes} phút
              •
              ${
                e.attempt_limit===0
                ?
                'Không giới hạn lượt'
                :
                e.attempt_limit+' lượt'
              }
            </div>

          </button>

        `).join('')
        ||
        `
          <div class="empty">

            <div class="empty-icon">
              📝
            </div>

            <h3>
              Chưa có đề được mở
            </h3>

            <p class="muted">
              Hiện chưa có bài kiểm tra nào.
            </p>

          </div>
        `
      }

    </section>

  `);
}


async function openInfo(id){

  S.exam=id;

  go('info');
}


/* =========================================================
   NHẬP HỌ TÊN + LỚP
========================================================= */

async function info(){

  const r=await sb
    .from('exams')
    .select('*')
    .eq('id',S.exam)
    .single();


  if(r.error){

    return layout(`
      <section class="card">

        <h2>Không thể tải bài kiểm tra</h2>

        <p class="muted">
          ${esc(r.error.message)}
        </p>

      </section>
    `);
  }


  const e=r.data;


  layout(`

    <section class="card narrow">

      <h2>
        ${esc(e.title)}
      </h2>

      <div class="kpi">

        <span>
          ${e.question_count} câu
        </span>

        <span>
          ${e.minutes} phút
        </span>

        <span>
          ${
            e.attempt_limit===0
            ?
            'Không giới hạn lượt'
            :
            e.attempt_limit+' lượt'
          }
        </span>

      </div>


      <div class="field">

        <label>
          Họ và tên
        </label>

        <input
          id="name"
          type="text"
          autocomplete="name"
          placeholder="Nhập họ và tên">

      </div>


      <div class="field">

        <label>
          Lớp
        </label>

        <input
          id="cls"
          type="text"
          placeholder="Ví dụ: 12A3">

      </div>


      <button
        class="btn primary"
        style="width:100%;padding:13px"
        onclick="begin()">

        BẮT ĐẦU LÀM BÀI

      </button>

    </section>

  `);
}


/* =========================================================
   BẮT ĐẦU LÀM BÀI
========================================================= */

async function begin(){

  const name=
    document.getElementById('name')
    .value
    .trim();

  const cls=
    document.getElementById('cls')
    .value
    .trim();


  if(!name||!cls){

    return alert(
      'Vui lòng nhập họ tên và lớp.'
    );
  }


  const er=await sb
    .from('exams')
    .select('*')
    .eq('id',S.exam)
    .single();


  if(er.error){

    return alert(er.error.message);
  }


  const e=er.data;


  /*
    Kiểm tra số lượt làm
  */

  if(e.attempt_limit>0){

    const q=await sb
      .from('attempts')
      .select('id',{count:'exact',head:true})
      .eq('exam_id',e.id)
      .ilike('student_name',name)
      .ilike('student_class',cls);


    if((q.count||0)>=e.attempt_limit){

      return alert(
        `Bạn đã đạt giới hạn ${e.attempt_limit} lượt làm bài.`
      );
    }
  }


  /*
    Lấy mã đề
  */

  const forms=await sb
    .from('exam_forms')
    .select('*')
    .eq('exam_id',e.id);


  if(forms.error){

    return alert(forms.error.message);
  }


  const formList=forms.data||[];


  const form=
    formList[
      Math.floor(
        Math.random()*formList.length
      )
    ];


  if(!form){

    return alert(
      'Đề chưa được tạo mã đề.'
    );
  }


  /*
    Lấy câu hỏi
  */

  const qs=await sb
    .from('exam_questions')
    .select(`
      position,
      question_id,
      questions(
        id,
        question_text,
        options
      )
    `)
    .eq('exam_form_id',form.id)
    .order('position');


  if(qs.error){

    return alert(qs.error.message);
  }


  S.attempt={
    exam:e,
    form,
    name,
    cls,
    questions:qs.data||[]
  };


  S.answers={};

  S.seconds=e.minutes*60;

  S.page='take';

  await render();

  startTimer();
}


/* =========================================================
   TIMER
========================================================= */

function startTimer(){

  stopTimer();

  S.timer=setInterval(()=>{

    S.seconds--;

    const t=
      document.getElementById('timer');

    if(t){
      t.textContent=fmt(S.seconds);
    }


    if(S.seconds<=0){

      stopTimer();

      submit(true);
    }

  },1000);
}


function stopTimer(){

  if(S.timer){

    clearInterval(S.timer);

  }

  S.timer=null;
}


function fmt(s){

  return String(
    Math.floor(s/60)
  ).padStart(2,'0')
  +
  ':'
  +
  String(
    s%60
  ).padStart(2,'0');
}


/* =========================================================
   LÀM BÀI
========================================================= */

function take(){

  const a=S.attempt;


  layout(`

    <section class="card">

      <div class="row">

        <div>

          <b>
            ${esc(a.name)}
          </b>

          <div class="muted">
            ${esc(a.cls)}
            •
            ${
              a.form.form_number
              ?
              'Mã đề '+a.form.form_number
              :
              ''
            }
          </div>

        </div>


        <div
          class="right timer"
          id="timer">

          ${fmt(S.seconds)}

        </div>

      </div>


      <div
        class="kpi"
        style="margin-top:10px">

        <span>
          ${Object.keys(S.answers).length}/${a.questions.length}
          đã làm
        </span>

      </div>

    </section>


    ${
      a.questions.map((x,i)=>{

        const q=x.questions;

        return `

          <section class="card">

            <div class="muted">
              Câu ${i+1}/${a.questions.length}
            </div>

            <div style="margin-top:7px">
              <b>
                ${esc(q.question_text)}
              </b>
            </div>


            ${
              (q.options||[])
              .map((o,j)=>`

                <button
                  class="option ${
                    S.answers[q.id]===j
                    ?
                    'sel'
                    :
                    ''
                  }"
                  onclick="pick('${q.id}',${j})">

                  ${String.fromCharCode(65+j)}.
                  ${esc(o)}

                </button>

              `)
              .join('')
            }

          </section>

        `;

      }).join('')
    }


    <button
      class="btn primary submit"
      onclick="submit(false)">

      NỘP BÀI

    </button>

  `);
}


function pick(id,j){

  S.answers[id]=j;

  take();
}


/* =========================================================
   NỘP BÀI
========================================================= */

async function submit(auto){

  stopTimer();


  if(
    !auto &&
    !confirm('Nộp bài và chấm điểm?')
  ){

    startTimer();

    return;
  }


  const a=S.attempt;


  const sess=
    await sb.auth.getSession();


  if(!sess.data.session){

    return alert(
      'Phiên làm bài không hợp lệ. Vui lòng tải lại trang.'
    );
  }


  const r=await fetch(
    C.SUPABASE_URL+
    '/functions/v1/submit-attempt',
    {
      method:'POST',

      headers:{
        'Content-Type':'application/json',

        'Authorization':
          'Bearer '+
          sess.data.session.access_token,

        'apikey':
          C.SUPABASE_ANON_KEY
      },

      body:JSON.stringify({

        exam_id:a.exam.id,

        exam_form_id:a.form.id,

        student_name:a.name,

        student_class:a.cls,

        answers:
          Object.entries(
            S.answers
          ).map(
            ([question_id,chosen_index])=>({
              question_id,
              chosen_index
            })
          )

      })
    }
  );


  let d;

  try{
    d=await r.json();
  }catch{
    return alert(
      'Máy chủ không trả về kết quả hợp lệ.'
    );
  }


  if(!r.ok){

    return alert(
      d.error||
      'Không thể nộp bài.'
    );
  }


  S.result={
    score:Number(d.score||0),
    correct:Number(d.correct||0),
    total:Number(d.total||0),
    auto
  };


  go('result');
}


/* =========================================================
   KẾT QUẢ
========================================================= */

function result(){

  const r=S.result;


  layout(`

    <section class="card center narrow">

      <h1>
        Kết quả
      </h1>

      <div class="score">
        ${Number(r.score).toFixed(2)}/10
      </div>

      <p>
        ${r.correct}/${r.total}
        câu đúng
      </p>

      ${
        r.auto
        ?
        `
          <p class="muted">
            Bài tự động nộp khi hết giờ.
          </p>
        `
        :
        ''
      }


      <div
        class="row"
        style="justify-content:center">

        <button
          class="btn primary"
          onclick="go('home')">

          LÀM BÀI KHÁC

        </button>

        <button
          class="btn"
          onclick="go('ranking')">

          XEM XẾP HẠNG

        </button>

      </div>

    </section>

  `);
}


/* =========================================================
   XẾP HẠNG
========================================================= */

async function ranking(){

  const r=await sb
    .from('attempts')
    .select(`
      student_name,
      student_class,
      score,
      submitted_at,
      exam_id,
      exams(
        title,
        ranking_enabled,
        ranking_mode
      )
    `)
    .order('score',{ascending:false})
    .limit(100);


  if(r.error){

    return layout(`
      <section class="card">

        <h2>
          Xếp hạng
        </h2>

        <p class="muted">
          ${esc(r.error.message)}
        </p>

      </section>
    `);
  }


  const rows=
    (r.data||[])
    .filter(
      x=>x.exams?.ranking_enabled
    );


  layout(`

    <section class="card">

      <h2>
        Xếp hạng
      </h2>

      <p class="muted">
        Các lượt làm được lưu riêng.
      </p>


      ${
        rows.length
        ?
        `
          <div class="table-wrap">

            <table class="table">

              <thead>

                <tr>
                  <th>#</th>
                  <th>Họ tên</th>
                  <th>Lớp</th>
                  <th>Điểm</th>
                  <th>Bài</th>
                </tr>

              </thead>

              <tbody>

                ${
                  rows.map((x,i)=>`

                    <tr>

                      <td>
                        ${i+1}
                      </td>

                      <td>
                        ${esc(x.student_name)}
                      </td>

                      <td>
                        ${esc(x.student_class)}
                      </td>

                      <td>
                        <b>
                          ${Number(x.score).toFixed(2)}
                        </b>
                      </td>

                      <td>
                        ${esc(x.exams?.title||'')}
                      </td>

                    </tr>

                  `).join('')
                }

              </tbody>

            </table>

          </div>
        `
        :
        `
          <div class="empty">

            <div class="empty-icon">
              🏆
            </div>

            <h3>
              Chưa có dữ liệu xếp hạng
            </h3>

          </div>
        `
      }

    </section>

  `);
}


/* =========================================================
   ADMIN LOGIN
========================================================= */

function login(){

  layout(`

    <section
      class="card narrow">

      <h2>
        Đăng nhập Admin
      </h2>


      <div class="field">

        <label>
          Email
        </label>

        <input
          id="email"
          type="email">

      </div>


      <div class="field">

        <label>
          Mật khẩu
        </label>

        <input
          id="pass"
          type="password">

      </div>


      <button
        class="btn primary"
        onclick="doLogin()">

        ĐĂNG NHẬP

      </button>

    </section>

  `);
}


async function doLogin(){

  const r=
    await sb.auth.signInWithPassword({
      email:
        document.getElementById('email').value,

      password:
        document.getElementById('pass').value
    });


  if(r.error){

    return alert(
      r.error.message
    );
  }


  const p=
    await sb
      .from('profiles')
      .select('role')
      .eq('id',r.data.user.id)
      .single();


  if(p.data?.role!=='admin'){

    await sb.auth.signOut();

    return alert(
      'Tài khoản không có quyền Admin.'
    );
  }


  S.user=r.data.user;

  go('admin');
}


async function logout(){

  await sb.auth.signOut();

  S.user=null;

  go('home');
}


/* =========================================================
   ADMIN
========================================================= */

async function admin(){

  if(!sb){

    return layout(`

      <section class="card">

        <h2>
          Supabase chưa kết nối
        </h2>

        <p class="muted">
          ${esc(
            SUPABASE_INIT_ERROR?.message||
            'Kiểm tra config.js'
          )}
        </p>

        <button
          class="btn"
          onclick="location.reload()">

          TẢI LẠI

        </button>

      </section>

    `);
  }


  /*
    Lấy môn học để quản trị
  */

  const sr=
    await sb
      .from('subjects')
      .select('*')
      .order('sort_order')
      .order('name');


  const subjects=
    sr.data||[];


  layout(`

    <section class="card">

      <div class="admin-head">

        <div>

          <h2>
            Quản trị
          </h2>

          <div class="muted">
            Quản lý môn học, đề thi, câu hỏi,
            kết quả và AI.
          </div>

        </div>


        <button
          class="btn primary"
          onclick="aiPanel()">

          AI TẠO ĐỀ

        </button>

      </div>

    </section>


    <section class="card">

      <div class="row">

        <div>

          <h2>
            Môn học
          </h2>

          <p class="muted">
            Thêm môn học để học sinh có thể nhìn thấy.
          </p>

        </div>

        <button
          class="btn primary right"
          onclick="subjectManager()">

          QUẢN LÝ MÔN

        </button>

      </div>


      ${
        subjects.length
        ?
        `
          <div class="grid subjects">

            ${
              subjects.map(s=>`

                <div
                  class="subject admin-subject"
                  style="--subject-color:${esc(s.color||'#7457ff')}">

                  <div class="subject-icon">
                    ${esc(s.icon||'📚')}
                  </div>

                  <div class="subject-body">

                    <h3>
                      ${esc(s.name)}
                    </h3>

                    <p>
                      ${esc(
                        s.description||
                        'Chưa có mô tả'
                      )}
                    </p>

                    <small class="muted">
                      ${
                        s.is_active
                        ?
                        'Đang hiển thị'
                        :
                        'Đang ẩn'
                      }
                    </small>

                  </div>

                </div>

              `).join('')
            }

          </div>
        `
        :
        `
          <div class="empty">

            <div class="empty-icon">
              📚
            </div>

            <h3>
              Chưa có môn học
            </h3>

            <p class="muted">
              Hãy thêm môn đầu tiên.
            </p>

          </div>
        `
      }

    </section>


    <section class="admin-grid">

      <button
        class="admin-card"
        onclick="examPanel()">

        <span>📝</span>

        <b>
          Tạo đề
        </b>

        <small>
          Tạo bài kiểm tra và mã đề.
        </small>

      </button>


      <button
        class="admin-card"
        onclick="questionPanel()">

        <span>📚</span>

        <b>
          Ngân hàng câu hỏi
        </b>

        <small>
          Xem các câu hỏi đã lưu.
        </small>

      </button>


      <button
        class="admin-card"
        onclick="adminResults()">

        <span>📊</span>

        <b>
          Kết quả
        </b>

        <small>
          Xem lượt làm của học sinh.
        </small>

      </button>

    </section>

  `);
}


/* =========================================================
   QUẢN LÝ MÔN HỌC
========================================================= */

async function subjectManager(){

  const r=
    await sb
      .from('subjects')
      .select('*')
      .order('sort_order')
      .order('name');


  layout(`

    <section class="card">

      <button
        class="btn"
        onclick="go('admin')">

        ← Quản trị

      </button>


      <h2 style="margin-top:10px">
        Quản lý môn học
      </h2>

      <p class="muted">
        Thêm, sửa, ẩn hoặc hiện môn học.
      </p>

    </section>


    <section class="card">

      <h3>
        Thêm môn học
      </h3>


      <div class="grid two">

        <div class="field">

          <label>
            Tên môn
          </label>

          <input
            id="subName"
            placeholder="Ví dụ: Toán">

        </div>


        <div class="field">

          <label>
            Icon
          </label>

          <input
            id="subIcon"
            value="📚"
            placeholder="📐">

        </div>


        <div class="field">

          <label>
            Màu
          </label>

          <input
            id="subColor"
            type="color"
            value="#7457ff">

        </div>


        <div class="field">

          <label>
            Thứ tự
          </label>

          <input
            id="subOrder"
            type="number"
            value="0">

        </div>

      </div>


      <div class="field">

        <label>
          Mô tả
        </label>

        <textarea
          id="subDesc"
          placeholder="Mô tả ngắn về môn học"></textarea>

      </div>


      <button
        class="btn primary"
        onclick="addSubject()">

        THÊM MÔN

      </button>

    </section>


    <section class="card">

      <h3>
        Danh sách môn
      </h3>


      ${
        (r.data||[]).map(s=>`

          <div
            class="card compact">

            <div class="row">

              <div
                class="subject-icon">

                ${esc(s.icon||'📚')}

              </div>


              <div>

                <b>
                  ${esc(s.name)}
                </b>

                <div class="muted">
                  ${esc(s.description||'')}
                </div>

              </div>


              <div class="right">

                <button
                  class="btn"
                  onclick="toggleSubject('${s.id}',${!s.is_active})">

                  ${
                    s.is_active
                    ?
                    'ẨN'
                    :
                    'HIỆN'
                  }

                </button>

                <button
                  class="btn"
                  onclick="editSubject('${s.id}')">

                  SỬA

                </button>

              </div>

            </div>

          </div>

        `).join('')
      }

    </section>

  `);
}


async function addSubject(){

  const name=
    document.getElementById('subName')
    .value
    .trim();

  if(!name){

    return alert(
      'Vui lòng nhập tên môn.'
    );
  }


  const r=
    await sb
      .from('subjects')
      .insert({

        name,

        icon:
          document.getElementById('subIcon')
          .value
          .trim()||'📚',

        color:
          document.getElementById('subColor')
          .value||'#7457ff',

        description:
          document.getElementById('subDesc')
          .value
          .trim(),

        sort_order:
          Number(
            document.getElementById('subOrder')
            .value||0
          ),

        is_active:true,

        created_by:S.user.id

      });


  if(r.error){

    return alert(
      r.error.message
    );
  }


  alert(
    'Đã thêm môn học.'
  );

  subjectManager();
}


async function toggleSubject(id,active){

  const r=
    await sb
      .from('subjects')
      .update({
        is_active:active
      })
      .eq('id',id);


  if(r.error){

    return alert(
      r.error.message
    );
  }


  subjectManager();
}


async function editSubject(id){

  const r=
    await sb
      .from('subjects')
      .select('*')
      .eq('id',id)
      .single();


  if(r.error){

    return alert(
      r.error.message
    );
  }


  const s=r.data;


  layout(`

    <section class="card">

      <button
        class="btn"
        onclick="subjectManager()">

        ← Môn học

      </button>


      <h2 style="margin-top:10px">
        Sửa môn học
      </h2>


      <div class="field">

        <label>
          Tên môn
        </label>

        <input
          id="editName"
          value="${esc(s.name)}">

      </div>


      <div class="grid two">

        <div class="field">

          <label>
            Icon
          </label>

          <input
            id="editIcon"
            value="${esc(s.icon||'📚')}">

        </div>


        <div class="field">

          <label>
            Màu
          </label>

          <input
            id="editColor"
            type="color"
            value="${esc(s.color||'#7457ff')}">

        </div>

      </div>


      <div class="field">

        <label>
          Mô tả
        </label>

        <textarea id="editDesc">${esc(
          s.description||''
        )}</textarea>

      </div>


      <button
        class="btn primary"
        onclick="saveSubject('${id}')">

        LƯU THAY ĐỔI

      </button>

    </section>

  `);
}


async function saveSubject(id){

  const r=
    await sb
      .from('subjects')
      .update({

        name:
          document.getElementById('editName')
          .value
          .trim(),

        icon:
          document.getElementById('editIcon')
          .value
          .trim(),

        color:
          document.getElementById('editColor')
          .value,

        description:
          document.getElementById('editDesc')
          .value
          .trim()

      })
      .eq('id',id);


  if(r.error){

    return alert(
      r.error.message
    );
  }


  alert(
    'Đã cập nhật môn học.'
  );

  subjectManager();
}


/* =========================================================
   AI
========================================================= */

function aiPanel(){

  layout(`

    <section class="card">

      <button
        class="btn"
        onclick="go('admin')">

        ← Admin

      </button>

      <h2 style="margin-top:10px">
        AI Tạo đề
      </h2>

      <p class="muted">
        AI tạo câu hỏi; bạn duyệt rồi mới lưu
        vào ngân hàng.
      </p>


      <div class="grid two">

        <div>

          <div class="field">

            <label>
              Môn
            </label>

            <input
              id="aiSubject"
              placeholder="Địa lí 12">

          </div>


          <div class="field">

            <label>
              Bài/chủ đề
            </label>

            <input
              id="aiLesson"
              placeholder="Bài 1">

          </div>


          <div class="field">

            <label>
              Số câu
            </label>

            <input
              id="aiCount"
              type="number"
              value="10"
              min="1"
              max="100">

          </div>


          <div class="field">

            <label>
              Độ khó
            </label>

            <select id="aiDiff">

              <option value="mixed">
                Trộn
              </option>

              <option value="nhan_biet">
                Nhận biết
              </option>

              <option value="thong_hieu">
                Thông hiểu
              </option>

              <option value="van_dung">
                Vận dụng
              </option>

            </select>

          </div>

        </div>


        <div>

          <div class="field">

            <label>
              Nội dung nguồn
            </label>

            <textarea
              id="aiSource"
              placeholder="Dán nội dung bài học hoặc tài liệu vào đây..."></textarea>

          </div>


          <div class="field">

            <label>
              Yêu cầu thêm
            </label>

            <textarea
              id="aiExtra"
              placeholder="Ví dụ: bám sát chương trình lớp 12, tránh câu hỏi mơ hồ..."></textarea>

          </div>

        </div>

      </div>


      <button
        class="btn primary"
        onclick="generateAI()">

        TẠO CÂU HỎI

      </button>

    </section>


    <section id="aiOut"></section>

  `);
}


async function generateAI(){

  const out=
    document.getElementById('aiOut');


  out.innerHTML=`
    <div class="card">
      Đang tạo câu hỏi...
    </div>
  `;


  const sess=
    await sb.auth.getSession();


  if(!sess.data.session){

    out.innerHTML=`
      <div class="card">
        Chưa đăng nhập Admin.
      </div>
    `;

    return;
  }


  const r=await fetch(
    C.SUPABASE_URL+
    '/'+
    C.AI_FUNCTION_PATH,
    {
      method:'POST',

      headers:{
        'Content-Type':
          'application/json',

        'Authorization':
          'Bearer '+
          sess.data.session.access_token,

        'apikey':
          C.SUPABASE_ANON_KEY
      },

      body:JSON.stringify({

        subject:
          document.getElementById('aiSubject')
          .value,

        lesson:
          document.getElementById('aiLesson')
          .value,

        count:
          Number(
            document.getElementById('aiCount')
            .value
          ),

        difficulty:
          document.getElementById('aiDiff')
          .value,

        source:
          document.getElementById('aiSource')
          .value,

        extra:
          document.getElementById('aiExtra')
          .value

      })
    }
  );


  let d;

  try{
    d=await r.json();
  }catch{
    out.innerHTML=`
      <div class="card">
        AI không trả về dữ liệu hợp lệ.
      </div>
    `;
    return;
  }


  if(!r.ok||d.error){

    out.innerHTML=`
      <div class="card">

        <h3>
          Không thể tạo câu hỏi
        </h3>

        <p class="muted">
          ${esc(d.error||'Lỗi không xác định')}
        </p>

      </div>
    `;

    return;
  }


  window.__aiQuestions=
    d.questions||[];


  out.innerHTML=`

    <div class="card">

      <h3>
        AI tạo ${window.__aiQuestions.length} câu
      </h3>


      ${
        window.__aiQuestions
        .map((q,i)=>`

          <div class="question">

            <b>
              Câu ${i+1}.
              ${esc(q.question_text)}
            </b>


            ${
              (q.options||[])
              .map((o,j)=>`

                <div>
                  ${String.fromCharCode(65+j)}.
                  ${esc(o)}
                </div>

              `).join('')
            }


            <div class="tag">
              Đáp án:
              ${String.fromCharCode(
                65+Number(q.answer_index||0)
              )}

              •
              ${esc(q.difficulty||'')}
            </div>


            ${
              q.explanation
              ?
              `
                <p class="muted">
                  ${esc(q.explanation)}
                </p>
              `
              :
              ''
            }

          </div>

        `).join('')
      }


      <button
        class="btn good"
        onclick="saveAIQuestions()">

        DUYỆT & LƯU VÀO NGÂN HÀNG

      </button>

    </div>

  `;
}


async function saveAIQuestions(){

  const subjectText=
    document.getElementById('aiSubject')
    .value
    .trim();


  const sr=
    await sb
      .from('subjects')
      .select('id')
      .ilike(
        'name',
        `%${subjectText}%`
      )
      .limit(1)
      .single();


  const rows=
    (window.__aiQuestions||[])
    .map(q=>({

      subject_id:
        sr.data?.id||null,

      question_text:
        q.question_text,

      options:
        q.options,

      answer_index:
        q.answer_index,

      explanation:
        q.explanation,

      difficulty:
        q.difficulty,

      source_text:
        document.getElementById('aiSource')
        ?.value||'',

      created_by:
        S.user.id,

      approved:true

    }));


  const r=
    await sb
      .from('questions')
      .insert(rows);


  if(r.error){

    return alert(
      r.error.message
    );
  }


  alert(
    'Đã lưu câu hỏi.'
  );

  go('admin');
}


/* =========================================================
   NGÂN HÀNG CÂU HỎI
========================================================= */

async function questionPanel(){

  const r=
    await sb
      .from('questions')
      .select(`
        id,
        question_text,
        answer_index,
        difficulty,
        approved,
        created_at
      `)
      .order(
        'created_at',
        {ascending:false}
      )
      .limit(100);


  layout(`

    <section class="card">

      <div class="row">

        <button
          class="btn"
          onclick="go('admin')">

          ← Admin

        </button>

        <h2>
          Câu hỏi
        </h2>

      </div>


      ${
        (r.data||[]).map((q,i)=>`

          <div class="question">

            <b>
              ${i+1}.
              ${esc(q.question_text)}
            </b>

            <div class="muted">

              Đáp án
              ${String.fromCharCode(
                65+Number(q.answer_index||0)
              )}

              •
              ${esc(q.difficulty||'')}

              •

              ${
                q.approved
                ?
                'Đã duyệt'
                :
                'Chưa duyệt'
              }

            </div>

          </div>

        `).join('')
        ||
        `
          <div class="empty">
            <div class="empty-icon">
              📚
            </div>
            <h3>
              Chưa có câu hỏi
            </h3>
          </div>
        `
      }

    </section>

  `);
}


/* =========================================================
   TẠO ĐỀ
========================================================= */

async function examPanel(){

  const subs=
    await sb
      .from('subjects')
      .select('*')
      .eq('is_active',true);


  layout(`

    <section class="card">

      <button
        class="btn"
        onclick="go('admin')">

        ← Admin

      </button>


      <h2 style="margin-top:10px">
        Tạo bài kiểm tra
      </h2>


      <div class="field">

        <label>
          Môn
        </label>

        <select id="exSub">

          ${
            (subs.data||[])
            .map(s=>`

              <option value="${s.id}">
                ${esc(s.name)}
              </option>

            `).join('')
          }

        </select>

      </div>


      <div class="field">

        <label>
          Tiêu đề
        </label>

        <input
          id="exTitle"
          placeholder="Địa lí 12 - Bài 1">

      </div>


      <div class="grid three">

        <div class="field">

          <label>
            Số câu
          </label>

          <input
            id="exCount"
            type="number"
            value="20">

        </div>


        <div class="field">

          <label>
            Số mã đề
          </label>

          <input
            id="exForms"
            type="number"
            value="4">

        </div>


        <div class="field">

          <label>
            Thời gian (phút)
          </label>

          <input
            id="exMin"
            type="number"
            value="15">

        </div>

      </div>


      <div class="grid two">

        <div class="field">

          <label>
            Số lượt làm / học sinh
            (0 = không giới hạn)
          </label>

          <input
            id="exLimit"
            type="number"
            value="0">

        </div>


        <div class="field">

          <label>
            Cách xếp hạng
          </label>

          <select id="exRank">

            <option value="best">
              Điểm cao nhất
            </option>

            <option value="latest">
              Lần gần nhất
            </option>

            <option value="average">
              Điểm trung bình
            </option>

            <option value="first">
              Lần đầu
            </option>

          </select>

        </div>

      </div>


      <label>

        <input
          id="exPub"
          type="checkbox">

        Mở bài ngay

      </label>


      <br>
      <br>


      <button
        class="btn primary"
        onclick="createExam()">

        TẠO VÀ SINH MÃ ĐỀ

      </button>

    </section>

  `);
}


async function createExam(){

  const e={

    subject_id:
      document.getElementById('exSub').value,

    lesson_id:
      S.lesson||null,

    title:
      document.getElementById('exTitle').value,

    minutes:
      Number(
        document.getElementById('exMin').value
      ),

    question_count:
      Number(
        document.getElementById('exCount').value
      ),

    form_count:
      Number(
        document.getElementById('exForms').value
      ),

    attempt_limit:
      Number(
        document.getElementById('exLimit').value
      ),

    ranking_mode:
      document.getElementById('exRank').value,

    is_published:
      document.getElementById('exPub').checked,

    created_by:
      S.user.id

  };


  const ins=
    await sb
      .from('exams')
      .insert(e)
      .select()
      .single();


  if(ins.error){

    return alert(
      ins.error.message
    );
  }


  const qr=
    await sb
      .from('questions')
      .select('id')
      .eq('subject_id',e.subject_id)
      .eq('approved',true);


  const ids=
    (qr.data||[])
    .map(x=>x.id);


  if(ids.length<e.question_count){

    return alert(
      `Đã tạo bài nhưng ngân hàng chỉ có ${ids.length} câu, cần ${e.question_count} câu. Hãy thêm câu rồi tạo mã đề.`
    );
  }


  for(
    let f=1;
    f<=e.form_count;
    f++
  ){

    const shuffled=
      [...ids]
      .sort(()=>Math.random()-.5)
      .slice(
        0,
        e.question_count
      );


    const fi=
      await sb
        .from('exam_forms')
        .insert({
          exam_id:ins.data.id,
          form_number:f
        })
        .select()
        .single();


    if(fi.error)
      continue;


    await sb
      .from('exam_questions')
      .insert(
        shuffled.map(
          (qid,i)=>({
            exam_form_id:
              fi.data.id,

            question_id:
              qid,

            position:
              i+1
          })
        )
      );
  }


  alert(
    'Đã tạo bài và mã đề.'
  );

  go('admin');
}


/* =========================================================
   KẾT QUẢ ADMIN
========================================================= */

async function adminResults(){

  const r=
    await sb
      .from('attempts')
      .select(`
        student_name,
        student_class,
        score,
        total_correct,
        total_questions,
        submitted_at,
        exams(title)
      `)
      .order(
        'submitted_at',
        {ascending:false}
      )
      .limit(300);


  layout(`

    <section class="card">

      <div class="row">

        <button
          class="btn"
          onclick="go('admin')">

          ← Admin

        </button>

        <h2>
          Kết quả
        </h2>

      </div>


      ${
        r.error
        ?
        `
          <p class="muted">
            ${esc(r.error.message)}
          </p>
        `
        :
        `
          <div class="table-wrap">

            <table class="table">

              <thead>

                <tr>
                  <th>Họ tên</th>
                  <th>Lớp</th>
                  <th>Bài</th>
                  <th>Điểm</th>
                  <th>Đúng</th>
                  <th>Thời gian</th>
                </tr>

              </thead>


              <tbody>

                ${
                  (r.data||[])
                  .map(x=>`

                    <tr>

                      <td>
                        ${esc(x.student_name)}
                      </td>

                      <td>
                        ${esc(x.student_class)}
                      </td>

                      <td>
                        ${esc(
                          x.exams?.title||''
                        )}
                      </td>

                      <td>
                        ${Number(
                          x.score
                        ).toFixed(2)}
                      </td>

                      <td>
                        ${x.total_correct}/${x.total_questions}
                      </td>

                      <td>
                        ${
                          x.submitted_at
                          ?
                          new Date(
                            x.submitted_at
                          ).toLocaleString(
                            'vi-VN'
                          )
                          :
                          ''
                        }
                      </td>

                    </tr>

                  `).join('')
                }

              </tbody>

            </table>

          </div>
        `
      }

    </section>

  `);
}


/* =========================================================
   AUTH
========================================================= */

if(sb){

  sb.auth.onAuthStateChange(
    (_event,session)=>{

      S.user=
        session?.user||null;

    }
  );

}


/* =========================================================
   KHỞI ĐỘNG
========================================================= */

render();
