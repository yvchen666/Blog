---
title: "Inspector 203 编译配置"
description: "因为203与其他不一样 如果之前已经安装过对应软件 则需要重新安装 正确的libcurl.so.4路径"
date: 2024-07-15 12:00:00
updated: 2026-10-10 16:40:00
categories: [笔记]
tags: ["编译"]
type: tech
---
# Inspector 203编译配置

```
https://drive.cvte.com/p/DYSBryMQmfIDGLzlJiAA
```

## 1.安装软件

因为203与其他不一样 如果之前已经安装过对应软件  则需要**重新安装**

完成后重启电脑

## 2.配置虚拟相机

```
https://drive.cvte.com/p/DfoHEn8QvIsEGKjGISAA
```

## 3.拉取203分支代码 并完成配置

```bash
#拉取代码
git clone git clone git@gitlab.gz.cvte.cn:aoi/inspector.git

#查看当前分支
git status

#切换至203分支
git branch -a | grep nonelib
git checkout develop_nonelibtorch_20x

#更新子模块
git submodule update --init --recursive

#查看libRfidSickRH510库的依赖关系
ldd /home/aoi/project/203/inspector/src/libs/qtaoi/qtaoihardware/src/aoihardware/rfidset/sickrfid/lib/libRfidSickRH510.so

#（如果当前的依赖是miniconda）备份且删除libcurl.so.4
sudo mv /usr/local/miniconda3/lib/libcurl.so.4 /usr/local/miniconda3/lib/libcurl.so.4.bak

#查看是否刷新依赖
ldd /home/aoi/project/203/inspector/src/libs/qtaoi/qtaoihardware/src/aoihardware/rfidset/sickrfid/lib/libRfidSickRH510.so

```

正确的libcurl.so.4路径

## 4.编译项目
