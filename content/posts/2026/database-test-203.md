---
title: "203 Database 测试问题梳理"
description: "在将203项目的 aoidbinterface和 databaseservicerpc更新到与develop分支的对应模块一致 修改了203项目…"
date: 2024-07-19 12:00:00
updated: 2026-10-10 16:55:00
categories: [笔记]
tags: ["排障", "数据库"]
type: tech
---
# 203 Database测试问题梳理

## 情况描述

在将203项目的 aoidbinterface和 databaseservicerpc更新到与develop分支的对应模块一致

修改了203项目对应的数据库操作代码后 编译通过 正常运行软件

但是 **运行检测软件后 SPC中仍无数据**

## 请教泽旺

请教泽旺 首先找到SPC对应的日志文件路径

```
/home/aoi/.aoi/log/databaserpc
```

删除掉之前的Log 重新运行软件 查看Log

发现报错 SPC执行的SQL语句错误  查不到字段pcb_name

使用数据库GUI查看新版数据库 makerray的对应表字段

![image-20240719145726906](/images/notes/assets/203%20Database%E6%B5%8B%E8%AF%95%E9%97%AE%E9%A2%98%E6%A2%B3%E7%90%86/image-20240719145726906.png)

确实是pcb_name 而报错说找不到pcb_name

## 解决问题

国文哥提出

因为每次的数据库服务都是自启的，所以现在安装的Inspector软件还是203旧版 启用的数据库服务也是旧版 验证：

![image-20240719150109798](/images/notes/assets/203%20Database%E6%B5%8B%E8%AF%95%E9%97%AE%E9%A2%98%E6%A2%B3%E7%90%86/image-20240719150109798.png)

服务的路径为/opt/leichen/inspector  而我们现在的版本是编译出来的debug版本

所以杀掉旧数据库服务，重启新的数据库服务

```bash
kill -9 1470
kill -9 2514
```

![image-20240719150353504](/images/notes/assets/203%20Database%E6%B5%8B%E8%AF%95%E9%97%AE%E9%A2%98%E6%A2%B3%E7%90%86/image-20240719150353504.png)

最后成功显示数据

![image-20240719150526795](/images/notes/assets/203%20Database%E6%B5%8B%E8%AF%95%E9%97%AE%E9%A2%98%E6%A2%B3%E7%90%86/image-20240719150526795.png)
