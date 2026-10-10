---
title: "在 Ubuntu 上附加调试正在运行的进程"
description: "先用进程号附加，不要为了调试把程序停掉重开，否则现场会丢。"
date: 2025-06-01 12:00:00
updated: "2026-10-10 17:40:00"
categories: [笔记]
tags: ["GDB", "调试", "Linux"]
type: tech
---
# 在 Ubuntu 上附加调试正在运行的进程

## 方法：使用`attach`附加到运行进程

### 步骤1：查找进程ID

```Bash
ps aux | grep 应用名
```

> 示例输出：

```
 ubuntu   12345  0.5  2.1 102400 21400 ?  Sl   14:30   0:10 /usr/local/bin/order_service
```

> 记录PID（示例中为`12345`）

### 步骤2：启动GDB附加

```bash
sudo gdb -p 进程ID
```

> 示例：`sudo gdb -p 12345`

### 步骤3：暂停程序

```Bash
(gdb) continue
```

（程序会继续运行）

### 步骤4：复现问题

1. 当问题发生时：
   - 崩溃：自动暂停
   - 卡死：按`Ctrl+C`

### 步骤5：收集信息

```
Bash(gdb) thread apply all bt full
(gdb) info registers
(gdb) detach  # 解除附加
(gdb) quit

```

## ⚠️ 重要注意事项

1. **attach模式**：
   - 附加时目标进程会**暂停**
   - 输入`continue`后恢复运行
   - 必须先`detach`才能安全退出GDB
2. **权限问题：**

```Bash
   # 如遇权限拒绝
   sudo gdb -p 进程ID
```

1. 核心转储：

```Bash
   # 崩溃后保存核心转储
   (gdb) generate-core-file
```

## 🆘 应急处理

当使用`attach`出现异常时：

1. 先尝试恢复服务：

```Bash
   (gdb) detach
   (gdb) quit
```

1. 如果无法恢复：

```Bash
   # 在另一个终端终止进程
   kill -9 进程ID
```

## 📎 示例流程（attach）

```Bash
user@ubuntu1804:~$ ps aux | grep payment
ubuntu   23456  3.2  1.8 107432 18920 ?  Sl   15:20   5:10 /opt/payment/payment_service
user@ubuntu1804:~$ gdb -p 23456
(gdb) continue
### 复现卡死问题后按Ctrl+C ###
Thread 1 "payment_service" received signal SIGINT, Interrupt.
(gdb) thread apply all bt
#0  0x00007fe9ddfe3b45 in epoll_wait () from /lib/x86_64-linux-gnu/libc.so.6
#1  0x000055f5e2ac7f10 in NetworkManager::poll() ()
...
(gdb) detach
(gdb) quit
user@ubuntu1804:~$
```

## 知识总结

- 先用进程号附加，不要为了调试把程序停掉重开，否则现场会丢。
- 附加之后程序会停住，继续运行后再去复现卡死。
- 复现后回到调试器打断，收集线程和调用栈。
- 调试结束要 detach，避免进程一直被调试器占着。
