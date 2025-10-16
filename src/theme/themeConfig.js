// 主题配置 - 基于 spring-rain 配色方案
export const themeConfig = {
  light: {
    name: "浅色主题",
    colors: {
      // 主色调
      primary: "var(--spring-rain-200)", // #a6ceb6
      primaryHover: "var(--spring-rain-300)", // #9ec4ad
      primaryLight: "var(--spring-rain-100)", // #bdeacf
      primaryDark: "var(--spring-rain-400)", // #94b7a2

      // 背景色
      background: "var(--spring-rain-50)", // #e3f5ea
      surface: "#ffffff",
      cardBackground: "rgba(166, 206, 182, 0.15)",

      // 文本色
      text: "var(--spring-rain-1900)", // #0c120f
      textSecondary: "var(--spring-rain-1300)", // #35443b
      textMuted: "var(--spring-rain-900)", // #52675a

      // 边框和分割线
      border: "var(--spring-rain-100)", // #bdeacf
      divider: "var(--spring-rain-200)", // #a6ceb6

      // 状态色
      success: "#4caf50",
      error: "#f44336",
      warning: "#ff9800",
      info: "var(--spring-rain-500)", // #88a995

      // 图表颜色
      chartColors: [
        "var(--spring-rain-200)", // #a6ceb6
        "var(--spring-rain-500)", // #88a995
        "var(--spring-rain-700)", // #6d8978
        "var(--spring-rain-900)", // #52675a
        "var(--spring-rain-1100)", // #43564b
        "var(--spring-rain-1300)", // #35443b
      ],
    },
  },
};

// 默认主题
export const defaultTheme = "light";
