---
title: "Gerber 代码修改不生效"
description: "在修改usermanager模块相关代码时，修改代码不生效 子模块构建后 so文件存放在目录： gerberEditor/build-gerbe…"
date: 2024-07-31 12:00:00
updated: 2026-10-10 16:55:00
categories: [笔记]
tags: ["排障"]
type: tech
---
# Gerber代码修改不生效问题

在修改usermanager模块相关代码时，修改代码不生效

## 原因

子模块构建后 so文件存放在目录：

gerberEditor/build-gerbereditor-Desktop_Qt_5_9_8_GCC_64bit-Debug/src/libs/qtaoi/qtaoigui/lib

而程序运行的库目录为

gerberEditor/build-gerbereditor-Desktop_Qt_5_9_8_GCC_64bit-Debug/lib

![image-20240731120059718](/images/notes/assets/Gerber%E4%BB%A3%E7%A0%81%E4%BF%AE%E6%94%B9%E4%B8%8D%E7%94%9F%E6%95%88%E9%97%AE%E9%A2%98/image-20240731120059718.png)

## 解决办法

将libQt5AoiGui.so*移动到程序运行库目录

**TODO：**是否能找到编译脚本，修改自动移动
