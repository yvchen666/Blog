---
title: "203 aoidbinterface 问题梳理"
description: "在将203主软件适配新数据库时 develop项目可以编译通过，203项目的aoidbinterface模块拉取的是 develop项目对应的分…"
date: 2025-06-01 12:00:00
updated: 2026-10-10 16:55:00
categories: [笔记]
tags: ["排障", "数据库"]
type: tech
---
# 203 aoidbinterface问题梳理

## 情况描述

在将203主软件适配新数据库时   develop项目可以编译通过，203项目的aoidbinterface模块拉取的是 develop项目对应的分支

切换aoideinterface为f1a4e855时，构建后报错

![default](/images/notes/assets/203%20aoidbinterface%E9%97%AE%E9%A2%98%E6%A2%B3%E7%90%86/default.jpeg)

## 首先自己分析了报错可能的原因

检查了相应的库和配置文件

对应的库为quazip 将其更新，并且重新编译仍有错误产生。

## 提出思路

有可能是qtcreator的bug rebuild的时候并不是完全干净的rebuild

处理办法：完全删除debug目录，重新构建项目

但是仍然不起作用。

## 向小伙伴们寻求帮助

将报错信息发在大群中，志明哥来帮忙，对照develop分支的pri文件，查看是否将QuaZip库包含

重新手动添加库，更改pri配置并重新编译

仍然报错

## 自己重新梳理思路

对照可以编译的dev分支，先找到报错所在的代码位置

**PS：**由于是链接的位置，所以直接点报错的话，跳转的是对应的**.so**文件，并不能直接到代码。

搜索报错提示的函数 同时将203项目与develop项目比对

跳转多次后发现在函数实现跳转头文件时，两个项目相同的代码跳转的头文件并相同，于是初步确定了报错的原因，尝试修改代码去解决问题，但是发现耦合性很高，不能通过修改代码去解决问题。

修改配置文件，将链接指向正确的aoicore位置，后编译链接通过，解决了问题。
