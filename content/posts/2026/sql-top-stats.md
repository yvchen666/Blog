---
title: "统计查询性能优化"
description: "tbboard 表约 1000 万行。 tbcomponentpadYYYYMMindex 分表合计约 50 万行。 Top 查询接口（位号、误…"
date: 2025-06-01 12:00:00
updated: 2026-10-10 16:55:00
categories: [笔记]
tags: ["数据库", "性能"]
type: tech
---
# Top统计查询性能优化

## 现状

- 数据规模
  - tb_board 表约 1000 万行。
  - tb_component_pad_YYYYMM_index 分表合计约 50 万行。
- 现有调用链
  - Top 查询接口（位号、误判、NG 类型）均调用 queryStatisticCompMapByTime 获取两个映射：
    - mapDesignator：按 designator 的 pass/false/ng 计数。
    - mapType：按 machine_result 的 NG 计数。
  - queryStatisticCompMapByTime 的流程：
    1. 通过 QueryBoardInfoByProjectIdsOrders 在 tb_board 按 project_id, order, timestamp 拉取所有匹配的板列表。
    2. 根据板的 timestamp 和分片规则（querySplitRecordInfos）将板分配到各个 tb_component_pad_YYYYMM_index 表，生成每张分表对应的一个巨大的 board_id 列表。
    3. 对每个分表执行一条 SQL：select designator, machine_result, review_result from 分表 where board_id in (…)，把所有明细行拉回客户端，逐行统计计数。
    4. 在客户端对结果排序，返回 Top。

## 存在的问题

- 采用“IN 大列表 + 明细行客户端统计”的方式，导致性能瓶颈：
  - 巨大的 IN 列表
    - SQL 文本极长，解析和优化开销大。
    - 优化器难以选择高效的执行路径；每个 board_id 都触发大量随机索引查找，I/O 和 CPU 成本累积。
  - 明细行全量拉取到客户端
    - 数据传输量极大（2000 万级别），客户端逐行处理耗时长。
    - 数据库无法在服务器端进行聚合优化，只能返回原始明细。
  - 多分表串行扫描
    - 时间范围跨越多个月时，需要对多个分表分别执行上述昂贵查询，放大上述问题。
- 索引与查询谓词不匹配
  - tb_board 现有复合索引为 (timestamp, project_id, order, board_result)。
    - 你的查询条件是 project_id=const、order=const、timestamp BETWEEN。将范围列 timestamp 放在索引最前面，导致在大时间段上进行宽范围扫描，再用 project_id 和 order 过滤，选择性差。
  - tb_component_pad 分表只有单列索引 board_id。
    - 无法覆盖“按 designator 聚合”的访问路径，导致频繁回表和扫描更多数据页。
- 计算没下推到数据库
  - 分类计数（pass/false/ng）、按 designator 或 machine_result 聚合、排序、Top N 都在应用层完成。
  - 数据库端没有利用 GROUP BY/CASE WHEN、JOIN 的能力。
- 代码层细节
  - 构造 SQL 使用字符串拼接，未使用 prepared statement，解析开销更大。
  - 没有使用 forwardOnly，客户端游标内存占用更高。
  - Top 接口的 limit 参数没有真正生效（原代码只排序未截断）。

## 解决的方案

- 用 JOIN 替代 IN 列表，计算下推到数据库端
  - 在 queryStatisticCompMapByTime 中，针对每个涉及的分表，直接：
    - JOIN tb_board 进行 project_id、order、timestamp 过滤。
    - 使用 GROUP BY + CASE WHEN 在数据库端聚合出 pass、false、ng。
    - 分别生成位号统计和 NG 类型统计的聚合结果，回传少量聚合行。
  - Top 接口继续保持入参与返回值不变，只在内部对结果排序并按照 limit 截断。
- 索引优化（一次性变更，提升执行计划质量）
  - tb_board 增加匹配该类查询的复合索引：
    - CREATE INDEX idx_board_proj_order_ts_id ON tb_board (project_id, `order`, timestamp, board_id);
    - 使等值列在前，范围列在后，并包含 join 列（board_id）。
  - tb_component_pad 各分表增加覆盖索引：
    - CREATE INDEX idx_cp_board_designator_res ON tb_component_pad_YYYYMM_index (board_id, designator, machine_result, review_result);
    - 便于按 board_id 连接后直接进行分组与 CASE 计算，减少回表。
- 分表选择优化
  - 不再先扫描 tb_board 获取所有板列表。
  - 根据分片规则（querySplitRecordInfos）选择时间区间与查询区间相交的分表，直接在这些分表上做 JOIN + 聚合，减少一次大扫描。
- 查询细节优化
  - 使用 prepared statement 与绑定参数，降低 SQL 解析/优化开销。
  - 设置 QSqlQuery::setForwardOnly(true)，降低客户端内存与游标开销。
  - 返回前在 C++ 层按 count 排序并截断到 limit，避免不必要的内存占用与后续处理。

## 方案的原理

- JOIN 替代 IN 列表：让优化器能选择索引驱动连接
  - IN (大量 board_id) 会退化为海量随机索引查找，难以形成高效的访问路径。
  - 使用 JOIN 后，优化器可以基于 tb_board 的新索引 (project_id, order, timestamp, board_id) 做“等值在前、范围在后”的索引范围扫描，随后以 board_id 连接到分表。
  - 这将巨量的离散查找转化为顺序/范围扫描与索引连接，显著降低 I/O。
- 聚合下推到数据库端：降低数据传输与计算量
  - 在数据库侧用 GROUP BY + CASE WHEN 直接计算 pass/false/ng：
    - 返回的行数从“所有匹配的 component 明细行”降为“distinct designator 或 distinct machine_result 的汇总行”，基数通常低几个数量级。
    - 极大减少网络传输与客户端逐行处理。
- 索引覆盖：减少回表与随机 I/O
  - tb_component_pad 的 (board_id, designator, machine_result, review_result) 复合索引，使得连接后可以直接在索引上进行分组与 CASE 统计（覆盖索引）。
  - 覆盖索引避免大量回表读取数据页，提高缓存命中率与执行效率。
- 等值谓词在前、范围谓词在后：优化访问路径的选择性
  - 新索引把 project_id、order 放在最前，可快速定位到很小的记录集；再在其后应用 timestamp 的范围条件，缩小扫描范围。
  - 对于 1000 万行的 tb_board，这种索引布局能显著减少需要扫描的行数。
- 分表选择基于区间相交：减少不必要的表访问
  - 只对与查询时间范围相交的分表执行查询，避免跨越大量不相关分表的扫描与连接。
- prepared + forwardOnly：降低解析与内存开销
  - prepared statement 让 SQL 只解析/优化一次，重复使用不同参数。
  - forwardOnly 简化客户端游标行为，减少内存压力和复制开销。
- 复杂度对比（定性）
  - 旧方案：O(匹配的 component 明细总行数) 的数据传输与客户端循环 + IN 列表解析与大量离散查找。
  - 新方案：O(distinct designator + distinct machine_result) 的汇总行传输 + 服务器端索引驱动的连接与聚合。
  - 在典型生产数据中，位号和类型的基数远小于明细行数，整体延时从分钟级提升到秒级更有可行性。

总结：
- 旧代码慢的根源是“巨大 IN 列表、明细行回传客户端统计、索引不匹配以及多分表串行扫描”。
- 新代码通过“JOIN + 聚合下推 + 覆盖索引 + 分表区间裁剪 + prepared/forwardOnly”系统性优化访问路径与数据规模，显著减少 I/O、CPU 与网络传输，从而让 10 分钟的查询降至秒级。
