---
title: "统计信息长期方案"
description: "#### 修改tbboard表的索引： 删除无效索引，改用聚合索引 #### 新创建统计表： 2. 新的数据统计进表 是否往旧统计表插入数据？"
date: 2025-06-01 12:00:00
updated: 2026-10-10 16:55:00
categories: [笔记]
tags: ["数据库"]
type: tech
---
# 统计信息长期方案

## 长期方案

- #### 修改tb_board表的索引：

  删除无效索引，改用聚合索引

- #### 新创建统计表：

  1. 创建统计表
  2. 新的数据统计进表    是否往旧统计表插入数据？
  3. 从新表查询统计信息
  4. 提供数据清洗功能，用户可在闲时自行主动迁移数据

## 影响范围

- #### 软件首次启动

  如果不存在统计表，则创建  （DatabaseManager构造函数 ）

  如果tb_board存在无效索引则删除（速度很快，耗时可忽略不计）

  如果tb_board不存在联合索引则创建 （耗时，与数据量大小有关，需要评估）

- #### 数据统计相关

  拼板统计

  整板统计

- #### 打开板式

## 实施步骤

- [x] #### 评估索引增、删的影响，预估会增加的时长

- [x] #### 确定新表 需要哪些字段 对应字段的数据类型 是否需要索引 需要什么索引

- [x] #### 确定新表的语句 添加的时机

- [x] #### 评估新表

- [ ] #### 整理统计相关查询、写入、删除操作，输出文档

- [ ] #### 确定查询时段不为零点时的查询方案

- [ ] #### 评估改动范围 以及合理性，预估上述流程工作量

- [ ] #### 实施上述方案，开始编码

## 详细信息

在runnerPlugin 对于tb_board   先删除 lane、project_id   后创建聚合索引（project_id,board_sizd,timestamp）

确定新统计表的 字段有哪些 需不需要建立索引 表名

在DatabaseManager 构造函数创建新统计表

查看写入旧统计表的代码 （是替换还是保留写入两个表）

查看需要查询哪些信息 确定新表的查询语句

确定查询时段不是整段时间 如何查询

确定改动的范围

新统计表相比旧统计表**多出**的字段：**board_id、order_id** 由此确立建表语句

```sql
CREATE TABLE IF NOT EXISTS `tb_new_statistic_everyday` (\
                              `date` int(11) NOT NULL DEFAULT '0' COMMENT 'timestamp',\
                              `project_id` int(11) unsigned NOT NULL DEFAULT '0' COMMENT 'project_id',\
                              `whole_board_cnt` int(11) NOT NULL DEFAULT '0',\
                              `whole_board_pass` int(11) NOT NULL DEFAULT '0',\
                              `whole_board_ng` int(11) NOT NULL DEFAULT '0',\
                              `whole_board_false` int(11) NOT NULL DEFAULT '0',\
                              `board_side` int(11) NOT NULL DEFAULT '0',\
                              `order_id` int(11) NOT NULL DEFAULT '0',\
                              `board_cnt` int(11) NOT NULL DEFAULT '0',\
                              `board_pass` int(11) NOT NULL DEFAULT '0',\
                              `board_ng` int(11) NOT NULL DEFAULT '0',\
                              `board_false` int(11) NOT NULL DEFAULT '0',\
                              `total` int(11) NOT NULL DEFAULT '0' COMMENT 'total',\
                              `pass_cnt` int(11) NOT NULL DEFAULT '0' COMMENT 'pass_cnt',\
                              `ng_cnt` int(11) NOT NULL DEFAULT '0' COMMENT 'ng_cnt',\
                              `false_cnt` int(11) NOT NULL DEFAULT '0' COMMENT 'false_cnt',\
                              PRIMARY KEY (`date`,`project_id`) USING BTREE\
                              ) ENGINE=InnoDB DEFAULT CHARSET=utf8 COMMENT='new statistic table(date)';
```

增加新接口

新建统计表   createNewStatisticEveryDayTable

新的查询语句 QueryNewBoardCount QueryNewCompCount QueryFullBoardStatistic（已cp提交）

检测完成时：WriteInspectorInfos 添加写入新统计表的代码

更新统计表中数据： UpdateWholeBoardCntByWholeBoardUuid

统计表中数据如何迁移

※ 前提：查询条件一致

| Field(tb_new_statistic) | Field(tb_board)  |               Commit                |
| :---------------------: | :--------------: | :---------------------------------: |
|        timestamp        |       date       |                  ※                  |
|       project_id        |    project_id    |                  ※                  |
|     whole_board_cnt     | sum(report_uuid) | 有多少个相同的report_uuid就有多少个 |
|    whole_board_pass     |                  |                                     |
|     whole_board_ng      |                  |                                     |
|    whole_board_false    |                  |                                     |
|       board_side        |    board_side    |                  ※                  |
|        order_id         |     order_id     |                  ※                  |
|        board_cnt        |                  |                                     |
|       board_pass        |                  |                                     |
|        board_ng         |                  |                                     |
|       board_false       |                  |                                     |
|          total          |                  |                                     |
|        pass_cnt         |                  |                                     |
|         ng_cnt          |                  |                                     |
|        false_cnt        |                  |                                     |
