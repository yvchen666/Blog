---
title: "IPC-Hermes 接入交接"
description: "JSON Body 关键字段： TYPE | 消息类型（HEARTBEAT / DEVICESTATUSREPROT / RESULTREPRO…"
date: 2025-06-01 12:00:00
updated: 2026-10-10 16:55:00
categories: [笔记]
tags: ["交接", "IPC"]
type: tech
---
# IPC-Hermes 接入项目交接文档

## 一、系统总体架构

```mermaid
graph TB
    subgraph 上游系统
        MES[MES服务器]
        SCADA[SCADA系统]
        Hermes_Up[Hermes上游设备<br/>印刷机/贴片机/回流炉]
    end

    subgraph DeviceStatusService中转服务 devicestatusservice
        TcpSrv[TCP Server<br/>HPSocket]
        HttpSrv[HTTP Server<br/>HPSocket]
        Demux[QAoiTcpService<br/>协议分发器]
        MESClient[MES客户端]
        HermesClient[Hermes客户端]
        HttpClient[HTTP客户端]
        WorkAdmin[CWorkAdmin<br/>线程池 x2]
    end

    subgraph Inspector客户端
        InspectorApp[Inspector主程序]
        MESModule[qtaoimes模块<br/>Port 9090]
        HermesModule[Hermes工作流<br/>QAoiWorkflowWatiHermesCheck]
        WorkflowMgr[工作流管理器]
    end

    Hermes_Up <-->|Hermes XML/TCP| HermesClient
    MES <-->|MES JSON Binary/TCP| MESClient
    SCADA <-->|HTTP/JSON| HttpClient

    TcpSrv <-->|TCP| InspectorApp
    Demux --> TcpSrv
    Demux --> MESClient
    Demux --> HermesClient
    WorkAdmin --> Demux

    InspectorApp --> MESModule
    InspectorApp --> HermesModule
    HermesModule --> WorkflowMgr
```

---

## 二、DeviceStatusService 内部架构

```mermaid
graph TD
    subgraph 网络层
        TS[HandletcpServer<br/>监听下游连接]
        HS[HandleHttpServer]
    end

    subgraph 协议分发层
        QTS[QAoiTcpService<br/>INetLogic实现]
        检测MES头[检测 LC_START]
        检测Hermes头[检测 &lt;Hermes]
    end

    subgraph 协议处理层
        MP[MesData<br/>JSON Binary解析]
        HP[HermesStruct<br/>XML解析/构造]
        SP[HandleInspectorLogic<br/>SCADA上报]
    end

    subgraph 客户端层
        TCC[TcpClientControl<br/>单例]
        MC[MES Client]
        HC[Hermes Client]
    end

    subgraph 配置/持久化
        CFG[DeviceGeneralSetting<br/>~/.aoi/*.ini]
        SQL[QSqlHelper<br/>SQLite查板结果]
        INI[~/.aoi/deviceStatus.ini<br/>MachineReady持久化]
    end

    TS --> QTS
    QTS --> 检测MES头
    QTS --> 检测Hermes头
    检测MES头 --> MP
    检测Hermes头 --> HP
    MP --> TCC
    HP --> TCC
    TCC --> MC
    TCC --> HC
    HS --> SP
    SP --> HttpClient[HTTP Client]
    QTS --> SQL
    CFG --> TCC
    HC --> INI
```

---

## 三、IPC-Hermes 协议流程

