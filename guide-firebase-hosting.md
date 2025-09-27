Hướng dẫn triển khai ứng dụng lên Firebase Hosting
Bước 1: Cài đặt Firebase CLI
Mở terminal hoặc command prompt và cài đặt Firebase CLI (Command Line Interface).

npm install -g firebase-tools

Bước 2: Đăng nhập vào Firebase
Sau khi cài đặt, hãy đăng nhập vào tài khoản Google của bạn thông qua CLI.

firebase login

Thao tác này sẽ mở một cửa sổ trình duyệt để bạn xác thực tài khoản.

Bước 3: Khởi tạo dự án Firebase
Trong thư mục gốc của dự án React của bạn (my-videohub-react-ts-app), chạy lệnh sau.

firebase init

Thực hiện theo các bước sau trong quá trình khởi tạo:

Chọn "Hosting: Configure files for Firebase Hosting and (optionally) set up GitHub Action deploys".

Khi được hỏi về project, chọn "Use an existing project" và chọn project Firebase bạn đã tạo.

Khi được hỏi về thư mục public, nhập "dist" (vì Vite mặc định build ra thư mục này).

Khi được hỏi "Configure as a single-page app (rewrite all urls to /index.html)?", nhập "y" (yes).

Khi được hỏi "Set up automatic builds and deploys with GitHub?", bạn có thể chọn "n" (no) để triển khai thủ công.

Bước 4: Xây dựng ứng dụng React
Chạy lệnh build để tạo các file tĩnh của ứng dụng React.

npm run build

Lệnh này sẽ tạo ra một thư mục dist chứa các file HTML, CSS và JavaScript đã được tối ưu hóa.

Bước 5: Triển khai ứng dụng lên Firebase Hosting
Cuối cùng, chạy lệnh sau để triển khai ứng dụng của bạn.

firebase deploy

Thao tác này sẽ tải nội dung của thư mục dist lên Firebase Hosting. Sau khi hoàn tất, bạn sẽ nhận được một URL công khai (ví dụ: https://your-project-id.web.app) mà bạn có thể truy cập ứng dụng của mình.

Lưu ý quan trọng
Để các chức năng của Firebase hoạt động đúng cách, bạn cần đảm bảo đã bật các dịch vụ sau trong Firebase Console của mình:

Authentication: Bật Email/Password provider.

Firestore Database: Tạo một cơ sở dữ liệu.

Cloud Storage: Bật dịch vụ Storage.