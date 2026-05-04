# VideoHub — Nhật ký cập nhật tính năng

---

## 1. KaTeX Math Formula Rendering

**Mục đích:** Render công thức toán học dạng LaTeX trong nội dung bài học Markdown.

**Packages thêm vào:**
- `remark-math` — parse `$inline$` và `$$block$$` trong Markdown
- `rehype-katex` — render KaTeX HTML từ AST
- `katex` — thư viện render KaTeX

**Files thay đổi:**
- `src/main.tsx` — thêm `import 'katex/dist/katex.min.css'`
- `src/pages/CourseDetailPage.tsx` — thêm `remarkMath` vào `remarkPlugins`, `rehypeKatex` vào `rehypePlugins`

**Cách dùng trong nội dung bài học:**
```
Inline: $E = mc^2$
Block:
$$
\int_0^\infty e^{-x^2} dx = \frac{\sqrt{\pi}}{2}
$$
```

---

## 2. Fix Doubled Side Whitespace trong Lesson Content

**Vấn đề:** Panel nội dung bài học có 2 lớp padding ngang chồng nhau:
- Outer `<main>` có `p-6 md:p-10`
- Inner content div có thêm `max-w-3xl mx-auto` + `p-8`

**Fix:** 
- Đổi `p-8` → `py-8 px-6 md:px-10` trên container outer
- Xóa `max-w-*` và `mx-auto` khỏi inner div

**Files thay đổi:**
- `src/pages/CourseDetailPage.tsx` — cả 3 loại content (`custom`, `audio`, `text`) đều được fix

---

## 3. Kanji Furigana Hover Tooltip

**Mục đích:** Ẩn hiragana trong ngoặc `漢字（ふりがな）` khỏi văn bản, thay bằng tooltip xuất hiện khi hover.

**Cách hoạt động:**
1. `preprocessFurigana()` chuyển `漢字（ふりがな）` → `<ruby class="jp-ruby" data-rt="ふりがな">漢字<rt>ふりがな</rt></ruby>`
2. Hỗ trợ cả full-width `（）` và half-width `()`
3. `rehype-raw` được thêm vào để cho phép HTML pass-through trong `react-markdown`
4. CSS trong `src/index.css` ẩn `<rt>` và hiện tooltip tối phía trên chữ qua `::after` pseudo-element

**Packages thêm vào:**
- `rehype-raw` — cho phép HTML trong Markdown content

**Files thay đổi:**
- `src/pages/CourseDetailPage.tsx` — thêm `preprocessFurigana()`, thêm `rehypeRaw` vào plugins
- `src/index.css` — thêm CSS rules cho `.markdown-body ruby.jp-ruby`

**Ví dụ:** `食事（しょくじ）` → chữ `食事` có gạch chân dashed; hover sẽ hiện `しょくじ` ở trên

---

## 4. Admin Statistics Dashboard

**Mục đích:** Trang thống kê hệ thống cho admin với dữ liệu real-time.

**Files mới:**
- `src/services/firebase/stats.ts`:
  - `subscribeToAllEnrollments()` — live listener toàn bộ enrollments
  - `fetchUserProgressCount(userId)` — đếm bài hoàn thành của một user

**Files thay đổi:**
- `src/services/firebase/index.ts` — export `stats.ts`
- `src/components/Admin/StatsDashboardPage.tsx` — component trang thống kê (đã tồn tại, được viết lại hoàn chỉnh)
- `src/pages/AdminDashboard.tsx` — thêm tab "Thống kê" với icon `BarChart2`

**Nội dung trang thống kê:**

| Section | Mô tả |
|---|---|
| 4 Summary Cards | Tổng học viên (+mới 7 ngày), Khóa học (tổng bài), Tổng ghi danh, Tỉ lệ hoàn thành |
| Top đăng ký | Bar chart CSS — top 7 khoá theo enrollment |
| Top đang học | Bar chart CSS — top 7 khoá theo `status=active` |
| Bảng Course ID | Tất cả khoá học với ID copy-able, số bài, ghi danh, đang học, hoàn thành, tỉ lệ |
| Top học viên | Top 10 theo số bài hoàn thành (có nút Làm mới) |
| Học viên gần đây | 8 người đăng ký gần nhất + số khoá đã đăng ký |
| Tài khoản Admin | Danh sách admin với role badge |

---

## 5. Category Tag cho Khóa học

**Mục đích:** Cho phép admin tổ chức khóa học theo danh mục (category), học viên có thể lọc theo danh mục.

### Data Model

**Firestore path:** `artifacts/{APP_ID_ROOT}/public/data/categories`

```typescript
interface Category {
  id: string;
  name: MultilingualField;         // Tên đa ngôn ngữ (vi bắt buộc, ja optional)
  color: string;                   // 'blue' | 'green' | 'purple' | 'red' | 'yellow' | 'indigo' | 'pink' | 'orange'
  emoji: string;                   // Emoji icon, mặc định '📚'
  description?: MultilingualField; // Mô tả tùy chọn
  createdAt: number;
}
```

**Cập nhật Course interface:**
```typescript
interface Course {
  // ... existing fields
  categoryIds?: string[]; // Danh sách ID của các category (multi-category)
}
```

### Features

| Tính năng | Mô tả |
|---|---|
| Multi-category | Mỗi khóa học có thể thuộc nhiều category |
| Color coding | 8 màu preset để phân biệt trực quan |
| Emoji icon | Mỗi category có emoji icon tùy chỉnh |
| Admin: Quản lý | Tab riêng "Danh mục" — tạo/sửa/xóa category |
| Admin: Gán | Trong form tạo/sửa khóa học có multi-select picker |
| Admin: Filter | Lọc danh sách khóa học theo category trong tab Courses |
| Admin: Thống kê | Bảng stats hiển thị category badges trên mỗi khóa học |
| Landing Page | Filter category + "Tất cả" ở đầu trang khóa học |
| Course Card | Hiện badge màu với emoji + tên category |

### Files mới
- `src/services/firebase/categories.ts` — CRUD + subscribe categories
- `src/components/Admin/CategoryManagerPage.tsx` — Trang quản lý danh mục

### Files thay đổi
- `src/services/firebase/config.ts` — thêm `getCategoriesCollectionRef()`
- `src/services/firebase/courses.ts` — thêm `categoryIds` vào `Course` interface
- `src/services/firebase/index.ts` — export `categories.ts`
- `src/components/Admin/CourseCard.tsx` — hiển thị category badges
- `src/components/Admin/CreateCourseForm.tsx` — thêm category multi-select picker
- `src/pages/AdminDashboard.tsx` — thêm tab "Danh mục", filter category ở tab Courses
- `src/pages/LandingPage.tsx` — thêm filter bar theo category

### Hướng phát triển thêm (đề xuất)
- Cho phép sắp xếp thứ tự category (`sortOrder` field)
- Trang landing riêng cho từng category với slug URL-friendly
- Badge "Mới" / "Phổ biến" cho category
- Giới hạn số lượng khóa học tối đa trong 1 category
- Export báo cáo theo category

---

## Cấu trúc Firestore (tóm tắt)

```
artifacts/
  video-hub-prod-id/
    public/
      data/
        courses/          ← Khóa học
        categories/       ← Danh mục (MỚI)
        enrollments/      ← Ghi danh
        users/            ← Hồ sơ học viên
    users/
      {userId}/
        progress/         ← Tiến độ xem bài
```