```mermaid
sequenceDiagram
    participant Up as Hermes上游设备
    participant DSS as DeviceStatusService
    participant Ins as Inspector客户端

    Note over DSS,Up: 连接建立
    DSS->>Up: ServiceDescription (MachineId, LaneId, Version=1.5)
    Up->>DSS: ServiceDescription (上游机器信息)

    Note over DSS,Ins: 就绪握手
    Ins->>DSS: 发送MachineReady (MES JSON协议)
    DSS->>Up: MachineReady (FailedBoard, FlippedBoard)
    Up->>DSS: BoardAvailable (BoardId, TopBarcode, ProductTypeId, 尺寸等)
    DSS->>Ins: 转发板信息 (MES JSON协议)

    Note over DSS,Up: 传送启动
    DSS->>Up: StartTransport (BoardId)
    Up->>DSS: TransportFinished (TransferState=2, BoardId)

    Note over Ins: 执行检测
    Ins->>Ins: 检测中...
    Ins->>DSS: 检测完成 + 结果 (MES JSON)

    Note over DSS,Up: 出板
    DSS->>Up: BoardAvailable (检测结果板信息)
    Up->>DSS: StartTransport
    DSS->>Up: TransportFinished

    Note over DSS,Up: 心跳
    DSS->>Up: CheckAlive
    Up->>DSS: CheckAlive
```

---

## 四、Inspector 检测工作流（Hermes相关）

```mermaid
stateDiagram-v2
    [*] --> 等待进板
    等待进板 --> 进板中: BoardAvailable收到
    进板中 --> 检测中: StartTransport完成
    检测中 --> 等待Hermes确认: 检测完成\n(checkProcessByHermes=true)
    检测中 --> 判定结果: 检测完成\n(checkProcessByHermes=false)
    等待Hermes确认 --> 判定结果: eventCheckTopProcess\n/eventCheckBottomProcess触发\n(超时60s)
    等待Hermes确认 --> 流程错误: 超时/Hermes错误\nErrorPrecessErrorByHermes
    判定结果 --> 出板: PASS/NG
    出板 --> 上报MES: 发送结果
    上报MES --> 上报SCADA: HTTP上报
    上报SCADA --> 等待进板: 完成
    流程错误 --> 等待进板: 人工处理
```

---

## 五、设备状态机（DeviceStatus）

```mermaid
stateDiagram-v2
    [*] --> INIT
    INIT --> GETUPSTREAMSERVICEDESCRIPTION: 连接上游
    GETUPSTREAMSERVICEDESCRIPTION --> SENDMACHINEREADY: 收到ServiceDescription
    SENDMACHINEREADY --> GETBOARDAVAILABLE: 发送MachineReady
    GETBOARDAVAILABLE --> SENDSTARTTRANSPORT: 收到BoardAvailable
    SENDSTARTTRANSPORT --> GETTRANSPORTFINISHED: 发送StartTransport
    GETTRANSPORTFINISHED --> SENDSTOPTRANSPORT: 收到TransportFinished
    SENDSTOPTRANSPORT --> SENDBOARDAVAILABLE: 发送StopTransport
    SENDBOARDAVAILABLE --> GETSTARTTRANSPORT: 发送BoardAvailable(结果)
    GETSTARTTRANSPORT --> SENDTRANSPORTFINISHED: 收到StartTransport
    SENDTRANSPORTFINISHED --> STOP: 发送TransportFinished
    STOP --> SENDMACHINEREADY: 循环
```

---

## 六、MES 数据包格式

```
+------------------+------------------+------------------+------------------+-------+
| LC_START (8字节)  | 消息长度 (4字节)  |   JSON Body      |  **** (4字节)    | \r\n  |
|    魔数           |   uint32         |   (变长)          |   结束符         |       |
+------------------+------------------+------------------+------------------+-------+
```

**JSON Body 关键字段：**

| 字段 | 说明 |
|---|---|
| `TYPE` | 消息类型（HEARTBEAT / DEVICESTATUSREPROT / RESULTREPROT 等） |
| `CONTENT` | 消息内容（JSON字符串，支持大包分片） |
| `CONTENTDESCRIBE` | 附加描述 |
| `PACKETTOTALCOUNT` | 分片总数 |
| `PACKETORDER` | 当前分片序号（0起） |

---

## 七、Hermes XML 消息类型

