---
title: "QObject 的信号与槽"
description: "Q_OBJECT 会让 moc 生成元对象，信号槽才能按名字和参数对上。"
date: 2025-06-01 12:00:00
updated: "2026-10-10 17:40:00"
categories: [笔记]
tags: ["Qt"]
type: tech
---
# QObject 的信号与槽

## **Qt 如何将信号和槽转换为可调用的函数？**

首先是定义Q_OBJECT 宏，宏展开会添加一个静态QMetaObject 定义 获取它的方法*metaObject

qt_metacast （目前不知道用来干嘛）

和元调用qt_metacall

```CPP
#define Q_OBJECT \
public: \
    QT_WARNING_PUSH \
    Q_OBJECT_NO_OVERRIDE_WARNING \
    static const QMetaObject staticMetaObject; \
    virtual const QMetaObject *metaObject() const; \
    virtual void *qt_metacast(const char *); \
    virtual int qt_metacall(QMetaObject::Call, int, void **); \
    QT_TR_FUNCTIONS \
private: \
    Q_OBJECT_NO_ATTRIBUTES_WARNING \
    Q_DECL_HIDDEN_STATIC_METACALL static void qt_static_metacall(QObject *, QMetaObject::Call, int, void **); \
    QT_WARNING_POP \
    struct QPrivateSignal {}; \
    QT_ANNOTATE_CLASS(qt_qobject, "")
```

然后将解析sender和receiver

将元信息拼接成qt_meta_data_xxx[]的int数组（应该相当于一个元信息内存块，存储版本等信息）

然后创建一个QMetaObject，将元信息加入其中

```
const QMetaObject Sender::staticMetaObject = {
    { &QObject::staticMetaObject, qt_meta_stringdata_Sender.data,
      qt_meta_data_Sender,  qt_static_metacall, nullptr, nullptr}
};

```

qt_static_metacall中的两个case不是很懂

```cpp
void Sender::qt_static_metacall(QObject *_o, QMetaObject::Call _c, int _id, void **_a)
{
    if (_c == QMetaObject::InvokeMetaMethod) {
        Sender *_t = static_cast<Sender *>(_o);
        Q_UNUSED(_t)
        switch (_id) {
        case 0: _t->testSignal((*reinterpret_cast< int(*)>(_a[1]))); break;
        default: ;
        }
    } else if (_c == QMetaObject::IndexOfMethod) {
        int *result = reinterpret_cast<int *>(_a[0]);
        {
            typedef void (Sender::*_t)(int );
            if (*reinterpret_cast<_t *>(_a[1]) == static_cast<_t>(&Sender::testSignal)) {
                *result = 0;
                return;
            }
        }
    }
}
```

最后关键是创建activate方法

_a是一个函数指针

```cpp
void Sender::testSignal(int _t1)
{
    void *_a[] = { nullptr, const_cast<void*>(reinterpret_cast<const void*>(&_t1)) };
    QMetaObject::activate(this, &staticMetaObject, 0, _a);
}
```

## 1. 整体架构概述

Qt的信号槽机制是基于**元对象系统(Meta-Object System)**实现的，它在编译时通过MOC(Meta-Object Compiler)生成额外的C++代码，在运行时通过元信息实现类型安全的回调机制。

## 2. Q_OBJECT宏的作用

```c++
#define Q_OBJECT \
public: \
    static const QMetaObject staticMetaObject; \
    virtual const QMetaObject *metaObject() const; \
    virtual void *qt_metacast(const char *); \
    virtual int qt_metacall(QMetaObject::Call, int, void **); \
    /* ... */ \
private: \
    Q_DECL_HIDDEN_STATIC_METACALL static void qt_static_metacall(QObject *, QMetaObject::Call, int, void **); \
    struct QPrivateSignal {};
```

### 各函数作用：

- **`staticMetaObject`**: 静态元对象，包含类的所有元信息
- **`metaObject()`**: 返回当前实例的元对象指针
- **`qt_metacast()`**: 用于**安全的类型转换**，类似于dynamic_cast但基于Qt的类型系统
- **`qt_metacall()`**: **元方法调用的入口点**，负责分发调用到具体的信号/槽
- **`qt_static_metacall()`**: 静态版本的元调用，性能更好

## 3. MOC生成的关键数据结构

### 3.1 字符串数据表

```C++
struct qt_meta_stringdata_Sender_t {
    QByteArrayData data[4];
    char stringdata0[32];
};
// 存储类名、信号名、参数类型名等所有字符串
```

### 3.2 元数据数组

```C++
static const uint qt_meta_data_Sender[] = {
    8,       // revision
    0,       // classname
    0, 0,    // classinfo
    1, 14,   // methods (count, offset)
    0, 0,    // properties
    0, 0,    // enums/sets
    0, 0,    // constructors
    0,       // flags
    1,       // signalCount

    // signals: name, argc, parameters, tag, flags
    1,    1,   19,    2, 0x06 /* Public */,

    // parameters
    QMetaType::Void, QMetaType::Int,    3,

    0        // eod
};
```

