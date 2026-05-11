📝 Project SEO Strategy & Implementation Instructions
1. Core SEO Design (Schema & Metadata)
Khi tạo hoặc cập nhật các Page/Component, luôn đảm bảo có cấu trúc Metadata sau:

Title Tag: Tối ưu từ 50-60 ký tự. Cấu trúc: [Tên nội dung] | [Từ khóa chính] - [Thương hiệu].

Meta Description: 150-160 ký tự, chứa từ khóa chính và lời kêu gọi hành động (CTA).

Hreflang Tags: Cấu hình liên kết song ngữ để Google định vị đúng thị trường VN và JP.

<link rel="alternate" hreflang="vi" href="..." />

<link rel="alternate" hreflang="ja" href="..." />

2. Bilingual Keyword Strategy (VN/JP)
Hệ thống tập trung vào 2 mảng chính: "English for Parents & Kids" và "JLPT Preparation".

Nhóm Tiếng Việt (Target: Phụ huynh & Người Việt tại Nhật)
English: học tiếng anh cùng con, tiếng anh trẻ em A2, lộ trình tiếng anh gia đình, bố mẹ dạy con học tiếng anh.

JLPT: luyện thi JLPT N5-N1, học tiếng nhật tại nhật, mẹo thi năng lực tiếng nhật, từ vựng JLPT chuyên sâu.

Nhóm Tiếng Nhật (Target: Local SEO & Native users)
English: 親子で学ぶ英語, 子供英語 A2レベル, 英語学習ロードマップ, バイリンガル育児.

JLPT: JLPT対策, 日本語能力試験, ベトナム人向け日本語学習, JLPT合格のコツ.

3. Admin Management Requirements
Ngoài các keyword mặc định trên, phải thiết kế giao diện Admin cho phép người dùng (Admin) cập nhật SEO động mà không cần can thiệp vào code:

SEO Form Fields:

Input: seo_title, seo_description, seo_keywords.

Checkbox: is_indexable (Điều khiển thẻ NoIndex).

Input: canonical_url (Tránh trùng lặp nội dung).

Media SEO: Mỗi ảnh/video upload phải có trường alt_text (Văn bản thay thế) và caption.

Storage Strategy: Lưu các trường này vào Firestore kèm theo từng Document bài học/bài viết.

4. Technical SEO & Sitemap
Sitemap.xml:

Phải là Dynamic Sitemap (Sinh ra tự động dựa trên database).

Cấu trúc XML phải bao gồm các thẻ <xhtml:link> để khai báo song ngữ.

Robots.txt:

Chỉ định đường dẫn chính xác đến sitemap.xml.

Phân quyền cho User-agent: *.

Performance:

Ưu tiên sử dụng Next.js hoặc Vite-plugin-ssr để hỗ trợ cào dữ liệu.

Hình ảnh phải được convert sang định dạng .webp để tối ưu tốc độ.

5. Content Structure (On-page)
Khi generate nội dung bài viết/bài học, tuân thủ:

H1 Tag: Duy nhất 1 thẻ mỗi trang, chứa từ khóa chính.

H2/H3 Tags: Phân cấp nội dung rõ ràng, chứa các từ khóa phụ (LSI keywords).

Internal Links: Luôn có link liên kết giữa bài học tiếng Anh và tiếng Nhật liên quan.

Mobile First: Video phải có thuộc tính playsInline, muted, và đúng MIME Type (video/mp4) để chạy được trên iPhone/Safari.

6. Local SEO (Japan Focus)
Tận dụng vị trí địa lý tại Nhật Bản:

Thêm các từ khóa địa danh: Tokyo, Osaka, Yokohama, Saitama vào các bài viết kinh nghiệm để tăng thứ hạng tìm kiếm địa phương cho cộng đồng người Việt.

Lưu ý khi Code: Luôn kiểm tra tính nhất quán giữa dữ liệu nhập từ Admin và các thẻ Meta rendered ở Front-end bằng cách sử dụng react-helmet-async.