| 消息名 | 方向 | 说明 |
|---|---|---|
| `ServiceDescription` | 双向 | 连接后互报机器ID、Lane、版本 |
| `MachineReady` | DSS→上游 | 设备就绪，可接板 |
| `BoardAvailable` | 上游→DSS / DSS→上游 | 板信息（ID、条码、尺寸、子板） |
| `StartTransport` | 双向 | 启动传送 |
| `TransportFinished` | 双向 | 传送完成（TransferState: 0未开始/1未完成/2完成） |
| `StopTransport` | DSS→上游 | 停止传送 |
| `RevokeBoardAvailable` | 双向 | 撤销BoardAvailable |
| `RevokeMachineReady` | 双向 | 撤销MachineReady |
| `CheckAlive` | 双向 | 心跳 |
| `Notification` | 上游→DSS | 错误/警告通知 |

---

## 八、关键配置文件

| 配置项 | 位置 | 说明 |
|---|---|---|
| 服务端监听 | `~/.aoi/*.ini` | TCP服务端 IP/Port |
| MES地址 | `~/.aoi/*.ini` | MES服务器 IP/Port |
| Hermes地址 | `~/.aoi/*.ini` | Hermes上游设备 IP/Port |
| SCADA地址 | `~/.aoi/*.ini` | SCADA HTTP地址 |
| machineId/laneId | `~/.aoi/*.ini` | Hermes ServiceDescription中使用 |
| Hermes版本 | `~/.aoi/*.ini` | 当前 **1.5** |
| MachineReady持久化 | `~/.aoi/deviceStatus.ini` | 重启后恢复就绪状态 |

---

## 九、关键模块路径速查

| 模块 | 路径 |
|---|---|
| 中转服务源码 | `/home/aoi/DiskD/project/hermes/devicestatusservice/app/` |
| Inspector 客户端 | `/home/aoi/DiskD/project/inspector/code_view/inspector/` |
| Hermes XML结构定义 | `app/LogicTcp/hermesstruct.h` |
| MES包序列化/反序列化 | `app/LogicTcp/mesdata.*` |
| 协议分发核心（粘包处理） | `app/qaoitcpservice.cpp` |
| 设备状态机 | `app/tcp/handletcpserver.h` |
| Hermes客户端控制 | `app/tcp/tcpclientcontrol.*` |
| Hermes工作流（等待确认） | `src/libs/qtaoi/qtaoicontrol/src/aoicontrol/workflows/qaoiworkflowwatihermescheck.*` |
| 检测完成工作流管理器 | `src/libs/qtaoi/qtaoicontrol/src/aoicontrol/workflowmanagers/qaoiworkflowmanagerinspectionfinish.cpp` |
| MES控制器（Port 9090） | `src/libs/qtaoi/qtaoimes/src/aoimes/qaoimescontroller.*` |
| MES发送基类 | `src/libs/qtaoi/qtaoimes/src/aoimes/sendmes/qaoisendmes.h` |

---

## 十、已知问题与修复记录

| 提交 | 类型 | 说明 |
|---|---|---|
| `f1e8e86` | feature | 添加撤销到板命令（RevokeBoardAvailable） |
| `5c4337a` | bugfix | 修改日志输出，解决服务端发送粘包问题 |
| `e5b6208` | bugfix | 添加对 Notification 消息的解析及错误处理 |
| `88e0d3f` | bugfix | 修复因暂停检测软件导致的流程错误（不进板） |
| `b682f30` | bugfix | 修复粘包导致Hermes数据解析失败；持久化MachineReady；修复BoardAvailable解析错误 |
| `f444473` | feature | Hermes 1.5 版本支持 |
| `11d7d41e` | feature | Hermes换板型：ProjectID全匹配改为"前缀匹配" |
| `1bc02b04` | bugfix | 延长Hermes断连后重连等待时间 |
| `289f96ab` | bugfix | 修复换板型停止时机错误；修复双发StartTransport问题 |