**这个数组是一个紧凑的元信息内存块，包含：**

- 版本信息
- 方法数量和偏移
- 每个信号/槽的签名信息
- 参数类型信息

## 4. qt_static_metacall的两个关键分支

```C++
void Sender::qt_static_metacall(QObject *_o, QMetaObject::Call _c, int _id, void **_a)
{
    if (_c == QMetaObject::InvokeMetaMethod) {
        // 分支1: 实际调用信号/槽
        Sender *_t = static_cast<Sender *>(_o);
        switch (_id) {
        case 0: _t->testSignal((*reinterpret_cast<int(*)>(_a[1]))); break;
        }
    } else if (_c == QMetaObject::IndexOfMethod) {
        // 分支2: 查找方法索引（用于connect时的信号槽匹配）
        int *result = reinterpret_cast<int *>(_a[0]);
        typedef void (Sender::*_t)(int);
        if (*reinterpret_cast<_t *>(_a[1]) == static_cast<_t>(&Sender::testSignal)) {
            *result = 0;  // 返回该信号在元对象中的索引
            return;
        }
    }
}
```

### 两个分支的用途：

1. **`InvokeMetaMethod`**: 运行时实际调用信号或槽函数
2. **`IndexOfMethod`**: 在`connect()`时根据函数指针查找对应的方法索引，用于建立连接关系

## 5. 信号的实现机制

### 5.1 信号函数的生成

```C++
void Sender::testSignal(int _t1)
{
    void *_a[] = {
        nullptr,  // 返回值位置(信号无返回值)
        const_cast<void*>(reinterpret_cast<const void*>(&_t1))  // 参数1
    };
    QMetaObject::activate(this, &staticMetaObject, 0, _a);
}
```

### 5.2 QMetaObject::activate的工作流程

```C++
void QMetaObject::activate(QObject *sender, const QMetaObject *m, int local_signal_index, void **argv)
{
    // 1. 计算全局信号索引
    int signal_index = local_signal_index + m->methodOffset();

    // 2. 获取连接列表
    QObjectPrivate::ConnectionData *cd = sender->d_func()->connections;
    if (!cd || signal_index >= cd->signalVector.count())
        return;

    // 3. 遍历所有连接的槽
    QObjectPrivate::Connection *c = cd->signalVector.at(signal_index).first;
    while (c) {
        QObject *receiver = c->receiver;

        // 4. 根据连接类型调用槽
        if (c->connectionType == Qt::DirectConnection) {
            // 直接调用
            receiver->qt_metacall(QMetaObject::InvokeMetaMethod, c->method_(), argv);
        } else if (c->connectionType == Qt::QueuedConnection) {
            // 放入事件队列
            QCoreApplication::postEvent(receiver, new QMetaCallEvent(...));
        }

        c = c->nextConnectionList;
    }
}
```

## 6. 连接建立过程(connect)

```C++
QMetaObject::Connection QObject::connect(
    const QObject *sender, const char *signal,
    const QObject *receiver, const char *slot,
    Qt::ConnectionType type)
{
    // 1. 解析信号和槽的字符串，获取方法索引
    int signal_index = sender->metaObject()->indexOfSignal(signal);
    int slot_index = receiver->metaObject()->indexOfSlot(slot);

    // 2. 验证参数兼容性
    if (!QMetaObject::checkConnectArgs(signal, slot))
        return QMetaObject::Connection();

    // 3. 创建连接对象并添加到发送者的连接列表
    QObjectPrivate::Connection *c = new QObjectPrivate::Connection;
    c->sender = sender;
    c->receiver = receiver;
    c->method_relative = slot_index;
    c->connectionType = type;

    // 4. 添加到sender的信号连接向量中
    sender->d_func()->addConnection(signal_index, c);

    return QMetaObject::Connection(c);
}
```

## 7. 完整的调用链路

```
emit signal(args)
    ↓
生成的信号函数
    ↓
QMetaObject::activate()
    ↓
遍历连接列表
    ↓
receiver->qt_metacall()
    ↓
qt_static_metacall()
    ↓
实际的槽函数
```

## 8. 性能优化机制

1. **函数指针连接**: Qt5引入的编译时检查机制

   ```C++
   connect(sender, &Sender::signal, receiver, &Receiver::slot);
   ```

2. **静态元调用**: 避免虚函数调用开销

3. **连接向量**: 使用索引直接访问连接列表

## 9. 线程安全机制

- **Qt::DirectConnection**: 在发送者线程中直接调用
- **Qt::QueuedConnection**: 通过事件循环异步调用
- **Qt::AutoConnection**: 根据线程关系自动选择
- **Qt::BlockingQueuedConnection**: 阻塞等待跨线程调用完成

## 知识总结

- Q_OBJECT 会让 moc 生成元对象，信号槽才能按名字和参数对上。
- 元数据里有字符串表和方法表，qt_static_metacall 负责真正调用。
- 发信号并不是直接调用槽，而是走进元对象，再按连接类型决定在哪个线程执行。
- 读生成代码时，先看元调用的两个分支：调用方法，和激活信号。
