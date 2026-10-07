/* =========================================================
   QUẢN LÝ MÔN HỌC - BẢN MỚI
   ========================================================= */

async function subjectManager(){

  if(!sb){
    return layout(`
      <section class="card">
        <h2>Supabase chưa kết nối</h2>
      </section>
    `);
  }

  const r=await sb
    .from('subjects')
    .select('*')
    .order('sort_order',{ascending:true})
    .order('name',{ascending:true});

  if(r.error){
    return layout(`
      <section class="card">
        <h2>Lỗi tải môn học</h2>
        <p class="muted">${esc(r.error.message)}</p>
      </section>
    `);
  }

  const subjects=r.data||[];

  layout(`
    <section class="card">

      <div class="row">
        <button class="btn" onclick="go('admin')">
          ← Quản trị
        </button>

        <h2>Quản lý môn học</h2>

        <div class="right">
          <button class="btn primary"
            onclick="aiCreateSubject()">
            AI TẠO MÔN HỌC
          </button>

          <button class="btn"
            onclick="createSubjectManual()">
            + Thêm môn
          </button>
        </div>
      </div>

      <p class="muted">
        Môn đang Hiện sẽ xuất hiện ở trang học sinh.
        Môn Ẩn sẽ không xuất hiện.
      </p>

    </section>

    <section class="card">

      <div class="subject-admin-list">

        ${
          subjects.length
          ? subjects.map(s=>`

            <div class="subject-admin-item">

              <div
                class="subject-admin-icon"
                style="background:${esc(s.color||'#7457ff')}22"
              >
                ${esc(s.icon||'📚')}
              </div>

              <div class="subject-admin-info">

                <b>${esc(s.name)}</b>

                <small>
                  ${esc(s.description||'Không có mô tả')}
                </small>

                <div>
                  ${
                    s.is_active
                    ? `<span class="status-active">● Đang hiện</span>`
                    : `<span class="status-hidden">● Đang ẩn</span>`
                  }
                </div>

              </div>

              <button
                class="btn"
                onclick="toggleSubject('${s.id}',${!s.is_active})"
              >
                ${s.is_active?'Ẩn':'Hiện'}
              </button>

              <button
                class="btn"
                onclick="editSubject('${s.id}')"
              >
                Sửa
              </button>

            </div>

          `).join('')
          : `
            <div class="empty">
              <div class="empty-icon">📚</div>
              <h3>Chưa có môn học</h3>
              <p class="muted">
                Hãy thêm môn hoặc dùng AI để tạo môn.
              </p>
            </div>
          `
        }

      </div>

    </section>
  `);
}


/* =========================
   ẨN / HIỆN MÔN
   ========================= */

async function toggleSubject(id,newState){

  if(!sb){
    return alert('Supabase chưa kết nối.');
  }

  const r=await sb
    .from('subjects')
    .update({
      is_active:newState
    })
    .eq('id',id);

  if(r.error){
    return alert('Không thể cập nhật: '+r.error.message);
  }

  await subjectManager();
}


/* =========================
   THÊM MÔN THỦ CÔNG
   ========================= */

async function createSubjectManual(){

  const name=prompt('Tên môn học:');

  if(!name || !name.trim()){
    return;
  }

  const description=prompt('Mô tả môn học:')||'';

  const icon=prompt(
    'Icon môn học:',
    '📚'
  )||'📚';

  const color=prompt(
    'Màu môn học dạng HEX:',
    '#7457ff'
  )||'#7457ff';

  const r=await sb
    .from('subjects')
    .insert({
      name:name.trim(),
      description,
      icon,
      color,
      is_active:true,
      sort_order:0,
      created_by:S.user?.id||null
    });

  if(r.error){
    return alert('Không thể tạo môn: '+r.error.message);
  }

  alert('Đã tạo môn học.');

  await subjectManager();
}


/* =========================
   SỬA MÔN
   ========================= */

async function editSubject(id){

  const r=await sb
    .from('subjects')
    .select('*')
    .eq('id',id)
    .single();

  if(r.error || !r.data){
    return alert('Không tìm thấy môn học.');
  }

  const s=r.data;

  const name=prompt(
    'Tên môn học:',
    s.name||''
  );

  if(!name || !name.trim()){
    return;
  }

  const description=prompt(
    'Mô tả:',
    s.description||''
  );

  const icon=prompt(
    'Icon:',
    s.icon||'📚'
  );

  const color=prompt(
    'Màu HEX:',
    s.color||'#7457ff'
  );

  const u=await sb
    .from('subjects')
    .update({
      name:name.trim(),
      description:description||'',
      icon:icon||'📚',
      color:color||'#7457ff'
    })
    .eq('id',id);

  if(u.error){
    return alert('Không thể sửa: '+u.error.message);
  }

  await subjectManager();
}


/* =========================================================
   AI TẠO MÔN HỌC
   ========================================================= */

function aiCreateSubject(){

  layout(`
    <section class="card">

      <div class="row">

        <button
          class="btn"
          onclick="subjectManager()"
        >
          ← Quản lý môn
        </button>

        <h2>AI tạo môn học</h2>

      </div>

      <p class="muted">
        Nhập tên hoặc mô tả môn học.
        AI sẽ đề xuất tên, icon, màu và mô tả.
      </p>

      <div class="field">
        <label>
          Môn học bạn muốn tạo
        </label>

        <input
          id="aiSubjectRequest"
          placeholder="Ví dụ: Giáo dục kinh tế và pháp luật 12"
        >
      </div>

      <div class="field">
        <label>
          Yêu cầu thêm
        </label>

        <textarea
          id="aiSubjectExtra"
          placeholder="Ví dụ: phong cách hiện đại, màu xanh dương..."
        ></textarea>
      </div>

      <button
        class="btn primary"
        onclick="runAISubject()"
      >
        🤖 TẠO BẰNG AI
      </button>

    </section>

    <section id="aiSubjectResult"></section>
  `);
}


