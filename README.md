# Minecraft Bot - Hướng dẫn sử dụng

Bot Minecraft được xây dựng bằng Node.js có thể kết nối server và thực hiện các tương tác cơ bản.

## Tính năng chính

- **Kết nối server**: Kết nối với server Minecraft bằng IP và port
- **Xác thực**: Hỗ trợ cả chế độ online và offline
- **Di chuyển**: Khả năng di chuyển cơ bản bao gồm đi bộ, nhảy và tìm đường
- **Hệ thống chat**: Gửi và nhận tin nhắn chat với hỗ trợ lệnh
- **Tương tác thế giới**: Khả năng tương tác thế giới cơ bản
- **Theo dõi trạng thái**: Giám sát trạng thái kết nối và bot theo thời gian thực
- **Xử lý lỗi**: Xử lý lỗi mạnh mẽ và logic kết nối lại
- **Đa bot**: Hỗ trợ tạo và quản lý nhiều bot cùng lúc
- **Chống kick**: Tự động thực hiện hành động để tránh bị kick khỏi server

## Cài đặt

Đảm bảo bạn đã cài đặt Node.js, sau đó cài đặt các dependencies:

```bash
npm install mineflayer mineflayer-pathfinder minecraft-protocol winston colors dotenv readline
```

## Khởi chạy

```bash
node index.js
```

## Hướng dẫn sử dụng

### Kết nối với server

1. **Kết nối cơ bản:**
   ```
   connect <địa_chỉ_server> [port]
   ```
   
   Ví dụ:
   ```
   connect localhost
   connect play.hypixel.net
   connect 192.168.1.100 25565
   ```

2. **Test kết nối nhanh:**
   ```
   testlocal     - Thử kết nối localhost:25565
   testhypixel   - Thử kết nối mc.hypixel.net
   testminehut   - Thử kết nối minehut.com
   ```

### Điều khiển bot

```
chat <tin_nhắn>           - Gửi tin nhắn chat
move <hướng> <khoảng_cách> - Di chuyển (forward/back/left/right)
jump                      - Nhảy
follow <tên_người_chơi>   - Theo dõi người chơi
stop                      - Dừng hành động hiện tại
status                    - Hiển thị trạng thái
disconnect               - Ngắt kết nối
```

### Quản lý nhiều bot

```
create <số_lượng>        - Tạo nhiều bot
connectall <server>      - Kết nối tất cả bot
list                     - Hiển thị danh sách bot
chatall <tin_nhắn>       - Gửi tin nhắn từ tất cả bot
removeall               - Xóa tất cả bot
```

### Lệnh trong game

Bot có thể nhận lệnh từ chat trong game:
```
!pos        - Vị trí của bot
!health     - Máu và đói của bot
!follow     - Bot theo dõi bạn
!stop       - Bot dừng hành động
!help       - Danh sách lệnh
```

## Cấu hình

Bot sử dụng file `config/bot-config.js` để cấu hình. Các tùy chọn chính:

- `username`: Tên bot (tự động tạo ngẫu nhiên)
- `version`: Phiên bản Minecraft (mặc định 1.21)
- `auth`: Chế độ xác thực (offline/microsoft/mojang)
- `autoRespawn`: Tự động hồi sinh khi chết
- `antiKick`: Chống bị kick khỏi server
- `bypassVerification`: Bỏ qua xác minh client

## Xử lý lỗi thường gặp

### Lỗi kết nối
- **ECONNRESET**: Server từ chối kết nối, có thể do:
  - Server có hệ thống chống bot
  - Phiên bản client không hợp lệ
  - Server có whitelist/hạn chế IP

- **ENOTFOUND**: Không tìm thấy server, kiểm tra địa chỉ
- **ECONNREFUSED**: Server offline hoặc port bị chặn
- **ETIMEDOUT**: Kết nối quá chậm hoặc không thể truy cập

### Giải pháp
1. Thử với server khác để kiểm tra bot
2. Đổi phiên bản Minecraft trong config
3. Sử dụng chế độ offline cho server local
4. Kiểm tra firewall và kết nối mạng

## Ví dụ sử dụng

```bash
# Khởi chạy bot
node index.js

# Kết nối với server local
MinecraftBot> connect localhost

# Gửi tin nhắn
MinecraftBot> chat Hello everyone!

# Di chuyển bot
MinecraftBot> move forward 10

# Tạo nhiều bot
MinecraftBot> create 5
MinecraftBot> connectall play.example.com

# Kiểm tra trạng thái
MinecraftBot> list
MinecraftBot> status
```

## Log và Debug

Bot tự động ghi log vào thư mục `logs/`:
- `bot.log`: Log chính
- `error.log`: Log lỗi
- `exceptions.log`: Log ngoại lệ

Để bật debug mode, đặt biến môi trường:
```bash
DEBUG=true node index.js
```

## Hỗ trợ

Nếu gặp vấn đề khi sử dụng bot:
1. Kiểm tra log trong thư mục `logs/`
2. Thử kết nối với server khác
3. Đảm bảo phiên bản Minecraft phù hợp
4. Kiểm tra cấu hình mạng và firewall