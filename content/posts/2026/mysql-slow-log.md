---
title: "MySQL 慢日志配置"
description: "东岱机器A在切换板式时卡死但是无闪退，卡死时通过gdb调试查看调用堆栈发现在调用databaserpc时耗时过长，通过databserpc日志看…"
date: 2024-11-07 12:00:00
updated: 2026-10-10 16:55:00
categories: [笔记]
tags: ["数据库", "MySQL"]
type: tech
---
# MYSQL慢日志配置

## 背景

东岱机器A在切换板式时**卡死但是无闪退**，卡死时通过gdb调试查看调用堆栈发现在**调用databaserpc时耗时过长**，通过databserpc日志看到调用QueryCompCount偶发耗时4s

机器B出板偶发出现慢3~4s，查看日志排除写入数据库慢的情况，且出板慢的代码部分没有操作耗时日志打印。

为了进一步分析

1. 究竟是执行哪条语句耗时过长
2. 耗时过长的语句时间总和是否符合出板慢现象
3. 切换板式卡死时间是否是在执行QueryCompCount

为了确切的验证上述原因是由sql导致的，故**采用MYSQL提供的慢查询日志**。

## 1、开启慢查询配置

在  `/etc/mysql/mysql.conf.d`  目录下的 `mysqld.cnf` 文件中 找到慢查询配置并复制一份

![image-20241107195440282](/images/notes/assets/%E6%95%B0%E6%8D%AE%E5%BA%93%E6%85%A2%E6%97%A5%E5%BF%97%E9%85%8D%E7%BD%AE/image-20241107195440282.png)

### 记录两个坑：

#### 1.配置了注释的三个慢查询配置，但是在指定目录下生成的文件内容如下：

![image-20241107195644248](/images/notes/assets/%E6%95%B0%E6%8D%AE%E5%BA%93%E6%85%A2%E6%97%A5%E5%BF%97%E9%85%8D%E7%BD%AE/image-20241107195644248.png)

是因为配置了这三个还不够 需要加上

**`log_output`** 表示慢日志输出的方式  （可选项为  FILE TABLE  都选用,隔开）

#### 2.配置到自定义目录，发现无法在指定的目录生成日志文件，查看MYSQL日志如下：

![image-20241107200123289](/images/notes/assets/%E6%95%B0%E6%8D%AE%E5%BA%93%E6%85%A2%E6%97%A5%E5%BF%97%E9%85%8D%E7%BD%AE/image-20241107200123289.png)

没有权限，方便起见使用默认目录即可

## 2、造数据库插入数据模拟慢查询

创建hyc数据库，往test表中插入10w条随机数据

```python
import pymysql
import random
import string

config = {
    'host': '127.0.0.1',
    'port': 3306,
    'user': 'root',
    'password': 'aoi2014',
    'charset': 'utf8mb4',
    'cursorclass': pymysql.cursors.DictCursor
}

connection = pymysql.connect(**config)

try:
    with connection.cursor() as cursor:

        cursor.execute("CREATE DATABASE IF NOT EXISTS hyc")
        cursor.execute("USE hyc")

        create_table_sql = """
        CREATE TABLE IF NOT EXISTS test (
            id INT AUTO_INCREMENT PRIMARY KEY,
            field1 VARCHAR(255),
            field2 VARCHAR(255),
            field3 VARCHAR(255),
            field4 VARCHAR(255),
            field5 VARCHAR(255),
            field6 VARCHAR(255),
            field7 VARCHAR(255),
            field8 VARCHAR(255),
            field9 VARCHAR(255),
            field10 VARCHAR(255)
        )
        """
        cursor.execute(create_table_sql)

        insert_sql = """
        INSERT INTO test (field1, field2, field3, field4, field5, field6, field7, field8, field9, field10)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """

        for i in range(100000):
            data = [''.join(random.choices(string.ascii_letters + string.digits, k=10)) for _ in range(10)]
            cursor.execute(insert_sql, data)

        connection.commit()

finally:
    connection.close()
```

创建一个辅助表 `auxiliary`，并插入一些数据

