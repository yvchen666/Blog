---
title: "TCP粘包"
description: "1. ### TCP 是字节流 协议本身不保留消息边界，内核为了提升吞吐量： 发送方：Nagle/TSO/GSO 会把多次 write() 合并…"
date: 2025-07-22 12:00:00
updated: 2026-10-10 16:40:00
categories: [笔记]
tags: ["网络", "TCP"]
type: tech
---
# TCP粘包

## 粘包/拆包原理（为什么一定会出现）

1. ### **TCP 是字节流**

   协议本身不保留消息边界，内核为了提升吞吐量：

   - 发送方：Nagle/TSO/GSO 会把多次 `write()` 合并成一个 IP 报文；
   - 接收方：若应用层没有及时 `read()`，内核会把先后到达的数据**连续塞进同一块 socket 缓冲区**。

2. ### **直观现象**

   客户端连续调用两次 `socket.write("hello")` → 服务端一次 `readyRead` 信号里可能读到 `"hellohello"`；
   反之，一次 `write("hello world")` 也可能被拆成两次 `readyRead` 到达。

## 复现问题

```C++
// ProblemClient_linux.cpp
#include <iostream>
#include <string>
#include <cstring> // For strerror
#include <cerrno>  // For errno

// POSIX Socket Headers
#include <sys/socket.h>
#include <netinet/in.h>
#include <arpa/inet.h>
#include <unistd.h>

const char* SERVER_IP = "127.0.0.1";
const int SERVER_PORT = 8888;
const char* DELIMITER = "???";

int main() {
    // 1. 创建 Socket
    int clientSocket = socket(AF_INET, SOCK_STREAM, 0);
    if (clientSocket < 0) {
        std::cerr << "Socket creation failed: " << strerror(errno) << std::endl;
        return 1;
    }

    // 2. 连接到服务器
    sockaddr_in serverAddr;
    memset(&serverAddr, 0, sizeof(serverAddr)); // Clear the struct
    serverAddr.sin_family = AF_INET;
    serverAddr.sin_port = htons(SERVER_PORT);
    if (inet_pton(AF_INET, SERVER_IP, &serverAddr.sin_addr) <= 0) {
        std::cerr << "Invalid address/ Address not supported" << std::endl;
        close(clientSocket);
        return 1;
    }

    if (connect(clientSocket, (struct sockaddr*)&serverAddr, sizeof(serverAddr)) < 0) {
        std::cerr << "Connect failed: " << strerror(errno) << std::endl;
        close(clientSocket);
        return 1;
    }

    std::cout << "Connected to server." << std::endl;

    // 3. 快速连续发送三条消息
    std::string msg1 = "This is the first message.";
    std::string msg2 = "Here comes the second one.";
    std::string msg3 = "And finally, the third.";

    std::string dataToSend1 = msg1 + DELIMITER;
    std::string dataToSend2 = msg2 + DELIMITER;
    std::string dataToSend3 = msg3 + DELIMITER;

    // 由于TCP的Nagle算法，这三条消息很可能会被合并成一个TCP包发送
    send(clientSocket, dataToSend1.c_str(), dataToSend1.length(), 0);
    std::cout << "Sent: " << msg1 << std::endl;

    send(clientSocket, dataToSend2.c_str(), dataToSend2.length(), 0);
    std::cout << "Sent: " << msg2 << std::endl;

    send(clientSocket, dataToSend3.c_str(), dataToSend3.length(), 0);
    std::cout << "Sent: " << msg3 << std::endl;

    // 4. 关闭连接
    close(clientSocket);
    std::cout << "Connection closed." << std::endl;
    return 0;
}
```