/* =========================
   GỌI AI
   ========================= */

async function runAISubject(){

  const request=
    document.getElementById('aiSubjectRequest')
      ?.value.trim();

  const extra=
    document.getElementById('aiSubjectExtra')
      ?.value.trim();

  const box=
    document.getElementById('aiSubjectResult');

  if(!request){
    return alert('Nhập tên hoặc yêu cầu môn học.');
  }

  box.innerHTML=`
    <section class="card">
      <p>AI đang tạo...</p>
    </section>
  `;

  try{

    const sess=await sb.auth.getSession();

    const r=await fetch(
      C.SUPABASE_URL+'/functions/v1/ai-subject',
      {
        method:'POST',

        headers:{
          'Content-Type':'application/json',
          'Authorization':
            'Bearer '+sess.data.session.access_token,
          'apikey':
            C.SUPABASE_ANON_KEY
        },

        body:JSON.stringify({
          request,
          extra
        })
      }
    );

    const d=await r.json();

    if(!r.ok || d.error){

      box.innerHTML=`
        <section class="card">
          <p class="muted">
            ${esc(d.error||'AI không tạo được môn.')}
          </p>
        </section>
      `;

      return;
    }

    const x=d.subject;

    window.__AI_SUBJECT=x;

    box.innerHTML=`

      <section class="card">

        <h2>Xem trước môn học</h2>

        <div class="subject"
          style="border-left-color:${esc(x.color||'#7457ff')}"
        >

          <div
            class="subject-icon"
            style="background:${esc(x.color||'#7457ff')}22"
          >
            ${esc(x.icon||'📚')}
          </div>

          <div class="subject-body">

            <h3>
              ${esc(x.name||'')}
            </h3>

            <p>
              ${esc(x.description||'')}
            </p>

          </div>

        </div>

        <br>

        <button
          class="btn primary"
          onclick="saveAISubject()"
        >
          DUYỆT & LƯU MÔN
        </button>

        <button
          class="btn"
          onclick="aiCreateSubject()"
        >
          TẠO LẠI
        </button>

      </section>

    `;

  }catch(e){

    box.innerHTML=`
      <section class="card">
        <p class="muted">
          ${esc(e.message||String(e))}
        </p>
      </section>
    `;
  }
}


/* =========================
   LƯU MÔN AI
   ========================= */

async function saveAISubject(){

  const x=window.__AI_SUBJECT;

  if(!x){
    return alert('Không có dữ liệu AI.');
  }

  const r=await sb
    .from('subjects')
    .insert({
      name:x.name,
      icon:x.icon||'📚',
      color:x.color||'#7457ff',
      description:x.description||'',
      is_active:true,
      sort_order:0,
      created_by:S.user?.id||null
    });

  if(r.error){

    return alert(
      'Không thể lưu môn: '+r.error.message
    );

  }

  alert(
    'Đã tạo môn. Môn đang được HIỆN trên trang học sinh.'
  );

  await subjectManager();
}


/* =========================================================
   ADMIN MENU MỚI
   ========================================================= */

async function admin(){

  if(!sb){

    return layout(`
      <section class="card">

        <h2>Supabase chưa kết nối</h2>

        <p class="muted">
          ${esc(
            SUPABASE_INIT_ERROR?.message||
            'Kiểm tra config.js'
          )}
        </p>

        <button
          class="btn"
          onclick="location.reload()"
        >
          TẢI LẠI
        </button>

      </section>
    `);
  }

  layout(`

    <section class="card">

      <div class="admin-head">

        <div>
          <h2>Quản trị</h2>

          <p class="muted">
            Quản lý toàn bộ hệ thống luyện thi.
          </p>
        </div>

      </div>

    </section>


    <section class="admin-grid">

      <button
        class="admin-card"
        onclick="subjectManager()"
      >
        <span>📚</span>

        <b>Quản lý môn học</b>

        <small>
          Thêm, sửa, ẩn/hiện môn
        </small>
      </button>


      <button
        class="admin-card"
        onclick="aiPanel()"
      >
        <span>🤖</span>

        <b>AI tạo câu hỏi</b>

        <small>
          AI tạo câu hỏi trắc nghiệm
        </small>
      </button>


      <button
        class="admin-card"
        onclick="examPanel()"
      >
        <span>📝</span>

        <b>Tạo bài kiểm tra</b>

        <small>
          Tạo đề và mã đề
        </small>
      </button>


      <button
        class="admin-card"
        onclick="questionPanel()"
      >
        <span>❓</span>

        <b>Ngân hàng câu hỏi</b>

        <small>
          Xem câu hỏi
        </small>
      </button>


      <button
        class="admin-card"
        onclick="adminResults()"
      >
        <span>📊</span>

        <b>Kết quả</b>

        <small>
          Xem lượt làm của học sinh
        </small>
      </button>


      <button
        class="admin-card"
        onclick="aiCreateSubject()"
      >
        <span>✨</span>

        <b>AI tạo môn học</b>

        <small>
          AI đề xuất tên, icon, màu, mô tả
        </small>
      </button>

    </section>

  `);
}