```sql
CREATE TABLE auxiliary (
    id INT AUTO_INCREMENT PRIMARY KEY,
    value1 VARCHAR(255),
    value2 VARCHAR(255)
);

-- 插入 1000 条随机数据
INSERT INTO auxiliary (value1, value2)
SELECT
    SUBSTRING(MD5(RAND()) FROM 1 FOR 10) AS value1,
    SUBSTRING(MD5(RAND()) FROM 1 FOR 10) AS value2
FROM
    (SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5) t,
    (SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5) t2,
    (SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5) t3
LIMIT 1000;
```

使用复杂的SQL语句查询

```sql
SELECT
    t.id,
    t.field1,
    t.field2,
    t.field3,
    t.field4,
    t.field5,
    t.field6,
    t.field7,
    t.field8,
    t.field9,
    t.field10,
    a.value1,
    a.value2,
    COUNT(s.sub_id) AS sub_count,
    AVG(s.sub_value) AS sub_avg
FROM
    test t
JOIN
    auxiliary a ON t.field1 = a.value1
LEFT JOIN
    (SELECT
        id AS sub_id,
        field1 AS sub_value
     FROM
        test
     WHERE
        field2 LIKE 'a%' AND field3 LIKE 'b%') s ON t.id = s.sub_id
GROUP BY
    t.id, t.field1, t.field2, t.field3, t.field4, t.field5, t.field6, t.field7, t.field8, t.field9, t.field10, a.value1, a.value2
ORDER BY
    t.id DESC
LIMIT 1000;
```

结果如下：

![image-20241107200929309](/images/notes/assets/%E6%95%B0%E6%8D%AE%E5%BA%93%E6%85%A2%E6%97%A5%E5%BF%97%E9%85%8D%E7%BD%AE/image-20241107200929309.png)

## 3、查看日志记录结果

<img src="/home/aoi/文档/note/assets/数据库慢日志配置/image-20241107200943481.png" alt="image-20241107200943481" style="zoom:200%;" />

```
# Time: 2024-11-07T10:07:18.802512Z
# User@Host: root[root] @ localhost []  Id:   162
# Query_time: 2.518777  Lock_time: 0.000245 Rows_sent: 0  Rows_examined: 305756
use hyc;
SET timestamp=1730974038;
SELECT      t.id,     t.field1,     t.field2,     t.field3,     t.field4,     t.field5,     t.field6,     t.field7,     t.field8,     t.field9,     t.field10,     a.value1,     a.value2,     COUNT(s.sub_id) AS sub_count,     AVG(s.sub_value) AS sub_avg FROM      test t JOIN      auxiliary a ON t.field1 = a.value1 LEFT JOIN      (SELECT          id AS sub_id,         field1 AS sub_value      FROM          test      WHERE          field2 LIKE 'a%' AND field3 LIKE 'b%') s ON t.id = s.sub_id GROUP BY      t.id, t.field1, t.field2, t.field3, t.field4, t.field5, t.field6, t.field7, t.field8, t.field9, t.field10, a.value1, a.value2 ORDER BY      t.id DESC LIMIT 1000;
```

## 4、使用日志分析工具

`sudo mysqldumpslow mysql-slow.log`

```
Reading mysql slow query log from mysql-slow.log
Count: 1  Time=2.52s (2s)  Lock=0.00s (0s)  Rows=0.0 (0), root[root]@localhost
  SELECT      t.id,     t.field1,     t.field2,     t.field3,     t.field4,     t.field5,     t.field6,     t.field7,     t.field8,     t.field9,     t.field10,     a.value1,     a.value2,     COUNT(s.sub_id) AS sub_count,     AVG(s.sub_value) AS sub_avg FROM      test t JOIN      auxiliary a ON t.field1 = a.value1 LEFT JOIN      (SELECT          id AS sub_id,         field1 AS sub_value      FROM          test      WHERE          field2 LIKE 'S' AND field3 LIKE 'S') s ON t.id = s.sub_id GROUP BY      t.id, t.field1, t.field2, t.field3, t.field4, t.field5, t.field6, t.field7, t.field8, t.field9, t.field10, a.value1, a.value2 ORDER BY      t.id DESC LIMIT N

```

- **Time**: 记录了查询执行的时间。

- **User@Host**: 记录了执行查询的用户和主机信息。

- **Id**: 连接的唯一标识符

- **Query_time**: 查询执行的时间，单位是秒。
- **Lock_time**: 查询等待锁的时间，单位是秒。
- **Rows_sent**: 返回给客户端的行数。
- **Rows_examined**: 查询过程中检查的行数。
