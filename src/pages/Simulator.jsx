import React, { useState, useEffect, useMemo, useCallback } from "react";
import PropTypes from "prop-types";
import { Combobox } from "@headlessui/react";
import { ChevronDown, Dices, X, RotateCcw } from "lucide-react";
import { useLocale } from "../contexts/LocaleContext";
import { useOptions } from "../contexts/OptionsContext";
import { apiRequest } from "../utils/api.js";
import LazyImage from "../components/LazyImage.jsx";

// ── Constants ──────────────────────────────────────────────────────────────────

// 稀有度名称模式匹配
const ULTRA_RARE_PATTERNS = ["SP", "SSP", "SEC", "SIR", "AGR", "OFR", "ABR", "ATR", "SR", "XR", "BDR", "DCR"];
const CLIMAX_TYPES = ["クライマックス", "Climax"];

function isUltraRare(rarity) {
	return ULTRA_RARE_PATTERNS.some((p) => rarity.toUpperCase().includes(p));
}
function isClimax(cardType) {
	return CLIMAX_TYPES.includes(cardType);
}
function isRRR(r) { return r.toUpperCase().startsWith("RRR"); }
function isRR(r)  { const u = r.toUpperCase(); return u.startsWith("RR") && !u.startsWith("RRR"); }
function isR(r)   { const u = r.toUpperCase(); return (u === "R" || u === "R+") && !isRR(r) && !isRRR(r); }

// Preset 定义（label/sublabel 通过 t() 在组件内注入）
const PRESETS = [
	{
		id: "classic",
		label: "",
		sublabel: "",
		packsPerBox: 16,
		cardsPerPack: 8,
		getRarityCounts: (rarityMap) => {
			const counts = {};
			for (const r of Object.keys(rarityMap)) {
				const cards = rarityMap[r];
				if (!cards?.length) continue;
				const sample = cards[0];
				if (isClimax(sample?.card_type)) {
					counts[r] = 1; // 每种 Climax 1张/箱
				} else if (isRRR(r)) {
					counts[r] = 1;
				} else if (isRR(r)) {
					counts[r] = 4;
				} else if (isR(r)) {
					counts[r] = 15;
				}
			}
			return counts;
		},
	},
	{
		id: "en2024",
		label: "",
		sublabel: "NIKKE Vol.2起 · 16包×9张 · 无高稀有保底",
		packsPerBox: 16,
		cardsPerPack: 9,
		getRarityCounts: (rarityMap) => {
			const counts = {};
			for (const r of Object.keys(rarityMap)) {
				const cards = rarityMap[r];
				if (!cards?.length) continue;
				const sample = cards[0];
				if (isClimax(sample?.card_type)) {
					counts[r] = 1;
				} else if (isR(r)) {
					counts[r] = 16;
				}
				// RRR/RR 无保底，不填
			}
			return counts;
		},
	},
	{
		id: "jp2026",
		label: "JP 2026+ 规格",
		sublabel: "Summer Pockets TV起 · 10包×8张",
		packsPerBox: 10,
		cardsPerPack: 8,
		getRarityCounts: (rarityMap) => {
			const counts = {};
			for (const r of Object.keys(rarityMap)) {
				const cards = rarityMap[r];
				if (!cards?.length) continue;
				const sample = cards[0];
				if (isClimax(sample?.card_type)) {
					counts[r] = 1;
				} else if (isRRR(r)) {
					counts[r] = 1;
				} else if (isRR(r)) {
					counts[r] = 4;
				}
				// SR 约4/箱但结构特殊，留空让用户填
			}
			return counts;
		},
	},
	{
		id: "custom",
		label: "自定义",
		sublabel: "手动填写所有参数",
		packsPerBox: 16,
		cardsPerPack: 8,
		getRarityCounts: () => ({}),
	},
];

// ── Sub-components ─────────────────────────────────────────────────────────────

