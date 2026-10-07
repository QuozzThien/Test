(function () {
  "use strict";

  const root = document.getElementById("app");
  const C = window.APP_CONFIG || {};

  let sb = null;

  const S = {
    page: "home",
    subject: null,
    lesson: null,
    exam: null,
    attempt: null,
    answers: {},
    seconds: 0,
    timer: null,
    user: null,
    result: null
  };

  const fallback = [
    ["Công nghệ", "⚙️"],
    ["Toán", "∑"],
    ["Tiếng Anh", "A"],
    ["Vật lí", "⚡"],
    ["Địa lí", "🌍"],
    ["Lịch sử", "🏛️"],
    ["GDKT&PL", "⚖️"]
  ];

  const esc = (x) =>
    String(x ?? "").replace(/[&<>"']/g, (m) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[m]));

  function isConfigured() {
    const url = String(C.SUPABASE_URL || "").trim();
    const key = String(C.SUPABASE_ANON_KEY || "").trim();

    return (
      /^https:\/\/[^\s]+\.supabase\.co\/?$/.test(url) &&
      key.length > 20 &&
      !key.includes("DÁN_") &&
      !key.includes("ĐÂY") &&
      !key.endsWith("...")
    );
  }

  function initSupabase() {
    if (!isConfigured()) {
      return {
        ok: false,
        error: new Error(
          "SUPABASE_URL hoặc SUPABASE_ANON_KEY chưa được cấu hình đầy đủ."
        )
      };
    }

    if (!window.supabase || typeof window.supabase.createClient !== "function") {
      return {
        ok: false,
        error: new Error(
          "Không tải được thư viện Supabase JS. Hãy kiểm tra kết nối mạng."
        )
      };
    }

    try {
      sb = window.supabase.createClient(
        C.SUPABASE_URL.trim(),
        C.SUPABASE_ANON_KEY.trim()
      );

      return { ok: true };
    } catch (e) {
      sb = null;
      return { ok: false, error: e };
    }
  }

  function showError(error) {
    console.error("APP ERROR:", error);

    root.innerHTML = `
      <div class="wrap">
        <section class="card">
          <h2>Không thể kết nối</h2>

          <p class="muted">
            Website đã tải được nhưng đang gặp lỗi khi kết nối Supabase.
          </p>

          <div class="notice">
            <b>Lỗi:</b><br>
            ${esc(error?.message || error || "Lỗi không xác định")}
          </div>

          <p class="muted">
            Kiểm tra lại Project URL, Publishable key và Supabase project.
          </p>

          <button class="btn primary" onclick="location.reload()">
            TẢI LẠI
          </button>
        </section>
      </div>
    `;
  }

  function layout(body) {
    root.innerHTML = `
      <div class="wrap">

        <header class="top">
          <div>
            <div class="brand">KHO TRẮC NGHIỆM ĐA MÔN</div>
            <span class="tag">
              Học sinh làm bài • Admin quản trị
            </span>
          </div>

          <div class="nav">
            <button class="btn" onclick="go('home')">
              Môn học
            </button>

            <button class="btn" onclick="go('ranking')">
              Xếp hạng
            </button>

            ${
              S.user
                ? `
                  <button class="btn" onclick="go('admin')">
                    Quản trị
                  </button>

                  <button class="btn" onclick="logout()">
                    Đăng xuất
                  </button>
                `
                : `
                  <button class="btn" onclick="go('login')">
                    Admin
                  </button>
                `
            }
          </div>
        </header>

        ${body}

      </div>
    `;
  }

  async function go(page) {
    stopTimer();
    S.page = page;
    await render();
  }

  async function render() {
    if (S.page === "home") return home();
    if (S.page === "lessons") return lessons();
    if (S.page === "exams") return exams();
    if (S.page === "info") return info();
    if (S.page === "take") return take();
    if (S.page === "result") return result();
    if (S.page === "ranking") return ranking();
    if (S.page === "login") return login();
    if (S.page === "admin") return admin();
  }

  async function home() {
    let subs = [];

    if (sb) {
      const r = await sb
        .from("subjects")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");

      if (r.error) {
        console.error("SUBJECT ERROR:", r.error);
      } else {
        subs = r.data || [];
      }
    }

    if (!subs.length) {
      subs = fallback.map((x, i) => ({
        id: "f" + i,
        name: x[0],
        icon: x[1]
      }));
    }

    const status = sb
      ? `<span class="tag ok">Đã kết nối Supabase</span>`
      : `<span class="tag warn">Chưa kết nối Supabase</span>`;

    layout(`
      <section class="card">

        <div class="row">
          <div>
            <h1>Chọn môn học</h1>

            <p class="muted">
              Chọn môn → bài → đề → nhập tên và lớp → làm bài → lưu điểm.
            </p>
          </div>

          <div class="right">
            ${status}
          </div>
        </div>

        ${
          !sb
            ? `
              <div class="notice">
                Website đang ở chế độ kiểm tra giao diện.
              </div>
            `
            : ""
        }

      </section>

      <section class="grid subjects">

        ${subs
          .map(
            (x) => `
              <button
                class="subject"
                onclick="chooseSubject('${x.id}')"
              >
                <h3>
                  ${x.icon || "📘"} ${esc(x.name)}
                </h3>

                <span class="muted">
                  Xem các bài kiểm tra
                </span>
              </button>
            `
          )
          .join("")}

      </section>
    `);
  }

  function chooseSubject(id) {
    S.subject = id;
    S.lesson = null;
    go("lessons");
  }

  async function lessons() {
    if (!sb) {
      return layout(`
        <section class="card">

          <button class="btn" onclick="go('home')">
            ← Môn
          </button>

          <h2>Chưa kết nối Supabase</h2>

          <p class="muted">
            Không thể lấy danh sách bài học.
          </p>

        </section>
      `);
    }

    const r = await sb
      .from("lessons")
      .select("*")
      .eq("subject_id", S.subject)
      .eq("is_active", true)
      .order("sort_order");

    if (r.error) {
      return showError(r.error);
    }

    layout(`
      <section class="card">

        <button class="btn" onclick="go('home')">
          ← Môn
        </button>

        <h2>Chọn bài</h2>

        ${
          (r.data || [])
            .map(
              (x) => `
                <button
                  class="exam"
                  onclick="chooseLesson('${x.id}')"
                >
                  <b>${esc(x.title)}</b>

                  <div class="muted">
                    ${esc(x.description || "")}
                  </div>
                </button>
              `
            )
            .join("") || `<p class="muted">Chưa có bài.</p>`
        }

      </section>
    `);
  }

  function chooseLesson(id) {
    S.lesson = id;
    go("exams");
  }

  async function exams() {
    if (!sb) return go("lessons");

    const r = await sb
      .from("exams")
      .select("*")
      .eq("subject_id", S.subject)
      .eq("lesson_id", S.lesson)
      .eq("is_published", true)
      .order("created_at", { ascending: false });

    if (r.error) {
      return showError(r.error);
    }

    layout(`
      <section class="card">

        <button class="btn" onclick="go('lessons')">
          ← Bài
        </button>

        <h2>Chọn bài kiểm tra</h2>

        ${
          (r.data || [])
            .map(
              (e) => `
                <button
                  class="exam"
                  onclick="openInfo('${e.id}')"
                >
                  <b>${esc(e.title)}</b>

                  <div class="muted">
                    ${e.question_count} câu •
                    ${e.minutes} phút •
                    ${
                      e.attempt_limit === 0
                        ? "Không giới hạn lượt"
                        : e.attempt_limit + " lượt"
                    }
                  </div>
                </button>
              `
            )
            .join("") || `<p class="muted">Chưa có đề được mở.</p>`
        }

      </section>
    `);
  }

  function openInfo(id) {
    S.exam = id;
    go("info");
  }

  async function info() {
    if (!sb) return showError(new Error("Supabase chưa kết nối."));

    const r = await sb
      .from("exams")
      .select("*")
      .eq("id", S.exam)
      .single();

    if (r.error) return showError(r.error);

    const e = r.data;

    layout(`
      <section class="card">

        <h2>${esc(e.title)}</h2>

        <div class="kpi">
          <span>${e.question_count} câu</span>
          <span>${e.minutes} phút</span>
          <span>
            ${
              e.attempt_limit === 0
                ? "Không giới hạn lượt"
                : e.attempt_limit + " lượt"
            }
          </span>
        </div>

        <div class="field">
          <label>Họ và tên</label>
          <input id="name" placeholder="Nhập họ và tên">
        </div>

        <div class="field">
          <label>Lớp</label>
          <input id="cls" placeholder="Ví dụ: 12A3">
        </div>

        <button class="btn primary" onclick="begin()">
          BẮT ĐẦU LÀM BÀI
        </button>

      </section>
    `);
  }

  async function begin() {
    const name = document.getElementById("name").value.trim();
    const cls = document.getElementById("cls").value.trim();

    if (!name || !cls) {
      return alert("Vui lòng nhập họ tên và lớp.");
    }

    const er = await sb
      .from("exams")
      .select("*")
      .eq("id", S.exam)
      .single();

    if (er.error) {
      return alert(er.error.message);
    }

    const e = er.data;

    if (e.attempt_limit > 0) {
      const q = await sb
        .from("attempts")
        .select("id", { count: "exact", head: true })
        .eq("exam_id", e.id)
        .ilike("student_name", name)
        .ilike("student_class", cls);

      if ((q.count || 0) >= e.attempt_limit) {
        return alert(
          `Bạn đã đạt giới hạn ${e.attempt_limit} lượt làm bài.`
        );
      }
    }

    const forms = await sb
      .from("exam_forms")
      .select("*")
      .eq("exam_id", e.id);

    if (forms.error) {
      return alert(forms.error.message);
    }

    const list = forms.data || [];

    const form =
      list[Math.floor(Math.random() * list.length)];

    if (!form) {
      return alert("Đề chưa có mã đề.");
    }

    const qs = await sb
      .from("exam_questions")
      .select(
        "position,question_id,questions(id,question_text,options)"
      )
      .eq("exam_form_id", form.id)
      .order("position");

    if (qs.error) {
      return alert(qs.error.message);
    }

    S.attempt = {
      exam: e,
      form,
      name,
      cls,
      questions: qs.data || []
    };

    S.answers = {};
    S.seconds = e.minutes * 60;
    S.page = "take";

    await render();
    startTimer();
  }

  function startTimer() {
    stopTimer();

    S.timer = setInterval(() => {
      S.seconds--;

      const t = document.getElementById("timer");

      if (t) {
        t.textContent = fmt(S.seconds);
      }

      if (S.seconds <= 0) {
        stopTimer();
        submit(true);
      }
    }, 1000);
  }

  function stopTimer() {
    if (S.timer) {
      clearInterval(S.timer);
    }

    S.timer = null;
  }

  function fmt(s) {
    s = Math.max(0, s);

    return (
      String(Math.floor(s / 60)).padStart(2, "0") +
      ":" +
      String(s % 60).padStart(2, "0")
    );
  }

  function take() {
    const a = S.attempt;

    layout(`
      <section class="card">

        <div class="row">

          <div>
            <b>${esc(a.name)}</b>

            <div class="muted">
              ${esc(a.cls)} • Mã đề ${a.form.form_number}
            </div>
          </div>

          <div class="right timer" id="timer">
            ${fmt(S.seconds)}
          </div>

        </div>

        <div class="kpi">
          <span>
            ${Object.keys(S.answers).length}/${a.questions.length}
            đã làm
          </span>
        </div>

      </section>

      ${a.questions
        .map((x, i) => {
          const q = x.questions;

          return `
            <section class="card">

              <div class="muted">
                Câu ${i + 1}/${a.questions.length}
              </div>

              <div>
                <b>${esc(q.question_text)}</b>
              </div>

              ${(q.options || [])
                .map(
                  (o, j) => `
                    <button
                      class="option ${
                        S.answers[q.id] === j ? "sel" : ""
                      }"
                      onclick="pick('${q.id}',${j})"
                    >
                      ${String.fromCharCode(65 + j)}.
                      ${esc(o)}
                    </button>
                  `
                )
                .join("")}

            </section>
          `;
        })
        .join("")}

      <button
        class="btn primary submit"
        onclick="submit(false)"
      >
        NỘP BÀI
      </button>
    `);
  }

  function pick(id, index) {
    S.answers[id] = index;
    take();
  }

  async function submit(auto) {
    stopTimer();

    if (
      !auto &&
      !confirm("Nộp bài và chấm điểm?")
    ) {
      startTimer();
      return;
    }

    const a = S.attempt;

    try {
      const sess = await sb.auth.getSession();

      const token =
        sess.data.session?.access_token ||
        C.SUPABASE_ANON_KEY;

      const response = await fetch(
        C.SUPABASE_URL +
          "/functions/v1/submit-attempt",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + token,
            "apikey": C.SUPABASE_ANON_KEY
          },

          body: JSON.stringify({
            exam_id: a.exam.id,
            exam_form_id: a.form.id,
            student_name: a.name,
            student_class: a.cls,
            answers: Object.entries(
              S.answers
            ).map(
              ([question_id, chosen_index]) => ({
                question_id,
                chosen_index
              })
            )
          })
        }
      );

      const d =
        await response.json().catch(() => ({}));

      if (!response.ok) {
        return alert(
          d.error || "Không thể nộp bài."
        );
      }

      S.result = {
        score: Number(d.score),
        correct: d.correct,
        total: d.total,
        auto
      };

      go("result");

    } catch (e) {
      alert(
        "Lỗi kết nối: " +
        (e.message || e)
      );
    }
  }

  function result() {
    const r = S.result;

    layout(`
      <section class="card center">

        <h1>Kết quả</h1>

        <div class="score">
          ${r.score.toFixed(2)}/10
        </div>

        <p>
          ${r.correct}/${r.total} câu đúng
        </p>

        ${
          r.auto
            ? `<p class="muted">
                Bài tự động nộp khi hết giờ.
              </p>`
            : ""
        }

        <div class="row center">

          <button
            class="btn primary"
            onclick="go('home')"
          >
            LÀM BÀI KHÁC
          </button>

          <button
            class="btn"
            onclick="go('ranking')"
          >
            XEM XẾP HẠNG
          </button>

        </div>

      </section>
    `);
  }

  async function ranking() {
    if (!sb) {
      return layout(`
        <section class="card">
          <h2>Xếp hạng</h2>
          <p class="muted">
            Chưa kết nối Supabase.
          </p>
        </section>
      `);
    }

    const r = await sb
      .from("attempts")
      .select(
        "student_name,student_class,score,submitted_at,exam_id,exams(title,ranking_enabled,ranking_mode)"
      )
      .order("score", {
        ascending: false
      })
      .limit(100);

    if (r.error) {
      return showError(r.error);
    }

    const rows = (r.data || [])
      .filter(
        (x) => x.exams?.ranking_enabled
      );

    layout(`
      <section class="card">

        <h2>Xếp hạng</h2>

        <p class="muted">
          Các lượt làm được lưu riêng.
        </p>

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

              ${rows
                .map(
                  (x, i) => `
                    <tr>
                      <td>${i + 1}</td>
                      <td>${esc(x.student_name)}</td>
                      <td>${esc(x.student_class)}</td>
                      <td>
                        <b>
                          ${Number(x.score).toFixed(2)}
                        </b>
                      </td>
                      <td>
                        ${esc(x.exams?.title || "")}
                      </td>
                    </tr>
                  `
                )
                .join("")}

            </tbody>

          </table>

        </div>

      </section>
    `);
  }

  function login() {
    layout(`
      <section class="card narrow">

        <h2>Đăng nhập Admin</h2>

        <div class="field">
          <label>Email</label>
          <input
            id="email"
            type="email"
          >
        </div>

        <div class="field">
          <label>Mật khẩu</label>
          <input
            id="pass"
            type="password"
          >
        </div>

        <button
          class="btn primary"
          onclick="doLogin()"
        >
          ĐĂNG NHẬP
        </button>

      </section>
    `);
  }

  async function doLogin() {
    if (!sb) {
      return alert(
        "Supabase chưa kết nối."
      );
    }

    const email =
      document.getElementById("email").value;

    const password =
      document.getElementById("pass").value;

    const r =
      await sb.auth.signInWithPassword({
        email,
        password
      });

    if (r.error) {
      return alert(r.error.message);
    }

    const p = await sb
      .from("profiles")
      .select("role")
      .eq("id", r.data.user.id)
      .single();

    if (p.error) {
      await sb.auth.signOut();

      return alert(
        "Không kiểm tra được quyền Admin: " +
        p.error.message
      );
    }

    if (p.data?.role !== "admin") {
      await sb.auth.signOut();

      return alert(
        "Tài khoản không có quyền Admin."
      );
    }

    S.user = r.data.user;

    go("admin");
  }

  async function logout() {
    if (sb) {
      await sb.auth.signOut();
    }

    S.user = null;

    go("home");
  }

  function admin() {
    layout(`
      <section class="card">

        <div class="row">

          <div>
            <h2>Quản trị</h2>

            <div class="muted">
              Quản lý câu hỏi, đề thi,
              lượt làm và AI.
            </div>
          </div>

          <div class="right">
            <button
              class="btn primary"
              onclick="aiPanel()"
            >
              AI TẠO ĐỀ
            </button>
          </div>

        </div>

      </section>

      <section class="grid two">

        <div class="card">
          <h3>Tạo đề thủ công</h3>

          <button
            class="btn"
            onclick="examPanel()"
          >
            Tạo bài kiểm tra
          </button>
        </div>

        <div class="card">
          <h3>Ngân hàng câu hỏi</h3>

          <button
            class="btn"
            onclick="questionPanel()"
          >
            Xem câu hỏi
          </button>
        </div>

        <div class="card">
          <h3>Lượt làm</h3>

          <button
            class="btn"
            onclick="adminResults()"
          >
            Xem kết quả
          </button>
        </div>

      </section>
    `);
  }

  async function questionPanel() {
    const r = await sb
      .from("questions")
      .select(
        "id,question_text,answer_index,difficulty,approved,created_at"
      )
      .order("created_at", {
        ascending: false
      })
      .limit(100);

    if (r.error) {
      return showError(r.error);
    }

    layout(`
      <section class="card">

        <div class="row">
          <button
            class="btn"
            onclick="go('admin')"
          >
            ← Admin
          </button>

          <h2>Câu hỏi</h2>
        </div>

        ${(r.data || [])
          .map(
            (q, i) => `
              <div class="question">

                <b>
                  ${i + 1}.
                  ${esc(q.question_text)}
                </b>

                <div class="muted">
                  Đáp án
                  ${String.fromCharCode(
                    65 + q.answer_index
                  )}
                  • ${esc(q.difficulty)}
                  •
                  ${
                    q.approved
                      ? "Đã duyệt"
                      : "Chưa duyệt"
                  }
                </div>

              </div>
            `
          )
          .join("")}

      </section>
    `);
  }

  async function adminResults() {
    const r = await sb
      .from("attempts")
      .select(
        "student_name,student_class,score,total_correct,total_questions,submitted_at,exams(title)"
      )
      .order("submitted_at", {
        ascending: false
      })
      .limit(300);

    if (r.error) {
      return showError(r.error);
    }

    layout(`
      <section class="card">

        <div class="row">

          <button
            class="btn"
            onclick="go('admin')"
          >
            ← Admin
          </button>

          <h2>Kết quả</h2>

        </div>

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

              ${(r.data || [])
                .map(
                  (x) => `
                    <tr>

                      <td>
                        ${esc(x.student_name)}
                      </td>

                      <td>
                        ${esc(x.student_class)}
                      </td>

                      <td>
                        ${esc(
                          x.exams?.title || ""
                        )}
                      </td>

                      <td>
                        ${Number(
                          x.score
                        ).toFixed(2)}
                      </td>

                      <td>
                        ${x.total_correct}/
                        ${x.total_questions}
                      </td>

                      <td>
                        ${new Date(
                          x.submitted_at
                        ).toLocaleString(
                          "vi-VN"
                        )}
                      </td>

                    </tr>
                  `
                )
                .join("")}

            </tbody>

          </table>

        </div>

      </section>
    `);
  }

  Object.assign(window, {
    go,
    chooseSubject,
    chooseLesson,
    openInfo,
    begin,
    pick,
    submit,
    logout,
    doLogin,
    questionPanel,
    adminResults
  });

  window.addEventListener(
    "error",
    (e) => {
      console.error(e.error || e.message);
    }
  );

  const connection = initSupabase();

  if (!connection.ok) {
    showError(connection.error);
  } else {
    render().catch(showError);

    sb.auth.onAuthStateChange(
      (_event, session) => {
        S.user = session?.user || null;
      }
    );
  }

})();
