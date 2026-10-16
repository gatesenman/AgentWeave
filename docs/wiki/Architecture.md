# 架构概览

## 核心模块

- **Spec Layer**: 统一超集规范
- **Adapter Layer**: 12 个厂商适配器
- **Runtime**: ACP 运行时
- **Desktop App**: Tauri + React 前端
- **Tracing**: 全链路追踪

## 数据流

用户配置 → 规范校验 → 适配器转换 → 运行时执行 → 追踪记录