function ProductCombobox({ value, onChange, options, placeholder }) {
	const [query, setQuery] = useState("");
	const filtered = query === "" ? options : options.filter((o) => o.toLowerCase().includes(query.toLowerCase()));
	return (
		<Combobox value={value} onChange={onChange} onClose={() => setQuery("")} immediate>
			<div className="relative">
				<Combobox.Input autoComplete="off" placeholder={placeholder}
					displayValue={(v) => v || ""}
					onChange={(e) => setQuery(e.target.value)}
					className="w-full bg-transparent border border-[var(--border)] rounded-xl px-4 py-3 pr-10
					           text-sm text-[var(--text)] placeholder:text-[var(--text-muted)]
					           focus:outline-none focus:border-[var(--text-muted)] transition-colors"
				/>
				{value ? (
					<button type="button" onClick={() => onChange(null)}
						className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text)] transition-colors">
						<X size={14} />
					</button>
				) : (
					<Combobox.Button className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--border)] hover:text-[var(--text-muted)] transition-colors">
						<ChevronDown size={14} />
					</Combobox.Button>
				)}
				<Combobox.Options anchor={{ to: "bottom start", gap: 4 }}
					className="z-[9999] w-[var(--input-width)] border border-[var(--border)] rounded-xl bg-white shadow-lg max-h-64 overflow-auto">
					{filtered.length === 0 ? (
						<div className="px-3 py-2 text-sm text-[var(--text-muted)]">无匹配结果</div>
					) : filtered.map((opt) => (
						<Combobox.Option key={opt} value={opt}
							className={({ active, selected }) =>
								`px-3 py-2 text-sm cursor-pointer transition-colors ${selected ? "bg-[var(--text-muted)] text-white font-medium" : active ? "bg-[var(--card-background)] text-[var(--text)]" : "text-[var(--text)]"}`
							}>{opt}</Combobox.Option>
					))}
				</Combobox.Options>
			</div>
		</Combobox>
	);
}

function CardDetailModal({ card, onClose, t }) {
	if (!card) return null;
	const fields = [
		["pages.simulator.cardDetails.cardNumber", card.cardno],
		["pages.simulator.cardDetails.rarity", card.rarity],
		["pages.simulator.cardDetails.color", card.color],
		["pages.simulator.cardDetails.level", card.level],
		["pages.simulator.cardDetails.cost", card.cost],
		["pages.simulator.cardDetails.power", card.power],
		["pages.simulator.cardDetails.soul", card.soul],
		["pages.simulator.cardDetails.trigger", Array.isArray(card.trigger) ? card.trigger.join(", ") : card.trigger],
		["pages.simulator.cardDetails.feature", card.feature],
		["pages.simulator.cardDetails.effect", card.effect],
	].filter(([, v]) => v !== undefined && v !== null && v !== "");

	return (
		<div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/30 backdrop-blur-sm p-4" onClick={onClose}>
			<div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
				<div className="flex gap-4 p-5">
					<div className="w-32 shrink-0">
						<LazyImage src={card.image_url} alt={card.name} style={{ minHeight: "180px", borderRadius: "12px" }} />
					</div>
					<div className="flex-1 min-w-0 overflow-y-auto max-h-80">
						<p className="text-base font-black text-[var(--text)] mb-1 leading-tight">{card.name}</p>
						{card.zh_name && <p className="text-sm text-[var(--text-secondary)] mb-2">{card.zh_name}</p>}
						<div className="flex flex-col gap-0.5">
							{fields.map(([key, val]) => (
								<div key={key} className="flex gap-1.5 text-xs">
									<span className="font-bold text-[var(--text-muted)] shrink-0">{t(key)}</span>
									<span className="text-[var(--text)] break-words">{String(val)}</span>
								</div>
							))}
						</div>
					</div>
				</div>
				<div className="px-5 pb-4 flex justify-end">
					<button onClick={onClose}
						className="px-4 py-2 rounded-xl text-sm font-bold bg-[var(--text-muted)] text-white hover:bg-[var(--text-secondary)] transition-colors">
						关闭
					</button>
				</div>
			</div>
		</div>
	);
}

function SectionEyebrow({ label }) {
	return (
		<div className="flex items-center gap-3 mb-4">
			<span className="text-[10px] font-black tracking-widest uppercase text-[var(--text-secondary)]">{label}</span>
			<div className="flex-1 border-t border-[var(--border)]" />
		</div>
	);
}

// ── Main ───────────────────────────────────────────────────────────────────────

SectionEyebrow.propTypes = {
	label: PropTypes.string.isRequired,
};

ProductCombobox.propTypes = {
	value:       PropTypes.string,
	onChange:    PropTypes.func.isRequired,
	options:     PropTypes.arrayOf(PropTypes.string).isRequired,
	placeholder: PropTypes.string,
};

