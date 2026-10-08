/* =========================================================
   SUBJECTS.JS
   Quản lý môn học độc lập với app.js
   ========================================================= */

(function () {
  "use strict";

  function getSB() {
    return window.sb || null;
  }

  function getApp() {
    return document.getElementById("app");
  }

  function esc(x) {
    return String(x ?? "").replace(/[&<>"']/g, m => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[m]));
  }

  /* =======================================================
     DANH SÁCH MÔN
     ======================================================= */

  window.subjectManager = async function () {

    const sb = getSB();

    if (!sb) {
      alert("Supabase chưa được khởi tạo.");
      return;
    }

    const root = getApp();

    root.innerHTML = `
      <div class="wrap">

        <header class="top">
          <div>
            <div class="brand">Quản lý môn học</div>
            <span class="tag">Thêm • sửa • ẩn • hiện • xóa</span>
          </div>

          <div class="nav">
            <button class="btn" onclick="go('admin')">
              Quay lại
            </button>
          </div>
        </header>

        <main class="card">

          <div class="section-head">
            <div>
              <h2>Môn học</h2>
              <p class="muted">
                Các môn đang bật sẽ xuất hiện ở trang học sinh.
              </p>
            </div>

            <button
              class="btn primary"
              onclick="window.addSubjectForm()">
              + Thêm môn
            </button>
          </div>

          <div id="subject-list">
            <div class="muted">
              Đang tải môn học...
            </div>
          </div>

        </main>

      </div>
    `;

    await loadSubjects();
  };


  /* =======================================================
     LOAD SUBJECTS
     ======================================================= */

  async function loadSubjects() {

    const sb = getSB();
    const box = document.getElementById("subject-list");

    if (!box) return;

    const { data, error } = await sb
      .from("subjects")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });

    if (error) {

      box.innerHTML = `
        <div class="empty">
          <b>Không tải được môn học</b>
          <p>${esc(error.message)}</p>
        </div>
      `;

      return;
    }

    if (!data || !data.length) {

      box.innerHTML = `
        <div class="empty">
          <div style="font-size:40px">📚</div>
          <h3>Chưa có môn học</h3>
          <p class="muted">
            Bấm "+ Thêm môn" để tạo môn đầu tiên.
          </p>
        </div>
      `;

      return;
    }

    box.innerHTML = `
      <div class="subject-admin-list">

        ${data.map(s => {

          const active = s.is_active !== false;

          return `
            <div class="subject-admin-item">

              <div
                class="subject-admin-icon"
                style="background:${esc(s.color || "#7457ff")}22;
                       border:1px solid ${esc(s.color || "#7457ff")}55">
                ${esc(s.icon || "📚")}
              </div>

              <div class="subject-admin-info">

                <strong>
                  ${esc(s.name)}
                </strong>

                <div class="muted">
                  ${esc(s.description || "Chưa có mô tả")}
                </div>

                <small class="${active ? "status-active" : "status-hidden"}">
                  ${active ? "● Đang hiển thị" : "● Đang ẩn"}
                </small>

              </div>

              <div class="subject-admin-actions">

                <button
                  class="btn small"
                  onclick="window.toggleSubject('${s.id}', ${active})">
                  ${active ? "Ẩn" : "Hiện"}
                </button>

                <button
                  class="btn small"
                  onclick="window.editSubject('${s.id}')">
                  Sửa
                </button>

                <button
                  class="btn small danger"
                  onclick="window.deleteSubject('${s.id}')">
                  Xóa
                </button>

              </div>

            </div>
          `;

        }).join("")}

      </div>
    `;
  }


  /* =======================================================
     FORM THÊM
     ======================================================= */

  window.addSubjectForm = function () {

    const root = getApp();

    const html = `
      <div class="modal-backdrop">

        <div class="modal-card">

          <div class="section-head">
            <h2>Thêm môn học</h2>

            <button
              class="btn"
              onclick="this.closest('.modal-backdrop').remove()">
              Đóng
            </button>
          </div>

          <label>Tên môn</label>

          <input
            id="new-subject-name"
            class="input"
            placeholder="Ví dụ: Vật lí">

          <label>Icon</label>

          <input
            id="new-subject-icon"
            class="input"
            value="📚"
            maxlength="10">

          <label>Màu</label>

          <input
            id="new-subject-color"
            class="input"
            type="color"
            value="#7457ff">

          <label>Mô tả</label>

          <input
            id="new-subject-description"
            class="input"
            placeholder="Ví dụ: Ôn thi tốt nghiệp THPT">

          <label>Thứ tự</label>

          <input
            id="new-subject-sort"
            class="input"
            type="number"
            value="0">

          <label class="check-row">

            <input
              id="new-subject-active"
              type="checkbox"
              checked>

            Hiển thị cho học sinh

          </label>

          <div class="modal-actions">

            <button
              class="btn primary"
              onclick="window.createSubject()">
              Tạo môn
            </button>

            <button
              class="btn"
              onclick="this.closest('.modal-backdrop').remove()">
              Hủy
            </button>

          </div>

        </div>

      </div>
    `;

    root.insertAdjacentHTML("beforeend", html);
  };


  /* =======================================================
     CREATE
     ======================================================= */

  window.createSubject = async function () {

    const sb = getSB();

    const name =
      document.getElementById("new-subject-name")?.value.trim();

    const icon =
      document.getElementById("new-subject-icon")?.value.trim() || "📚";

    const color =
      document.getElementById("new-subject-color")?.value || "#7457ff";

    const description =
      document.getElementById("new-subject-description")?.value.trim() || "";

    const sort_order =
      Number(document.getElementById("new-subject-sort")?.value || 0);

    const is_active =
      document.getElementById("new-subject-active")?.checked ?? true;

    if (!name) {
      alert("Vui lòng nhập tên môn.");
      return;
    }

    const { error } = await sb
      .from("subjects")
      .insert({
        name,
        icon,
        color,
        description,
        sort_order,
        is_active
      });

    if (error) {

      alert(
        "Không lưu được môn học:\n\n" +
        error.message
      );

      return;
    }

    document
      .querySelector(".modal-backdrop")
      ?.remove();

    await loadSubjects();
  };


  /* =======================================================
     ẨN / HIỆN
     ======================================================= */

  window.toggleSubject = async function (id, current) {

    const sb = getSB();

    const { error } = await sb
      .from("subjects")
      .update({
        is_active: !current
      })
      .eq("id", id);

    if (error) {

      alert(
        "Không thể thay đổi trạng thái:\n\n" +
        error.message
      );

      return;
    }

    await loadSubjects();
  };


  /* =======================================================
     SỬA
     ======================================================= */

  window.editSubject = async function (id) {

    const sb = getSB();

    const { data, error } = await sb
      .from("subjects")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !data) {

      alert(
        "Không tìm thấy môn học:\n\n" +
        (error?.message || "")
      );

      return;
    }

    const root = getApp();

    root.insertAdjacentHTML("beforeend", `

      <div class="modal-backdrop">

        <div class="modal-card">

          <div class="section-head">

            <h2>Sửa môn học</h2>

            <button
              class="btn"
              onclick="this.closest('.modal-backdrop').remove()">
              Đóng
            </button>

          </div>

          <label>Tên môn</label>

          <input
            id="edit-name"
            class="input"
            value="${esc(data.name)}">

          <label>Icon</label>

          <input
            id="edit-icon"
            class="input"
            value="${esc(data.icon || "📚")}">

          <label>Màu</label>

          <input
            id="edit-color"
            class="input"
            type="color"
            value="${esc(data.color || "#7457ff")}">

          <label>Mô tả</label>

          <input
            id="edit-description"
            class="input"
            value="${esc(data.description || "")}">

          <label>Thứ tự</label>

          <input
            id="edit-sort"
            class="input"
            type="number"
            value="${Number(data.sort_order || 0)}">

          <label class="check-row">

            <input
              id="edit-active"
              type="checkbox"
              ${data.is_active !== false ? "checked" : ""}>

            Hiển thị cho học sinh

          </label>

          <div class="modal-actions">

            <button
              class="btn primary"
              onclick="window.saveSubject('${id}')">
              Lưu
            </button>

            <button
              class="btn"
              onclick="this.closest('.modal-backdrop').remove()">
              Hủy
            </button>

          </div>

        </div>

      </div>
    `);
  };


  /* =======================================================
     SAVE EDIT
     ======================================================= */

  window.saveSubject = async function (id) {

    const sb = getSB();

    const payload = {

      name:
        document.getElementById("edit-name").value.trim(),

      icon:
        document.getElementById("edit-icon").value.trim() || "📚",

      color:
        document.getElementById("edit-color").value || "#7457ff",

      description:
        document.getElementById("edit-description").value.trim(),

      sort_order:
        Number(document.getElementById("edit-sort").value || 0),

      is_active:
        document.getElementById("edit-active").checked
    };

    if (!payload.name) {
      alert("Tên môn không được để trống.");
      return;
    }

    const { error } = await sb
      .from("subjects")
      .update(payload)
      .eq("id", id);

    if (error) {

      alert(
        "Không thể lưu:\n\n" +
        error.message
      );

      return;
    }

    document
      .querySelector(".modal-backdrop")
      ?.remove();

    await loadSubjects();
  };


  /* =======================================================
     DELETE
     ======================================================= */

  window.deleteSubject = async function (id) {

    const sb = getSB();

    const ok = confirm(
      "Bạn có chắc muốn XÓA môn này?\n\n" +
      "Các bài học / đề thi liên quan có thể khiến Supabase từ chối xóa."
    );

    if (!ok) return;

    const { error } = await sb
      .from("subjects")
      .delete()
      .eq("id", id);

    if (error) {

      alert(
        "Không thể xóa môn học.\n\n" +
        error.message +
        "\n\nNếu môn đã có bài học/đề thi, hãy dùng ẨN thay vì XÓA."
      );

      return;
    }

    await loadSubjects();
  };

})();
