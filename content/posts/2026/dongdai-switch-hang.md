---
title: "切换程序卡死与延时出板"
description: "1.[ATAOI2019-34325](https://jira.cvte.com/browse/ATAOI2019-34325)主软件检测时切…"
date: 2024-11-06 12:00:00
updated: 2026-10-10 16:40:00
categories: [笔记]
tags: ["排障", "数据库"]
type: tech
---
# 苏州东岱切换程序卡死，延时出板问题

## 现象及确定问题点

**1.[ATAOI_2019-34325](https://jira.cvte.com/browse/ATAOI_2019-34325)主软件检测时切换程序卡死，出现概率为50%**

`数据库查询时间过长`

现象：检测软件切换板式时 偶尔会卡死 但是未闪退 过一段时间恢复正常

在gdb调试以及databaserpc日志中看到调用QueryCompCount偶发耗时4s

具体rpcservice 代码

传递的时间戳如果在不清除的情况下查询数据量过多，导致查询时间慢（临时方案点击检测软件统计界面的清除，会在板式文件夹下生成一个文件更新时间戳）

清除后未出现卡死情况

**2.[ATAOI_2019-34279](https://jira.cvte.com/browse/ATAOI_2019-34279)设置为在机器外复判，板子检测出完结果还会延迟3-4s才出板，此现象为偶发**

`数据库查询时间过长 `

```sql
select board_result, count(1) from tb_board where project_id = 264 and timestamp >= 1730680695 and board_side = 0 group by board_result;

select sum(pass_cnt), sum(ng_cnt), sum(false_cnt) from tb_board where project_id = 264 and timestamp >= 1730680695 and board_side = 0;
```

这两条语句查询时耗时过长，正常情况下一秒以内，但是现场的慢日志分析最长耗时为6秒，平均4.8秒，600w的数据量，每次查询在有索引的情况下仍查询了200w行数据。

**综上所述，确定问题点为数据库查询时间过长导致。**

## 分析问题原因

首先通过现场的慢日志确定查询慢的sql语句，

alter table tb_board add index idx_project_timestamp_side(project_id,timestamp,board_side);
