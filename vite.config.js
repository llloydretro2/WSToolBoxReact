import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// https://vite.dev/config/
export default defineConfig({
	plugins: [
		react(),
		VitePWA({
			registerType: "autoUpdate",
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
	server: {
		port: 3000,
		open: true,
	},
});
