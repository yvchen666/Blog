---
title: "OOM 闪退分析方法"
description: "显示OOM时的进程号 以及内存情况"
date: 2025-06-01 12:00:00
updated: 2026-10-10 16:55:00
categories: [笔记]
tags: ["调试", "Linux"]
type: tech
---
# OOM 闪退分析方法

```bash
dmesg --time-format=iso | grep -i 'oom'
```

显示OOM时的进程号 以及内存情况