CardDetailModal.propTypes = {
	card:    PropTypes.object,
	onClose: PropTypes.func.isRequired,
	t:       PropTypes.func.isRequired,
};

export default function SimulatorV2() {
	const { t } = useLocale();
	const { productList, enProductList } = useOptions();

	// Inject translated labels into PRESETS
	const presets = PRESETS.map(p => ({
		...p,
		label:    t(`simulator.presets.${p.id}`),
		sublabel: t(`simulator.presets.${p.id}Sub`),
	}));
	const [lang, setLang] = useState("jp");
	const [selectedProduct, setSelectedProduct] = useState(null);
	const [cards, setCards] = useState([]);
	const [rarityMap, setRarityMap] = useState({});           // rarity → cards[]
	const [boxCounts, setBoxCounts] = useState({});           // rarity → N/箱（固定）
	const [ultraRates, setUltraRates] = useState({});         // rarity → { boxes: N, count: M }（每N箱M张）
	const [presetId, setPresetId] = useState("classic");
	const [cardsPerPack, setCardsPerPack] = useState(8);
	const [packsPerBox, setPacksPerBox] = useState(16);
	const [numBoxes, setNumBoxes] = useState(1);
	const [simulatedPacks, setSimulatedPacks] = useState([]);
	const [selectedCard, setSelectedCard] = useState(null);
	const [packDetailOpen, setPackDetailOpen] = useState(false);
	const [isLoading, setIsLoading] = useState(false);

	// Language reset
	useEffect(() => {
		setSelectedProduct(null);
		setCards([]);
		setSimulatedPacks([]);
	}, [lang]);

	// Load cards
	useEffect(() => {
		if (!selectedProduct) { setCards([]); return; }
		setIsLoading(true);
		const ep = lang === "en"
			? `/api/cards/en/by-product?product_name=${encodeURIComponent(selectedProduct)}`
			: `/api/cards/jp/by-product?product_name=${encodeURIComponent(selectedProduct)}`;
		apiRequest(ep)
			.then((r) => r.json())
			.then((d) => setCards(d.data || []))
			.catch(() => setCards([]))
			.finally(() => setIsLoading(false));
	}, [selectedProduct, lang]);

	// Build rarity map
	useEffect(() => {
		const map = {};
		cards.forEach((c) => {
			if (c.rarity) {
				if (!map[c.rarity]) map[c.rarity] = [];
				map[c.rarity].push(c);
			}
		});
		setRarityMap(map);
	}, [cards]);

	// Apply preset when rarity map or preset changes
	useEffect(() => {
		const preset = presets.find((p) => p.id === presetId);
		if (!preset || !Object.keys(rarityMap).length) return;
		setCardsPerPack(preset.cardsPerPack);
		setPacksPerBox(preset.packsPerBox);
		const counts = preset.getRarityCounts(rarityMap);
		setBoxCounts(counts);
		// Ultra rares: init to empty if not yet set
		const ultra = {};
		Object.keys(rarityMap).forEach((r) => {
			if (isUltraRare(r)) ultra[r] = ultraRates[r] ?? { boxes: "", count: "" };
		});
		setUltraRates(ultra);
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [rarityMap, presetId]);

	// Derived
	const standardRarities = useMemo(
		() => Object.keys(rarityMap).filter((r) => !isUltraRare(r)),
		[rarityMap]
	);
	const ultraRarities = useMemo(
		() => Object.keys(rarityMap).filter((r) => isUltraRare(r)),
		[rarityMap]
	);
	const products = useMemo(() => {
		const list = lang === "en" ? enProductList.product_name : productList.product_name;
		return (list || []).slice().sort();
	}, [lang, productList.product_name, enProductList.product_name]);

	// ── Simulation algorithm ────────────────────────────────────────────────────

	const simulate = useCallback(() => {
		const allPacks = [];

		// Cards not configured in boxCounts or ultraRates → fill pool
		const configuredRarities = new Set([...Object.keys(boxCounts), ...Object.keys(ultraRates)]);
		const fillPool = Object.entries(rarityMap)
			.filter(([r]) => !configuredRarities.has(r))
			.flatMap(([, cs]) => cs);

		const pickRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

		for (let b = 0; b < numBoxes; b++) {
			const boxPool = [];

			// 1. Fixed guaranteed cards
			for (const [rarity, count] of Object.entries(boxCounts)) {
				const pool = rarityMap[rarity] || [];
				if (!pool.length || !count) continue;
				for (let i = 0; i < count; i++) {
					boxPool.push(pickRandom(pool));
				}
			}

			// 2. Ultra-rare probabilistic cards（每 boxes 箱 count 张）
			for (const [rarity, rate] of Object.entries(ultraRates)) {
				const boxes = parseInt(rate?.boxes);
				const count = parseInt(rate?.count);
				if (!boxes || boxes <= 0 || !count || count <= 0) continue;
				const pool = rarityMap[rarity] || [];
				if (!pool.length) continue;
				const perBox = count / boxes;
				const guaranteed = Math.floor(perBox);
				for (let i = 0; i < guaranteed; i++) boxPool.push(pickRandom(pool));
				if (Math.random() < perBox - guaranteed) boxPool.push(pickRandom(pool));
			}

			// 3. Fill remaining slots with non-configured cards
			const totalExpected = packsPerBox * cardsPerPack;
			while (boxPool.length < totalExpected && fillPool.length) {
				boxPool.push(pickRandom(fillPool));
			}

			// 4. Shuffle and deal into packs
			const shuffled = boxPool.slice().sort(() => Math.random() - 0.5);
			for (let p = 0; p < packsPerBox; p++) {
				allPacks.push(shuffled.slice(p * cardsPerPack, (p + 1) * cardsPerPack));
			}
		}

		setSimulatedPacks(allPacks);
	}, [rarityMap, boxCounts, ultraRates, numBoxes, packsPerBox, cardsPerPack]);

	// ── Results grouping ────────────────────────────────────────────────────────

	const resultByRarity = useMemo(() => {
		const flat = simulatedPacks.flat();
		const map = {};
		flat.forEach((c) => {
			if (!map[c.rarity]) map[c.rarity] = [];
			map[c.rarity].push(c);
		});
		// Sort by rarity: ultra first, then RRR, RR, R, others
		const order = (r) => {
			if (isUltraRare(r)) return 0;
			if (isRRR(r)) return 1;
			if (isRR(r)) return 2;
			if (isR(r)) return 3;
			return 4;
		};
		return Object.entries(map).sort(([a], [b]) => order(a) - order(b));
	}, [simulatedPacks]);

	// ── Render ─────────────────────────────────────────────────────────────────

	return (
		<div className="max-w-5xl mx-auto px-4 sm:px-6 pb-8 sm:py-10">

			{/* Title */}
			<div className="mb-8">
				<h1 className="text-3xl sm:text-4xl font-black tracking-tight text-[var(--text)] leading-none mb-2">
					{t("pages.simulator.title")}
				</h1>
				<p className="text-sm text-[var(--text-secondary)]">{t("pages.simulator.subtitle")}</p>
			</div>

			{/* Panel 1: Product */}
			<div className="border border-[var(--border)] rounded-2xl p-5 bg-white/70 backdrop-blur-md mb-4">
				<div className="flex items-center justify-between mb-4">
					<span className="text-[10px] font-black tracking-widest uppercase text-[var(--text-secondary)]">
						{t("pages.simulator.selectProduct")}
					</span>
					<div className="inline-flex border border-[var(--border)] rounded-lg overflow-hidden">
						{["jp", "en"].map((l, i) => (
							<button key={l} type="button" onClick={() => setLang(l)}
								className={`px-3 py-1 text-[10px] font-bold transition-colors ${i === 0 ? "border-r border-[var(--border)]" : ""} ${lang === l ? "bg-[var(--text)] text-[var(--background)]" : "text-[var(--text)] hover:bg-[var(--card-background)]"}`}>
								{l.toUpperCase()}
							</button>
						))}
					</div>
				</div>
				<ProductCombobox value={selectedProduct} onChange={setSelectedProduct} options={products} placeholder={t("pages.simulator.selectProduct")} />
				{selectedProduct && (
					<div className="mt-3 flex items-center gap-2">
						{isLoading ? (
							<div className="w-4 h-4 rounded-full border-2 border-[var(--border)] border-t-[var(--text-muted)] animate-spin" />
						) : (
							<>
								<span className="w-1.5 h-1.5 rounded-full bg-[var(--primary)]" />
								<span className="text-xs text-[var(--text-secondary)]">
									已加载 <strong className="text-[var(--text)]">{cards.length}</strong> 张
									{Object.keys(rarityMap).length > 0 && <> · <strong className="text-[var(--text)]">{Object.keys(rarityMap).length}</strong> 种稀有度</>}
								</span>
							</>
						)}
					</div>
				)}
			</div>

			{/* Panel 2: Preset + Pack config */}
			<div className="border border-[var(--border)] rounded-2xl p-5 bg-white/70 backdrop-blur-md mb-4">
				<SectionEyebrow label={t("simulator.sectionPresets")} />
				<div className="flex flex-wrap gap-2 mb-5">
					{PRESETS.map((p) => (
						<button key={p.id} type="button" onClick={() => setPresetId(p.id)}
							className={`flex flex-col items-start px-3 py-2 rounded-xl border text-left transition-colors ${
								presetId === p.id
									? "bg-[var(--text)] text-[var(--background)] border-[var(--text)]"
									: "border-[var(--border)] hover:bg-[var(--card-background)]"
							}`}>
							<span className="text-xs font-black">{p.label}</span>
							<span className={`text-[10px] ${presetId === p.id ? "opacity-70" : "text-[var(--text-muted)]"}`}>{p.sublabel}</span>
						</button>
					))}
				</div>
				<div className="flex flex-wrap gap-6 mb-5">
					{[
						{ label: t("pages.simulator.cardsPerPack"), value: cardsPerPack, set: setCardsPerPack },
						{ label: t("pages.simulator.packsPerBox"), value: packsPerBox, set: setPacksPerBox },
					].map(({ label, value, set }) => (
						<div key={label} className="flex flex-col gap-1">
							<span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wide">{label}</span>
							<div className="flex items-center border border-[var(--border)] rounded-lg overflow-hidden">
								<button type="button" onClick={() => set(Math.max(1, value - 1))}
									className="w-8 h-8 flex items-center justify-center text-[var(--text-secondary)] hover:bg-[var(--card-background)] transition-colors font-bold text-lg">−</button>
								<span className="w-10 text-center text-sm font-black text-[var(--text)]">{value}</span>
								<button type="button" onClick={() => set(value + 1)}
									className="w-8 h-8 flex items-center justify-center text-[var(--text-secondary)] hover:bg-[var(--card-background)] transition-colors font-bold text-lg">+</button>
							</div>
						</div>
					))}
					<div className="flex flex-col gap-1">
						<span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wide">模拟箱数</span>
						<div className="flex items-center border border-[var(--border)] rounded-lg overflow-hidden">
							<button type="button" onClick={() => setNumBoxes(Math.max(1, numBoxes - 1))}
								className="w-8 h-8 flex items-center justify-center text-[var(--text-secondary)] hover:bg-[var(--card-background)] transition-colors font-bold text-lg">−</button>
							<span className="w-10 text-center text-sm font-black text-[var(--text)]">{numBoxes}</span>
							<button type="button" onClick={() => setNumBoxes(numBoxes + 1)}
								className="w-8 h-8 flex items-center justify-center text-[var(--text-secondary)] hover:bg-[var(--card-background)] transition-colors font-bold text-lg">+</button>
						</div>
					</div>
				</div>
				<p className="text-[11px] text-[var(--text-muted)]">
					共模拟 <strong className="text-[var(--text)]">{numBoxes * packsPerBox}</strong> 包 · <strong className="text-[var(--text)]">{numBoxes * packsPerBox * cardsPerPack}</strong> 张
				</p>
			</div>

			{/* Panel 3: Standard rarity counts */}
			{standardRarities.length > 0 && (
				<div className="border border-[var(--border)] rounded-2xl p-5 bg-white/70 backdrop-blur-md mb-4">
					<SectionEyebrow label="标配稀有度（每箱张数）" />
					<div className="overflow-x-auto">
						<table className="w-full text-sm">
							<thead>
								<tr className="border-b border-[var(--border)]">
									<th className="text-left text-[10px] font-black tracking-widest uppercase text-[var(--text-muted)] pb-2 pr-4">稀有度</th>
									<th className="text-[10px] font-black tracking-widest uppercase text-[var(--text-muted)] pb-2 px-2 text-center">每箱张数</th>
									<th className="text-[10px] font-black tracking-widest uppercase text-[var(--text-muted)] pb-2 px-2 text-left">种类数</th>
									<th className="pb-2 w-8" />
								</tr>
							</thead>
							<tbody>
								{standardRarities.map((rarity) => (
									<tr key={rarity} className="border-b border-[var(--border)] last:border-0">
										<td className="py-2 pr-4 font-bold text-[var(--text)] whitespace-nowrap">{rarity}</td>
										<td className="py-2 px-2">
											<input type="number" min={0} placeholder="—"
												value={boxCounts[rarity] ?? ""}
												onChange={(e) => setBoxCounts((p) => ({ ...p, [rarity]: e.target.value === "" ? "" : parseInt(e.target.value) || 0 }))}
												className="w-16 text-center bg-transparent border border-[var(--border)] rounded-lg px-2 py-1 text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--text-muted)] transition-colors"
											/>
										</td>
										<td className="py-2 px-2 text-xs text-[var(--text-muted)]">{rarityMap[rarity]?.length ?? 0} 种</td>
										<td className="py-2 pl-2">
											<button type="button" onClick={() => setBoxCounts((p) => ({ ...p, [rarity]: "" }))}
												className="text-[var(--text-muted)] hover:text-[var(--reset)] transition-colors">
												<RotateCcw size={13} />
											</button>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</div>
			)}

			{/* Panel 4: Ultra-rare rates */}
			{ultraRarities.length > 0 && (
				<div className="border border-[var(--border)] rounded-2xl p-5 bg-white/70 backdrop-blur-md mb-4">
					<SectionEyebrow label="高稀有度" />
					<p className="text-xs text-[var(--text-muted)] mb-4">
						填写出现频率——例如「每 2 箱 1 张」或「每 1 箱 2 张」，不填则不计入模拟。
					</p>
					<div className="overflow-x-auto">
						<table className="w-full text-sm">
							<thead>
								<tr className="border-b border-[var(--border)]">
									<th className="text-left text-[10px] font-black tracking-widests uppercase text-[var(--text-muted)] pb-2 pr-4">稀有度</th>
									<th className="text-[10px] font-black tracking-widest uppercase text-[var(--text-muted)] pb-2 px-2 text-center" colSpan={3}>每 X 箱 X 张</th>
									<th className="text-[10px] font-black tracking-widest uppercase text-[var(--text-muted)] pb-2 px-2 text-left">种类数</th>
									<th className="pb-2 w-8" />
								</tr>
							</thead>
							<tbody>
								{ultraRarities.map((rarity) => {
									const rate = ultraRates[rarity] ?? { boxes: "", count: "" };
									return (
										<tr key={rarity} className="border-b border-[var(--border)] last:border-0">
											<td className="py-2 pr-4 font-bold text-[var(--text)] whitespace-nowrap">{rarity}</td>
											<td className="py-2 pl-2 pr-1 text-xs text-[var(--text-muted)] whitespace-nowrap">每</td>
											<td className="py-2 px-1">
												<input type="number" min={1} placeholder="—"
													value={rate.boxes ?? ""}
													onChange={(e) => setUltraRates((p) => ({ ...p, [rarity]: { ...p[rarity], boxes: e.target.value } }))}
													className="w-14 text-center bg-transparent border border-[var(--border)] rounded-lg px-2 py-1 text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--text-muted)] transition-colors"
												/>
											</td>
											<td className="py-2 px-1">
												<div className="flex items-center gap-1">
													<span className="text-xs text-[var(--text-muted)] whitespace-nowrap">箱</span>
													<input type="number" min={1} placeholder="—"
														value={rate.count ?? ""}
														onChange={(e) => setUltraRates((p) => ({ ...p, [rarity]: { ...p[rarity], count: e.target.value } }))}
														className="w-14 text-center bg-transparent border border-[var(--border)] rounded-lg px-2 py-1 text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--text-muted)] transition-colors"
													/>
													<span className="text-xs text-[var(--text-muted)]">张</span>
												</div>
											</td>
											<td className="py-2 px-2 text-xs text-[var(--text-muted)]">{rarityMap[rarity]?.length ?? 0} 种</td>
											<td className="py-2 pl-2">
												<button type="button"
													onClick={() => setUltraRates((p) => ({ ...p, [rarity]: { boxes: "", count: "" } }))}
													className="text-[var(--text-muted)] hover:text-[var(--reset)] transition-colors">
													<RotateCcw size={13} />
												</button>
											</td>
										</tr>
									);
								})}
							</tbody>
						</table>
					</div>
				</div>
			)}

			{/* Actions */}
			<div className="flex items-center gap-3 mb-8">
				<button onClick={simulate}
					disabled={!selectedProduct || isLoading || cards.length === 0}
					className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-[var(--text-muted)] text-white text-sm font-bold hover:bg-[var(--text-secondary)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
					<Dices size={16} />
					{t("pages.simulator.startSimulation")}
				</button>
				{simulatedPacks.length > 0 && (
					<button onClick={() => setSimulatedPacks([])}
						className="flex items-center gap-1.5 px-4 py-3 rounded-xl border border-[var(--border)] text-[var(--text-secondary)] text-sm font-bold hover:bg-[var(--card-background)] transition-colors">
						<X size={14} />
						{t("pages.simulator.clearResults")}
					</button>
				)}
			</div>

			{/* Results */}
			{simulatedPacks.length > 0 && (
				<div className="flex flex-col gap-4">

					{/* Rarity groups */}
					<div className="border border-[var(--border)] rounded-2xl p-5 bg-white/70 backdrop-blur-md">
						<SectionEyebrow label={t("pages.simulator.rarityDisplay")} />
						<div className="flex flex-col gap-5">
							{resultByRarity.map(([rarity, rarityCards]) => {
								const grouped = Object.values(rarityCards.reduce((m, c) => {
									if (!m[c.cardno]) m[c.cardno] = { card: c, count: 0 };
									m[c.cardno].count++;
									return m;
								}, {}));
								return (
									<div key={rarity}>
										<p className="text-xs font-black text-[var(--text-secondary)] mb-2">
											{rarity} <span className="text-[var(--text-muted)] font-medium">({rarityCards.length} 张)</span>
										</p>
										<div className="flex flex-wrap gap-2">
											{grouped.map(({ card, count }, i) => (
												<div key={i} onClick={() => setSelectedCard(card)}
													className="relative w-20 cursor-pointer rounded-lg overflow-hidden transition-transform duration-150 hover:scale-105">
													<LazyImage src={card.image_url} alt={card.name} style={{ minHeight: "112px" }} />
													{count > 1 && (
														<div className="absolute bottom-1 right-1 w-5 h-5 rounded-full bg-[var(--text-muted)] text-white text-[10px] font-black flex items-center justify-center">
															{count}
														</div>
													)}
												</div>
											))}
										</div>
									</div>
								);
							})}
						</div>
					</div>

					{/* Pack detail */}
					<div className="border border-[var(--border)] rounded-2xl overflow-hidden bg-white/70 backdrop-blur-md">
						<button type="button" onClick={() => setPackDetailOpen((v) => !v)}
							className="w-full flex items-center justify-between px-5 py-4 hover:bg-[var(--card-background)] transition-colors">
							<span className="text-[10px] font-black tracking-widest uppercase text-[var(--text-secondary)]">
								{t("pages.simulator.detailedResults")}（{simulatedPacks.length} 包）
							</span>
							<ChevronDown size={14} className={`text-[var(--text-muted)] transition-transform duration-200 ${packDetailOpen ? "rotate-180" : ""}`} />
						</button>
						{packDetailOpen && (
							<div className="px-5 pb-5 flex flex-col gap-4 border-t border-[var(--border)]">
								{simulatedPacks.map((pack, idx) => (
									<div key={idx} className="pt-4">
										<p className="text-xs font-bold text-[var(--text-muted)] mb-2">{t("pages.simulator.packNumber", { number: idx + 1 })}</p>
										<div className="flex flex-wrap gap-1.5">
											{pack.map((card, i) => (
												<div key={i} onClick={() => setSelectedCard(card)}
													className="w-16 cursor-pointer rounded-lg overflow-hidden transition-transform duration-150 hover:scale-105">
													<LazyImage src={card.image_url} alt={card.name} style={{ minHeight: "112px" }} />
												</div>
											))}
										</div>
									</div>
								))}
							</div>
						)}
					</div>
				</div>
			)}

			<CardDetailModal card={selectedCard} onClose={() => setSelectedCard(null)} t={t} />
		</div>
	);
}