```cpp
// ProblemServer_linux.cpp
#include <iostream>
#include <string>
#include <cstring> // For strerror, memset
#include <cerrno>  // For errno

// POSIX Socket Headers
#include <sys/socket.h>
#include <netinet/in.h>
#include <arpa/inet.h>
#include <unistd.h>

const int PORT = 8888;
const int BUFFER_SIZE = 1024;

int main() {
    // 1. 创建监听 Socket
    int listenSocket = socket(AF_INET, SOCK_STREAM, 0);
    if (listenSocket < 0) {
        std::cerr << "Listen socket creation failed: " << strerror(errno) << std::endl;
        return 1;
    }

    // 2. 绑定地址和端口
    sockaddr_in serverAddr;
    memset(&serverAddr, 0, sizeof(serverAddr));
    serverAddr.sin_family = AF_INET;
    serverAddr.sin_addr.s_addr = INADDR_ANY;
    serverAddr.sin_port = htons(PORT);

    if (bind(listenSocket, (struct sockaddr*)&serverAddr, sizeof(serverAddr)) < 0) {
        std::cerr << "Bind failed: " << strerror(errno) << std::endl;
        close(listenSocket);
        return 1;
    }

    // 3. 开始监听
    if (listen(listenSocket, SOMAXCONN) < 0) {
        std::cerr << "Listen failed: " << strerror(errno) << std::endl;
        close(listenSocket);
        return 1;
    }
    std::cout << "Server is listening on port " << PORT << std::endl;

    // 4. 接受客户端连接
    int clientSocket = accept(listenSocket, NULL, NULL);
    if (clientSocket < 0) {
        std::cerr << "Accept failed: " << strerror(errno) << std::endl;
        close(listenSocket);
        return 1;
    }

    std::cout << "Client connected." << std::endl;
    close(listenSocket); // 不再需要监听 socket

    char buffer[BUFFER_SIZE];
    ssize_t bytesReceived;

    // 循环接收数据
    do {
        bytesReceived = recv(clientSocket, buffer, BUFFER_SIZE - 1, 0);
        if (bytesReceived > 0) {
            buffer[bytesReceived] = '\0'; // 确保是C风格字符串
            std::cout << "--- Raw data received (" << bytesReceived << " bytes) ---" << std::endl;
            std::cout << buffer << std::endl;
            std::cout << "--------------------------------------" << std::endl;
        }
    } while (bytesReceived > 0);

    std::cout << "Client disconnected." << std::endl;
    close(clientSocket);
    return 0;
}
```

## 解决问题

### 三、3 种最常用解决方案

| 方案                | 思想                             | 优点           | 缺点                 | Qt 代码要点             |
| :------------------ | :------------------------------- | :------------- | :------------------- | :---------------------- |
| **固定长度**        | 每个报文固定 N 字节，不足补 `\0` | 实现简单       | 浪费带宽             | `socket.readExactly(N)` |
| **分隔符**          | 每条消息以 `\n` 或 `0x7E` 结尾   | 易读           | 内容里不能出现分隔符 | `buffer.indexOf('\n')`  |
| **TLV/Header+Body** | 先收 4 字节长度 L，再收 L 字节   | 最通用、无歧义 | 要多一次解析         | 见下面完整示例          |

```cpp
// SolutionClient_linux.cpp
#include <iostream>
#include <string>
#include <vector>
#include <cstdint> // For uint32_t
#include <cstring> // For strerror
#include <cerrno>  // For errno

// POSIX Socket Headers
#include <sys/socket.h>
#include <netinet/in.h>
#include <arpa/inet.h>
#include <unistd.h>

const char* SERVER_IP = "127.0.0.1";
const int SERVER_PORT = 8889;

// 辅助函数，确保发送所有数据
bool sendAll(int sock, const char* data, int length) {
    int totalSent = 0;
    while (totalSent < length) {
        int sent = send(sock, data + totalSent, length - totalSent, 0);
        if (sent < 0) {
            std::cerr << "Send failed: " << strerror(errno) << std::endl;
            return false;
        }
        totalSent += sent;
    }
    return true;
}

// 封装发送逻辑
bool sendMessage(int sock, const std::string& message) {
    // 1. 获取消息长度
    uint32_t bodyLength = message.length();

    // 2. 将长度转换为网络字节序 (Host to Network Long)
    uint32_t networkBodyLength = htonl(bodyLength);

    // 3. 发送 Header (4字节的长度)
    if (!sendAll(sock, reinterpret_cast<const char*>(&networkBodyLength), sizeof(networkBodyLength))) {
        return false;
    }

    // 4. 发送 Body (实际消息)
    if (!sendAll(sock, message.c_str(), bodyLength)) {
        return false;
    }

    return true;
}

int main() {
    // 1. 创建 Socket (使用 int 作为描述符)
    int clientSocket = socket(AF_INET, SOCK_STREAM, 0);
    if (clientSocket < 0) {
        std::cerr << "Socket creation failed: " << strerror(errno) << std::endl;
        return 1;
    }

    // 2. 连接到服务器
    sockaddr_in serverAddr;
    serverAddr.sin_family = AF_INET;
    serverAddr.sin_port = htons(SERVER_PORT);
    // inet_addr is fine, but inet_pton is more modern and safer
    if (inet_pton(AF_INET, SERVER_IP, &serverAddr.sin_addr) <= 0) {
        std::cerr << "Invalid address/ Address not supported" << std::endl;
        close(clientSocket);
        return 1;
    }

    if (connect(clientSocket, (struct sockaddr*)&serverAddr, sizeof(serverAddr)) < 0) {
        std::cerr << "Connect failed: " << strerror(errno) << std::endl;
        close(clientSocket);
        return 1;
    }
    std::cout << "Connected to server." << std::endl;

    // 3. 快速连续发送三条消息
    if (sendMessage(clientSocket, "This is the first message.")) {
        std::cout << "Sent: This is the first message." << std::endl;
    }
    if (sendMessage(clientSocket, "Here comes the second one.")) {
        std::cout << "Sent: Here comes the second one." << std::endl;
    }
    if (sendMessage(clientSocket, "And finally, the third.")) {
        std::cout << "Sent: And finally, the third." << std::endl;
    }

    // 4. 关闭连接
    close(clientSocket);
    std::cout << "Connection closed." << std::endl;
    return 0;
}
```

