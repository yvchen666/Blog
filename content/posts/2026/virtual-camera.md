---
title: "虚拟相机配置"
description: "虚拟相机的配置方法是配置Hardware.xml 的 HardwareDeviceType字段 在配置文件中加入 supportSpi.ini…"
date: 2025-06-01 12:00:00
updated: 2026-10-10 16:40:00
categories: [笔记]
tags: ["工具"]
type: tech
---
# 虚拟相机配置

虚拟相机的配置方法是配置Hardware.xml 的

HardwareDeviceType字段

## 普通相机

Virtual

## 3D相机

Virtual3D

## 双轨

Virtual_D

## 203相机

Virtual_201

## 双轨3D

在配置文件中加入 supportSpi.ini

修改/src/aoihardware/qaoihardwarecontrolvirtual.cpp

```cpp
-    if(getDeviceType() == QtAoi::Virtual_D){
-        setLaneType(QtAoi::DualLane);
-    }else {
-        setLaneType(QtAoi::SingleLane);
-    }
+
+    setLaneType(QtAoi::DualLane);
```
