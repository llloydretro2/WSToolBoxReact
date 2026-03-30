import React, { useEffect, useMemo, useState } from "react";
import {
	Alert,
	Box,
	Button,
	CircularProgress,
	Divider,
	Paper,
	Stack,
	Typography,
} from "@mui/material";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:4000";

const endpoints = [
	{ key: "productList", label: "Product List", path: "/api/options/product-list" },
	{ key: "translations", label: "Translations", path: "/api/options/translations" },
	{ key: "deckRules", label: "Deck Rules", path: "/api/options/deck-rules?side=weiss" },
];

const formatPreview = (data) => {
	if (!data) return "无数据";
	try {
		return JSON.stringify(data, null, 2).slice(0, 220) + "...";
	} catch (err) {
		return `解析失败: ${err.message}`;
	}
};

export default function OptionsApiTest() {
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(null);
	const [results, setResults] = useState({});

	const fetchAll = async () => {
		setLoading(true);
		setError(null);
		const next = {};
		try {
			for (const ep of endpoints) {
				const res = await fetch(`${BACKEND_URL}${ep.path}`);
				const body = await res.json();
				next[ep.key] = { ok: res.ok, body };
				if (!res.ok) throw new Error(body?.message || `请求 ${ep.label} 失败`);
			}
			setResults(next);
		} catch (err) {
			setResults(next);
			setError(err.message || "请求失败");
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchAll();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const summary = useMemo(() => {
		return {
			productKeys: Array.isArray(results.productList?.body?.product_name)
				? results.productList.body.product_name.length
				: 0,
			translationGroups: results.translations?.body
				? Object.keys(results.translations.body).length
				: 0,
			deckEntries: results.deckRules?.body?.title_categories?.length || 0,
		};
	}, [results]);

	return (
		<Box sx={{ display: "flex", justifyContent: "center", mt: 4, px: 2 }}>
			<Paper sx={{ width: "100%", maxWidth: 960, p: 3 }} elevation={4}>
				<Stack spacing={2}>
					<Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
						<Box>
							<Typography variant="h5">Options API 测试</Typography>
							<Typography variant="body2" color="text.secondary">
								当前后端：{BACKEND_URL}
							</Typography>
						</Box>
						<Button
							variant="contained"
							onClick={fetchAll}
							disabled={loading}
							startIcon={loading ? <CircularProgress size={16} color="inherit" /> : null}>
							重新请求
						</Button>
					</Box>
					{error && <Alert severity="error">{error}</Alert>}
					<Stack divider={<Divider flexItem />} spacing={2}>
						<Typography variant="subtitle1">返回摘要</Typography>
						<Typography variant="body2">产品名称数量：{summary.productKeys}</Typography>
						<Typography variant="body2">翻译分组：{summary.translationGroups}</Typography>
						<Typography variant="body2">Weiss 规则条目：{summary.deckEntries}</Typography>
					</Stack>
					{endpoints.map((ep) => {
						const item = results[ep.key];
						return (
							<Box key={ep.key} sx={{ border: "1px solid #e0e0e0", borderRadius: 1, p: 2 }}>
								<Typography variant="subtitle2" gutterBottom>
									{ep.label}
								</Typography>
								<Typography
									component="pre"
									sx={{
										fontFamily: "Menlo, Consolas, monospace",
										fontSize: 12,
										maxHeight: 200,
										overflow: "auto",
									}}
								>
									{formatPreview(item?.body)}
								</Typography>
							</Box>
						);
					})}
				</Stack>
			</Paper>
		</Box>
	);
}