```cpp
// SolutionServer_linux.cpp
#include <iostream>
#include <vector>
#include <string>
#include <cstdint> // For uint32_t
#include <cstring> // For memcpy, strerror
#include <cerrno>  // For errno

// POSIX Socket Headers
#include <sys/socket.h>
#include <netinet/in.h>
#include <arpa/inet.h>
#include <unistd.h>

const int PORT = 8889;
const int RECV_BUFFER_SIZE = 4096;

void processMessage(const std::string& msg) {
    std::cout << "[Message Processed] -> " << msg << std::endl;
}

int main() {
    // 1. 创建监听 Socket
    int listenSocket = socket(AF_INET, SOCK_STREAM, 0);
    if (listenSocket < 0) {
        std::cerr << "Listen socket creation failed: " << strerror(errno) << std::endl;
        return 1;
    }

    // 解决 "Address already in use" 错误
    int opt = 1;
    if (setsockopt(listenSocket, SOL_SOCKET, SO_REUSEADDR, &opt, sizeof(opt))) {
        std::cerr << "setsockopt failed: " << strerror(errno) << std::endl;
        close(listenSocket);
        return 1;
    }

    // 2. 绑定地址和端口
    sockaddr_in serverAddr;
    serverAddr.sin_family = AF_INET;
    serverAddr.sin_addr.s_addr = INADDR_ANY;
    serverAddr.sin_port = htons(PORT);

    if (bind(listenSocket, (struct sockaddr*)&serverAddr, sizeof(serverAddr)) < 0) {
        std::cerr << "Bind failed: " << strerror(errno) << std::endl;
        close(listenSocket);
        return 1;
    }

    // 3. 开始监听
    if (listen(listenSocket, SOMAXCONN) < 0) {
        std::cerr << "Listen failed: " << strerror(errno) << std::endl;
        close(listenSocket);
        return 1;
    }
    std::cout << "Server is listening on port " << PORT << std::endl;

    // 4. 接受客户端连接
    int clientSocket = accept(listenSocket, NULL, NULL);
    if (clientSocket < 0) {
        std::cerr << "Accept failed: " << strerror(errno) << std::endl;
        close(listenSocket);
        return 1;
    }
    std::cout << "Client connected." << std::endl;
    close(listenSocket); // 不再需要监听 socket

    // 使用 vector 作为动态缓冲区来处理数据流
    std::vector<char> buffer;
    char recvBuffer[RECV_BUFFER_SIZE];
    ssize_t bytesReceived; // recv on POSIX returns ssize_t

    const int headerSize = sizeof(uint32_t);

    do {
        bytesReceived = recv(clientSocket, recvBuffer, RECV_BUFFER_SIZE, 0);
        if (bytesReceived > 0) {
            // 将新接收的数据追加到缓冲区末尾
            buffer.insert(buffer.end(), recvBuffer, recvBuffer + bytesReceived);

            // 循环处理缓冲区中的完整消息
            while (true) {
                // 1. 检查缓冲区数据是否足够读取一个 Header
                if (buffer.size() < headerSize) {
                    break;
                }

                // 2. 解析 Header 获取 Body 长度
                uint32_t networkBodyLength;
                memcpy(&networkBodyLength, buffer.data(), headerSize);
                uint32_t bodyLength = ntohl(networkBodyLength);

                // 3. 检查缓冲区数据是否足够读取一个完整的消息 (Header + Body)
                if (buffer.size() < headerSize + bodyLength) {
                    break;
                }

                // 4. 提取 Body
                std::string message(buffer.data() + headerSize, bodyLength);

                // 5. 处理完整的消息
                processMessage(message);

                // 6. 从缓冲区中移除已处理的消息
                buffer.erase(buffer.begin(), buffer.begin() + headerSize + bodyLength);
            }
        } else if (bytesReceived == 0) {
            std::cout << "Client gracefully closed connection." << std::endl;
        } else {
            // bytesReceived < 0
            std::cerr << "recv failed: " << strerror(errno) << std::endl;
        }
    } while (bytesReceived > 0);

    std::cout << "Connection closed by server." << std::endl;
    close(clientSocket);
    return 0;
}
```
