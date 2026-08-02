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
				name: "CardToolBox",
				short_name: "CardToolBox",
				description: "卡牌与桌游多合一工具集",
				theme_color: "#ffffff",
				background_color: "#ffffff",
				display: "standalone",
				start_url: "/",
				icons: [
					{
						src: "/web-app-manifest-192x192.png",
						sizes: "192x192",
						type: "image/png",
						purpose: "maskable",
					},
					{
						src: "/web-app-manifest-512x512.png",
						sizes: "512x512",
						type: "image/png",
						purpose: "maskable",
					},
					{
						src: "/favicon-96x96.png",
						sizes: "96x96",
						type: "image/png",
					},
				],
			},
		}),
	],
	build: {
		rollupOptions: {
			output: {
				manualChunks: {
					"react-vendor": ["react", "react-dom", "react-router-dom"],
					// 仅 NavBar.jsx 与 PageTransition.jsx 还在用 MUI，
					// 但两者都非懒加载，所以这个 chunk 仍在每次首屏的关键路径上
					"mui-vendor": [
						"@mui/material",
						"@emotion/react",
						"@emotion/styled",
					],
					"motion-vendor": ["framer-motion"],
				},
			},
		},
		chunkSizeWarningLimit: 500,
	},
	server: {
		port: 3000,
		open: true,
		headers: {
			"Content-Security-Policy": "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
		},
		watch: {
			usePolling: true,
			interval: 300,
		},
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
