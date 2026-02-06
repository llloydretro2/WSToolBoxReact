import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// https://vite.dev/config/
export default defineConfig({
	plugins: [
		react(),
		VitePWA({
			registerType: "autoUpdate",
			workbox: {
				maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
			},
			manifest: {
				name: "WSToolBox",
				short_name: "WSToolBox",
				description: "Weiss Schwarz 工具箱",
				theme_color: "#ffffff",
				icons: [
					{
						src: "/favicon.ico",
						sizes: "64x64 32x32 24x24 16x16",
						type: "image/x-icon",
					},
				],
			},
		}),
	],
	build: {
		rollupOptions: {
			output: {
				manualChunks: {
					// React 核心库
					"react-vendor": ["react", "react-dom", "react-router-dom"],
					// Material-UI 库
					"mui-vendor": [
						"@mui/material",
						"@mui/icons-material",
						"@mui/lab",
						"@mui/x-date-pickers",
						"@emotion/react",
						"@emotion/styled",
					],
					// 图表库
					"charts-vendor": [
						"echarts",
						"echarts-for-react",
						"apexcharts",
						"react-apexcharts",
						"recharts",
						"react-chartjs-2",
						"chartjs-plugin-datalabels",
						"@nivo/core",
						"@nivo/pie",
					],
					// D3 和数据可视化
					"d3-vendor": ["d3", "d3-interpolate", "d3-scale-chromatic"],
					// 其他工具库
					"utils-vendor": [
						"framer-motion",
						"react-draggable",
						"react-zoom-pan-pinch",
						"html2canvas",
						"date-fns",
						"@date-io/date-fns",
						"seedrandom",
					],
				},
			},
		},
		// 调整 chunk 大小警告限制
		chunkSizeWarningLimit: 1000,
	},
	server: {
		port: 3000,
		open: true,
		proxy: {
			"/api": {
				target: "http://localhost:4000",
				changeOrigin: true,
				secure: false,
			},
			"/audios": {
				target: "http://localhost:4000",
				changeOrigin: true,
				secure: false,
			},
		},
	},
});
