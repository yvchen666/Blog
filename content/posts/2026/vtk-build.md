---
title: "VTK库编译相关"
description: "在编译主软件时报错 -libvtk.so找不到 原因出现在3dglwidget.pri这个配置文件中 在/usr/local/lib中找不到so…"
date: 2024-07-23 12:00:00
updated: 2026-10-10 16:40:00
categories: [笔记]
tags: ["VTK", "编译"]
type: tech
---
# VTK库编译相关

## 情况

在编译主软件时报错 -libvtk*.so找不到

原因出现在3dglwidget.pri这个配置文件中

在/usr/local/lib中找不到so文件

## 解决

进入目录中发现确实没有相关版本的文件，所以下载vtk库文件编译

```bash
#安装必要库文件
sudo apt-get install libxt-dev
sudo apt-get install build-essential
sudo apt-get install libgl1-mesa-dev
sudo apt-get install libglu1-mesa-dev
sudo apt-get install freeglut3-dev

#下载解压VTK
wget https://github.com/Kitware/VTK/archive/v8.2.0.tar.gz
tar -zxvf v8.2.0.tar.gz

cd VTK-8.2.0/
mkdir build
cd build
#配置编译参数 需要包含报错链接不到的模块
cmake -DVTK_QT_VERSION:STRING=5 DQT_QMAKE_EXECUTABLE:PATH=/opt/Qt5.9.8/5.9.8/gcc_64/bin/qmake -DVTK_Group_MPI:BOOL=ON -DVTK_Group_Qt:BOOL=ON -DCMAKE_PREFIX_PATH:PATH=/opt/Qt5.9.8/5.9.8/gcc_64/lib/cmake/Qt5 ..
#编译
make -j4
sudo make install
sudo ldconfig
```

## 发现存在报错

解决办法：

```bash
sudo rm -rf /usr/local/include/vtk-9.2

sudo rm -rf /usr/local/lib/libvtk*9.2*

sudo dpkg -i installDependence.deb

scp -r aoi@172.18.134.116:/usr/local/include/vtk-8.2 /usr/local/include
```

链接 相关知识
