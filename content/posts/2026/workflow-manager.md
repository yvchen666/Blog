---
title: "WorkFlowManager"
description: "这是一个基于Qt框架实现的异步工作流管理系统 采用经典的Pimpl模式实现接口与实现的分离 通过工作流队列（workflows）管理多个检测流程…"
date: 2025-06-01 12:00:00
updated: 2026-10-10 16:40:00
categories: [笔记]
tags: ["设计"]
type: tech
---
## 类图

```mermaid
classDiagram
    QAbstractAoiWorkflowManager <|-- QAbstractAoiWorkflowManagerPrivate
    QAbstractAoiWorkflow <|-- QAbstractAoiWorkflowPrivate
    QAbstractAoiWorkflowManager o-- QAbstractAoiWorkflow : contains

    class QAbstractAoiWorkflowManager {
        -d_ptr: QAbstractAoiWorkflowManagerPrivate*
        +type(): QtAoi::WorkflowType
        +currentWorkflow(): QAbstractAoiWorkflow*
        +start()
        +pause()
        +restart()
        +stop()
        +doNextWorkflow()
        #doCurrentWorkflow()
    }

    class QAbstractAoiWorkflowManagerPrivate {
        -workflows: QList<QAbstractAoiWorkflow*>
        -currentIndex: int
        -isBusy: bool
        -isPause: bool
        -mutex: QMutex
        // ...其他成员
    }

    class QAbstractAoiWorkflow {
        +run()
        +cancel()
        +completed(QAoiOperationResult)
        // ...其他接口
    }

```

## 时序图

```mermaid
sequenceDiagram
    participant User
    participant Manager as WorkflowManager
    participant Workflow as CurrentWorkflow

    User->>Manager: start()
    Manager->>Manager: doNextWorkflow()
    Manager->>Manager: doCurrentWorkflow()
    Manager->>Workflow: connect signals
    Manager->>Workflow: QtConcurrent::run()
    Workflow-->>Manager: completed(result)
    Manager->>Manager: resultCheck()
    alt has next workflow
        Manager->>Manager: doNextWorkflow()
    else all complete
        Manager-->>User: emit completed()
    end

```

- 这是一个基于Qt框架实现的异步工作流管理系统
- 采用经典的Pimpl模式实现接口与实现的分离
- 通过工作流队列（workflows）管理多个检测流程
- 主要特点：
  - 支持顺序执行工作流
  - 支持暂停/恢复/取消操作
  - 具备错误处理机制
  - 支持跨线程操作（使用QMutex保证线程安全）
  - 提供进度反馈机制（processMessage/processTime信号）

## 状态转换图

```mermaid
stateDiagram-v2
    [*] --> Idle
    Idle --> Running: start()
    Running --> Paused: pause()
    Paused --> Running: restart()
    Running --> Error: workflow failed
    Running --> Completed: all workflows done
    Running --> Cancelled: stop()
    Error --> Running: restart()
    Completed --> Idle: reset
    Cancelled --> Idle: reset

```

- 采用观察者模式：通过信号槽机制实现工作流状态通知
- 使用QtConcurrent实现异步执行
- 通过索引(currentIndex)控制流程进度
- 错误处理采用结果检查机制（resultCheck）
- 支持工作流重用（通过isloop标志控制循环执行）
- 提供完整的生命周期管理（start/pause/stop/restart）

## 场景

以下是一个典型的AOI（自动光学检测）应用场景及对应的代码用例，使用这个工作流框架实现PCB板检测流程：

# 场景描述：PCB电路板自动光学检测

1. 流程步骤：
   - 设备初始化 → 传送带定位 → 图像采集 → 视觉分析 → 结果导出 → 复位设备
2. 异常处理需求：
   - 出现硬件故障时自动重试
   - 连续3次失败后停止流程
   - 支持操作员手动暂停/继续

```mermaid
sequenceDiagram
    participant Operator
    participant Manager as 检测管理器
    participant Workflow1 as 初始化工作流
    participant Workflow2 as 图像采集
    participant Workflow3 as 视觉分析

    Operator->>Manager: 启动检测
    Manager->>Workflow1: 执行设备初始化
    Workflow1-->>Manager: 初始化成功
    Manager->>Workflow2: 执行图像采集
    Workflow2-->>Manager: 采集完成
    Manager->>Workflow3: 执行视觉分析
    alt 发现缺陷
        Workflow3-->>Manager: 分析失败(发现缺陷)
        Manager->>Operator: 触发警报
    else 正常
        Workflow3-->>Manager: 分析成功
        Manager->>Operator: 显示通过
    end

```

``` cpp
// 自定义工作流 - 图像采集
class ImageCaptureWorkflow : public QAbstractAoiWorkflow {
    Q_OBJECT
public:
    explicit ImageCaptureWorkflow(QObject* parent = nullptr)
        : QAbstractAoiWorkflow("ImageCapture", parent) {}

protected:
    void run() override {
        setProcessMessage("开始图像采集...");

        // 模拟采集过程
        for(int i=0; i<10; i++){
            if(isCancelRequested()) break;
            QThread::msleep(500);
            setProcessMessage(QString("采集进度 %1/10").arg(i+1));
        }

        // 随机生成测试结果
        bool success = QRandomGenerator::global()->bounded(10) > 2;
        setCompleted(success ?
            QAoiOperationResult::success() :
            QAoiOperationResult::error("CAMERA_TIMEOUT", "相机响应超时"));
    }
};

// 主程序逻辑
int main(int argc, char *argv[]) {
    QApplication app(argc, argv);

    // 创建管理器
    QAbstractAoiWorkflowManager manager;
    manager.setType(QtAoi::WorkflowType::Inspection);

    // 构建检测流程
    manager.append(new DeviceInitWorkflow());    // 设备初始化
    manager.append(new ConveyorPositioning());  // 传送带定位
    manager.append(new ImageCaptureWorkflow()); // 图像采集
    manager.append(new VisualAnalysis());       // 视觉分析
    manager.append(new ReportExportWorkflow()); // 结果导出

    // 连接信号
    QObject::connect(&manager, &QAbstractAoiWorkflowManager::processMessage,
        [](const QString& msg){ qDebug() << "[系统]" << msg; });

    QObject::connect(&manager, &QAbstractAoiWorkflowManager::completed,
        [](const QAoiOperationResult& result){
            qDebug() << (result.isSuccess() ? "检测完成" : "检测终止");
        });

    // 启动流程
    manager.start();

    // 模拟用户操作
    QTimer::singleShot(3000, [&]{ manager.pause(); });  // 3秒后暂停
    QTimer::singleShot(5000, [&]{ manager.restart(); }); // 5秒后继续

    return app.exec();
}

```

```mermaid
graph TD
    A[工作流开始] --> B{执行成功?}
    B -->|是| C[继续下一流程]
    B -->|否| D{可恢复错误?}
    D -->|是| E[重试当前流程]
    D -->|否| F[标记错误状态]
    E --> G{重试次数<3?}
    G -->|是| B
    G -->|否| F
    F --> H[停止所有流程]
    H --> I[发送错误通知]

```
