---
title: "从内核日志确认 OOM"
description: "进程突然消失且没有业务崩溃栈时，先看内核是不是因为内存把它杀掉了。"
date: 2025-06-01 12:00:00
updated: "2026-10-10 17:40:00"
categories: [笔记]
tags: ["调试", "Linux"]
type: tech
---
# 从内核日志确认 OOM

```bash
dmesg --time-format=iso | grep -i 'oom'
```

显示OOM时的进程号 以及内存情况

## 知识总结

- 进程突然消失且没有业务崩溃栈时，先看内核是不是因为内存把它杀掉了。
- dmesg 里的 oom 记录会给出进程号和当时的内存情况。
- 确认是 OOM 之后，再查是泄漏、缓存无上限，还是单次分配太大。
