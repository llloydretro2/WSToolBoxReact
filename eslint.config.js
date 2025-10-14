import js from "@eslint/js";
import globals from "globals";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
	globalIgnores(["dist"]),
	{
		files: ["**/*.{js,jsx}"],
		extends: [
			js.configs.recommended,
			react.configs.flat.recommended,
			reactHooks.configs["recommended-latest"],
			reactRefresh.configs.vite,
		],
		languageOptions: {
			ecmaVersion: 2020,
			globals: globals.browser,
			parserOptions: {
				ecmaVersion: "latest",
				ecmaFeatures: { jsx: true },
				sourceType: "module",
			},
		},
		rules: {
			"no-unused-vars": [
				"error",
				{
					varsIgnorePattern: "^[A-Z_]",
					argsIgnorePattern: "^_",
					ignoreRestSiblings: true,
				},
			],
			"react/jsx-uses-react": "error",
			"react/jsx-uses-vars": "error",
			"react/react-in-jsx-scope": "off", // React 17+ 不需要导入 React
		},
	},
	// 测试文件配置
	{
		files: ["**/*.test.{js,jsx}", "**/*.spec.{js,jsx}"],
		languageOptions: {
			globals: {
				...globals.browser,
				...globals.jest,
			},
		},
	},
]);
