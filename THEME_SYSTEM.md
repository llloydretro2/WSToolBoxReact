# WSToolBox 主题系统说明

## 概述

WSToolBox 现在使用统一的 CSS 变量系统来管理颜色，基于你提供的 Spring Rain 配色方案。系统移除了暗色主题和主题切换功能，专注于提供一致的浅色主题体验。

## 颜色变量定义

系统定义了以下 CSS 变量，所有页面都应使用这些变量而不是硬编码颜色值：

### 主色调
- `--primary`: 主色 (#a6ceb6)
- `--primary-hover`: 悬停色 (#9ec4ad)
- `--primary-light`: 浅主色 (#bdeacf)
- `--primary-dark`: 深主色 (#94b7a2)

### 背景色
- `--background`: 页面背景色 (#e3f5ea)
- `--surface`: 表面色（卡片背景）(#ffffff)
- `--card-background`: 卡片背景 (rgba(166, 206, 182, 0.15))

### 文本色
- `--text`: 主要文本色 (#0c120f)
- `--text-secondary`: 次要文本色 (#35443b)
- `--text-muted`: 弱化文本色 (#52675a)

### 边框和状态色
- `--border`: 边框色 (#bdeacf)
- `--divider`: 分割线色 (#a6ceb6)
- `--success`: 成功状态色 (#4caf50)
- `--error`: 错误状态色 (#f44336)
- `--warning`: 警告状态色 (#ff9800)
- `--info`: 信息色 (#88a995)

## 使用方法

### 在组件中使用 CSS 变量

```jsx
// 在 sx 属性中使用
sx={{
  backgroundColor: 'var(--primary)',
  color: 'var(--text)',
  '&:hover': {
    backgroundColor: 'var(--primary-hover)'
  }
}}

// 在样式对象中使用
const styles = {
  button: {
    backgroundColor: 'var(--primary)',
    color: 'var(--text)'
  }
}
```

### 在 CSS 文件中使用

```css
.my-component {
  background-color: var(--background);
  color: var(--text);
  border: 1px solid var(--border);
}
```

## 最佳实践

1. **始终使用 CSS 变量**：避免在任何地方硬编码颜色值
2. **保持一致性**：确保所有组件使用相同的颜色变量
3. **语义化使用**：根据语义选择合适的变量（如主要文本用 `--text`，次要文本用 `--text-secondary`）
4. **测试对比度**：确保颜色对比度符合可访问性标准

## 文件结构

```
src/
├── theme/
│   └── themeConfig.js       # 主题配置（简化版）
├── contexts/
│   └── ThemeContext.jsx     # 主题上下文（简化版）
├── hooks/
│   └── useThemeVariables.js # 主题变量钩子（简化版）
└── index.css                # CSS 变量定义
```

## 注意事项

- 系统已移除暗色主题支持
- 系统已移除主题切换功能
- 所有硬编码颜色已替换为 CSS 变量
- 确保新组件遵循相同的颜色使用规范

通过使用这个统一的颜色系统，WSToolBox 保持了视觉一致性，并使得未来的颜色调整变得更加容易。