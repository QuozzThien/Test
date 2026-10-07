# Kho Trắc Nghiệm Đa Môn — GitHub Pages + Supabase + OpenAI

## Upload lên GitHub
Upload **nội dung bên trong thư mục này** vào root của repository. `index.html` phải nằm ngay ở root.

Cấu trúc:
- index.html
- css/main.css
- js/app.js
- js/config.js
- database/schema.sql
- supabase/functions/...

## Cấu hình Supabase
1. Tạo project Supabase.
2. SQL Editor → chạy toàn bộ `database/schema.sql`.
3. Settings → API Keys → lấy Project URL và Publishable key.
4. Sửa `js/config.js`:
   SUPABASE_URL = Project URL
   SUPABASE_ANON_KEY = Publishable key
5. Authentication → Users → tạo tài khoản Admin.
6. Gán `role='admin'` trong `profiles` bằng SQL như hướng dẫn.

## GitHub Pages
Settings → Pages → Deploy from a branch → main → /(root).

## OpenAI
Không đặt OpenAI API key trong GitHub/frontend. Đặt `OPENAI_API_KEY` trong Supabase Edge Function Secrets và deploy function `ai-generate`.

## Lưu ý
Mở `index.html` trực tiếp bằng file:// chỉ phù hợp để xem giao diện cơ bản. Bản chính nên chạy bằng GitHub Pages hoặc local web server.
