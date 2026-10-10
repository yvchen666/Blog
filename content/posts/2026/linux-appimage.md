---
title: "Linux AppImage 安装"
description: "在Appimage所在目录打开终端 得到squashfs-root目录 其中xxx为自定义的文件夹名 新建一个desktop文件 命名为xxxx…"
date: 2025-06-01 12:00:00
updated: 2026-10-10 16:40:00
categories: [笔记]
tags: ["Linux"]
type: tech
---
# Linux AppImage安装
## 解压安装包
在Appimage所在目录打开终端
```bash
./xxxxx.AppImage --appimage-extract
```
得到squashfs-root目录

## 移动目录
```bash
sudo mv squashfs-root /opt/xxx
```
其中xxx为自定义的文件夹名

## 编辑一个desktop文件
新建一个desktop文件 命名为xxxx.desktop
```bash
gedit xxxx.desktop
```

内容为：
> [Desktop Entry]
> Type=Application
> Version=2.3                                   #替换版本号
> Name=VNote                                    #替换应用名
> Icon=                                         #替换图标（可以去移动到的目录中找/opt/xxx）
> Exec=                                         #替换可执行文件的路径（/opt/xxx/AppRun）
> Categories=Utility;
> Terminal=False
## 移动文件
设置好后保存退出，给文件加权限并移动
```bash
sudo chmod +x xxxx.desktop
mv xxxx.desktop /usr/share/applications/
```

最后完成AppImage应用到桌面快捷应用的安装
