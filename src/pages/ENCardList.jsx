import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import PropTypes from "prop-types";
import { Combobox, Listbox } from "@headlessui/react";
import {
	Search, ChevronDown, ChevronLeft, ChevronRight, ChevronUp,
	X, SlidersHorizontal,
} from "lucide-react";
import { apiRequest } from "../utils/api.js";
import { useLocale } from "../contexts/LocaleContext";
import LazyImage from "../components/LazyImage.jsx";

const PAGE_SIZE = 60;

const COLOR_OPTIONS = [
	{ value: "yellow", label: "Yellow", dot: "bg-yellow-400", pill: "bg-yellow-100 text-yellow-800" },
	{ value: "green",  label: "Green",  dot: "bg-green-500",  pill: "bg-green-100 text-green-800" },
	{ value: "red",    label: "Red",    dot: "bg-red-500",    pill: "bg-red-100 text-red-800" },
	{ value: "blue",   label: "Blue",   dot: "bg-blue-500",   pill: "bg-blue-100 text-blue-800" },
];

const CARD_TYPE_OPTIONS = ["Character", "Event", "Climax"];

const SIDE_OPTIONS = [
	{ value: "", label: "All" },
	{ value: "w", label: "Weiß" },
	{ value: "s", label: "Schwarz" },
];

const EMPTY_DRAFT = {
	search: "", product_name: "", series_number: "",
	card_type: "", color: "", side: "", trigger: "", rarity: "",
};

const extractBaseCardNo = (cardno) => {
	if (!cardno) return null;
	const match = cardno.trim().match(/^(.*\d)([A-Za-z]+)$/);
	return match ? match[1] : cardno.trim();
};

// ── Generic searchable combobox ───────────────────────────────────────────────

function FilterCombobox({ value, onChange, options, placeholder }) {
	const [query, setQuery] = useState("");

	const filtered =
		query === ""
			? options
			: options.filter((o) => o.toLowerCase().includes(query.toLowerCase()));

	return (
		<Combobox value={value} onChange={onChange} onClose={() => setQuery("")} immediate>
			<div className="relative">
				<Combobox.Input
					autoComplete="off"
					placeholder={placeholder}
					displayValue={(v) => v || ""}
					onChange={(e) => setQuery(e.target.value)}
					className="w-full bg-transparent border border-[var(--border)] rounded-lg px-3 py-2 pr-8 text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--text-muted)] transition-colors"
				/>
				{value ? (
					<button
						type="button"
						onClick={() => onChange("")}
						className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text)] transition-colors">
						<X size={12} />
					</button>
				) : (
					<Combobox.Button className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--border)] hover:text-[var(--text-muted)] transition-colors">
						<ChevronDown size={14} />
					</Combobox.Button>
				)}
				<Combobox.Options
					anchor={{ to: "bottom start", gap: 4 }}
					className="z-[9999] w-[var(--input-width)] border border-[var(--border)] rounded-xl bg-white shadow-lg max-h-56 overflow-auto">
					{filtered.length === 0 ? (
						<div className="px-3 py-2 text-sm text-[var(--text-muted)]">No results</div>
					) : (
						filtered.map((opt) => (
							<Combobox.Option
								key={opt}
								value={opt}
								className={({ active, selected }) =>
									`px-3 py-2 text-sm cursor-pointer transition-colors ${
										selected
											? "bg-[var(--text-muted)] text-white font-medium"
											: active
											? "bg-[var(--card-background)] text-[var(--text)]"
											: "text-[var(--text)]"
									}`
								}>
								{opt}
							</Combobox.Option>
						))
					)}
				</Combobox.Options>
			</div>
		</Combobox>
	);
}

FilterCombobox.propTypes = {
	value: PropTypes.string.isRequired,
	onChange: PropTypes.func.isRequired,
	options: PropTypes.arrayOf(PropTypes.string).isRequired,
	placeholder: PropTypes.string,
};

// ── Card image (handles climax 90° rotation + lazy loading) ──────────────────

const CLIMAX_IMG_STYLE = {
	position: "absolute",
	width: "140%",
	height: "71.43%",
	top: "14.285%",
	left: "-20%",
	transform: "rotate(90deg)",
	borderRadius: "0",
};
const NORMAL_IMG_STYLE = { position: "absolute", top: 0, left: 0, width: "100%", height: "100%", borderRadius: "0" };

function CardImage({ src, alt, className = "" }) {
	const [isLandscape, setIsLandscape] = useState(false);
	const handleNaturalLoad = useCallback((w, h) => {
		if (w > h) setIsLandscape(true);
	}, []);
	return (
		<div
			className={`relative overflow-hidden ${className}`}
			style={{ aspectRatio: "5/7" }}>
			<LazyImage
				src={src}
				alt={alt}
				style={isLandscape ? CLIMAX_IMG_STYLE : NORMAL_IMG_STYLE}
				onNaturalLoad={handleNaturalLoad}
			/>
		</div>
	);
}

CardImage.propTypes = {
	src: PropTypes.string.isRequired,
	alt: PropTypes.string.isRequired,
	className: PropTypes.string,
};

// ── Range select (min / max dropdowns) ───────────────────────────────────────

function ValueListbox({ value, options, onChange, formatOption }) {
	return (
		<Listbox value={value} onChange={onChange}>
			<div className="relative flex-1 min-w-0">
				<Listbox.Button className="w-full border border-[var(--border)] rounded-lg px-3 py-2 pr-8 text-sm text-[var(--text)] bg-transparent focus:outline-none focus:border-[var(--text-muted)] transition-colors text-left cursor-pointer">
					{formatOption(value)}
					<ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--border)]" />
				</Listbox.Button>
				<Listbox.Options
					anchor={{ to: "bottom start", gap: 4 }}
					className="z-[9999] w-[var(--button-width)] border border-[var(--border)] rounded-xl bg-white shadow-lg max-h-56 overflow-auto">
					{options.map((o) => (
						<Listbox.Option
							key={o}
							value={o}
							className={({ active, selected }) =>
								`px-3 py-2 text-sm cursor-pointer transition-colors ${
									selected
										? "bg-[var(--text-muted)] text-white font-medium"
										: active
										? "bg-[var(--card-background)] text-[var(--text)]"
										: "text-[var(--text)]"
								}`
							}>
							{formatOption(o)}
						</Listbox.Option>
					))}
				</Listbox.Options>
			</div>
		</Listbox>
	);
}

ValueListbox.propTypes = {
	value: PropTypes.number.isRequired,
	options: PropTypes.arrayOf(PropTypes.number).isRequired,
	onChange: PropTypes.func.isRequired,
	formatOption: PropTypes.func.isRequired,
};

function RangeSelect({ value, options, onChange, formatOption }) {
	formatOption = formatOption ?? String;
	const [minVal, maxVal] = value;
	return (
		<div className="flex items-center gap-2 w-full">
			<ValueListbox
				value={minVal}
				options={options.filter((o) => o <= maxVal)}
				onChange={(v) => onChange([v, maxVal])}
				formatOption={formatOption}
			/>
			<span className="text-xs text-[var(--text-muted)] shrink-0">—</span>
			<ValueListbox
				value={maxVal}
				options={options.filter((o) => o >= minVal)}
				onChange={(v) => onChange([minVal, v])}
				formatOption={formatOption}
			/>
		</div>
	);
}

RangeSelect.propTypes = {
	value: PropTypes.arrayOf(PropTypes.number).isRequired,
	options: PropTypes.arrayOf(PropTypes.number).isRequired,
	onChange: PropTypes.func.isRequired,
	formatOption: PropTypes.func,
};

// ── Pagination ────────────────────────────────────────────────────────────────

function PaginationBar({ page, totalPages, onPageChange }) {
	const pages = [];
	if (totalPages <= 7) {
		for (let i = 1; i <= totalPages; i++) pages.push(i);
	} else {
		const left  = Math.max(2, page - 1);
		const right = Math.min(totalPages - 1, page + 1);
		pages.push(1);
		if (left > 2) pages.push("…");
		for (let i = left; i <= right; i++) pages.push(i);
		if (right < totalPages - 1) pages.push("…");
		pages.push(totalPages);
	}

	return (
		<div className="flex items-center justify-center gap-1 mt-8 flex-wrap">
			<button
				onClick={() => onPageChange(page - 1)}
				disabled={page <= 1}
				className="flex items-center px-3 py-2 rounded-lg border border-[var(--border)] text-sm font-bold text-[var(--text)] hover:bg-[var(--card-background)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
				<ChevronLeft size={14} />
			</button>
			{pages.map((p, i) =>
				p === "…" ? (
					<span key={`el-${i}`} className="px-2 text-sm text-[var(--text-muted)]">…</span>
				) : (
					<button
						key={p}
						onClick={() => onPageChange(p)}
						className={`w-9 h-9 rounded-lg text-sm font-bold transition-colors ${
							p === page
								? "bg-[var(--text)] text-[var(--background)]"
								: "border border-[var(--border)] text-[var(--text)] hover:bg-[var(--card-background)]"
						}`}>
						{p}
					</button>
				)
			)}
			<button
				onClick={() => onPageChange(page + 1)}
				disabled={page >= totalPages}
				className="flex items-center px-3 py-2 rounded-lg border border-[var(--border)] text-sm font-bold text-[var(--text)] hover:bg-[var(--card-background)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
				<ChevronRight size={14} />
			</button>
		</div>
	);
}

PaginationBar.propTypes = {
	page: PropTypes.number.isRequired,
	totalPages: PropTypes.number.isRequired,
	onPageChange: PropTypes.func.isRequired,
};

// ── Card detail modal ─────────────────────────────────────────────────────────

function CardDetailModal({ card, onClose, onRelatedCardClick }) {
	useEffect(() => {
		const handler = (e) => { if (e.key === "Escape") onClose(); };
		window.addEventListener("keydown", handler);
		return () => window.removeEventListener("keydown", handler);
	}, [onClose]);

	const colorMeta = COLOR_OPTIONS.find((c) => c.value === card.color);

	return (
		<div
			className="fixed inset-0 z-[9998] flex items-start justify-center bg-black/40 backdrop-blur-sm p-4 pt-16 overflow-y-auto"
			onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
			<div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden mb-8">
				<div className="px-5 py-4 bg-[var(--text-muted)] flex items-center justify-between">
					<div className="min-w-0 flex-1">
						<p className="font-bold text-base text-white truncate">{card.name}</p>
						<p className="text-xs text-white/70">{card.cardno}</p>
					</div>
					<button onClick={onClose} className="ml-3 shrink-0 text-white/70 hover:text-white transition-colors">
						<X size={18} />
					</button>
				</div>

				<div className="p-5 flex flex-col gap-4">
					<div className="flex gap-4">
						<div className="shrink-0 w-36">
							<LazyImage
								src={card.image_url}
								alt={card.name}
								style={{ height: "200px", minHeight: "200px", borderRadius: "8px", objectFit: "contain", backgroundColor: "transparent" }}
							/>
						</div>
						<div className="flex-1 flex flex-col gap-2 min-w-0">
							<div className="flex flex-wrap gap-1.5">
								{colorMeta && (
									<span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${colorMeta.pill}`}>{colorMeta.label}</span>
								)}
								{card.side && (
									<span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--card-background)] text-[var(--text-muted)]">
										{card.side === "w" ? "Weiß" : "Schwarz"}
									</span>
								)}
								{card.rarity && (
									<span className="text-[10px] font-bold px-2 py-0.5 rounded-full border border-[var(--border)] text-[var(--text-secondary)]">{card.rarity}</span>
								)}
								{card.card_type && (
									<span className="text-[10px] font-bold px-2 py-0.5 rounded-full border border-[var(--border)] text-[var(--text-secondary)]">{card.card_type}</span>
								)}
							</div>
							<div className="grid grid-cols-2 gap-1.5">
								{[
									{ label: "Level", value: card.level },
									{ label: "Cost",  value: card.cost },
									{ label: "Power", value: card.power != null ? card.power.toLocaleString() : "—" },
									{ label: "Soul",  value: card.soul },
								].map(({ label, value }) => (
									<div key={label} className="border border-[var(--border)] rounded-lg p-2 bg-[var(--card-background)]">
										<p className="text-[9px] font-black tracking-widest uppercase text-[var(--text-muted)]">{label}</p>
										<p className="text-sm font-bold text-[var(--text)]">{value ?? "—"}</p>
									</div>
								))}
							</div>
							{card.trigger?.length > 0 && (
								<div className="flex items-center gap-1.5">
									<span className="text-[9px] font-black tracking-widest uppercase text-[var(--text-muted)]">Trigger</span>
									<span className="text-xs font-medium text-[var(--text)] capitalize">{card.trigger.join(", ")}</span>
								</div>
							)}
							{card.feature && (
								<div>
									<p className="text-[9px] font-black tracking-widest uppercase text-[var(--text-muted)] mb-0.5">Traits</p>
									<p className="text-xs text-[var(--text)]">{card.feature}</p>
								</div>
							)}
						</div>
					</div>

					{card.product_name && (
						<div>
							<p className="text-[9px] font-black tracking-widest uppercase text-[var(--text-muted)] mb-0.5">Expansion</p>
							<p className="text-sm text-[var(--text)]">{card.product_name}</p>
						</div>
					)}
					{card.effect && (
						<div className="border border-[var(--border)] rounded-xl p-3">
							<p className="text-[9px] font-black tracking-widest uppercase text-[var(--text-muted)] mb-2">Ability Text</p>
							<p className="text-xs text-[var(--text)] whitespace-pre-line leading-relaxed">{card.effect}</p>
						</div>
					)}
					{card.flavor && (
						<div className="border border-[var(--border)] rounded-xl p-3 bg-[var(--card-background)]">
							<p className="text-[9px] font-black tracking-widest uppercase text-[var(--text-muted)] mb-1">Flavor</p>
							<p className="text-xs italic text-[var(--text-secondary)]">{card.flavor}</p>
						</div>
					)}
					{card.related_cards?.length > 0 && (
						<div>
							<p className="text-[9px] font-black tracking-widest uppercase text-[var(--text-muted)] mb-2">Related Cards</p>
							<div className="grid grid-cols-2 gap-2">
								{card.related_cards.map((rc) => (
									<button
										key={rc.cardno}
										onClick={() => onRelatedCardClick(rc)}
										className="flex items-center gap-2 p-2 border border-[var(--border)] rounded-lg hover:bg-[var(--card-background)] transition-colors text-left w-full">
										{rc.image_url && (
											<img src={rc.image_url} alt={rc.name} className="w-10 h-14 object-contain rounded shrink-0" />
										)}
										<div className="min-w-0">
											<p className="text-xs font-medium text-[var(--text)] truncate leading-tight">{rc.name}</p>
											<p className="text-[10px] text-[var(--text-muted)] mt-0.5">{rc.cardno}</p>
										</div>
									</button>
								))}
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}

CardDetailModal.propTypes = {
	card: PropTypes.object.isRequired,
	onClose: PropTypes.func.isRequired,
	onRelatedCardClick: PropTypes.func,
};

// ── Main page ─────────────────────────────────────────────────────────────────

const ENCardList = () => {
	const { t } = useLocale();

	// ── Options from API ──────────────────────────────────────────────────────
	const [options, setOptions] = useState({
		product_name: [], series_number: [], trigger: [], rarity: [],
		level: [], cost: [], power: [],
	});
	const [neostandardMap, setNeostandardMap] = useState({});

	// ── Draft filters (not yet submitted) ─────────────────────────────────────
	const [draft, setDraft]               = useState(EMPTY_DRAFT);
	const [draftNeostandard, setDraftNeostandard] = useState("");
	const [draftSoul, setDraftSoul]       = useState(false);
	const [levelRange, setLevelRange]     = useState([0, 3]);
	const [costRange, setCostRange]       = useState([0, 4]);
	const [powerRange, setPowerRange]     = useState(null); // set once options load

	// ── Submitted snapshot (for pagination re-fetch) ──────────────────────────
	const lastSearchRef = useRef(null);

	// ── Results ───────────────────────────────────────────────────────────────
	const [hasSearched, setHasSearched]   = useState(false);
	const [cards, setCards]               = useState([]);
	const [total, setTotal]               = useState(0);
	const [page, setPage]                 = useState(1);
	const [loading, setLoading]           = useState(false);
	const [fetchError, setFetchError]     = useState(false);

	// ── UI ────────────────────────────────────────────────────────────────────
	const [selectedCard, setSelectedCard]         = useState(null);
	const [filtersOpen, setFiltersOpen]           = useState(true);
	const [variantIdx, setVariantIdx]             = useState({});

	// ── Derived valid values ──────────────────────────────────────────────────
	const validLevels = useMemo(() => (options.level ?? []).map(Number).sort((a, b) => a - b), [options.level]);
	const validCosts  = useMemo(() => (options.cost  ?? []).map(Number).sort((a, b) => a - b), [options.cost]);
	const validPowers = useMemo(() => (options.power ?? []).map(Number).sort((a, b) => a - b), [options.power]);

	const maxLevel = validLevels.length > 0 ? validLevels[validLevels.length - 1] : 3;
	const maxCost  = validCosts.length  > 0 ? validCosts[validCosts.length - 1]   : 4;

	// ── Load options once ─────────────────────────────────────────────────────
	useEffect(() => {
		apiRequest("/api/options/en/filter-option")
			.then((r) => r.json())
			.then((data) => {
				setOptions({
					product_name:  (data.product_name  ?? []).slice().sort(),
					series_number: (data.series_number ?? []).slice().sort(),
					trigger:       (data.trigger       ?? []).slice().sort(),
					rarity:        (data.rarity        ?? []).filter((v) => v !== "-").slice().sort(),
					level:         data.level  ?? [],
					cost:          data.cost   ?? [],
					power:         data.power  ?? [],
				});
				setNeostandardMap(data.neostandard_map ?? {});
			})
			.catch(console.error);
	}, []);

	// Initialise powerRange once validPowers is available
	useEffect(() => {
		if (validPowers.length > 0 && powerRange === null) {
			setPowerRange([validPowers[0], validPowers[validPowers.length - 1]]);
		}
	}, [validPowers.length, powerRange]);

	// Also widen levelRange/costRange if options show a larger max
	useEffect(() => {
		if (maxLevel > 3) setLevelRange((prev) => [prev[0], maxLevel]);
	}, [maxLevel]);
	useEffect(() => {
		if (maxCost > 4) setCostRange((prev) => [prev[0], maxCost]);
	}, [maxCost]);

	// ── Core fetch ─────────────────────────────────────────────────────────────
	const fetchCards = useCallback(async (searchParams, pg) => {
		setLoading(true);
		setFetchError(false);
		try {
			searchParams.set("page", pg);
			searchParams.set("pageSize", PAGE_SIZE);
			const res  = await apiRequest(`/api/cards/en?${searchParams.toString()}`);
			const data = await res.json();
			setCards(data.data  ?? []);
			setTotal(data.total ?? 0);
		} catch (err) {
			console.error("EN card fetch failed:", err);
			setCards([]);
			setFetchError(true);
		} finally {
			setLoading(false);
		}
	}, []);

	// ── Build URLSearchParams from current draft state ─────────────────────────
	const buildParams = useCallback((d, neo, soul, lr, cr, pr) => {
		const params = new URLSearchParams();
		Object.entries(d).forEach(([k, v]) => { if (v !== "") params.set(k, v); });
		if (neo) {
			const codes = neostandardMap[neo];
			if (codes?.length) params.set("series_number", codes.join(","));
		}
		if (soul) params.set("soul_min", "1");

		const [lMin, lMax] = lr;
		if (lMin > 0)        params.set("level_min", lMin);
		if (lMax < maxLevel) params.set("level_max", lMax);

		const [cMin, cMax] = cr;
		if (cMin > 0)       params.set("cost_min", cMin);
		if (cMax < maxCost) params.set("cost_max", cMax);

		if (pr && validPowers.length > 0) {
			const [pMin, pMax] = pr;
			if (pMin > validPowers[0])                        params.set("power_min", pMin);
			if (pMax < validPowers[validPowers.length - 1])   params.set("power_max", pMax);
		}
		return params;
	}, [maxLevel, maxCost, validPowers]);

	// ── Search / Reset ─────────────────────────────────────────────────────────
	const handleSearch = useCallback(() => {
		const pr = powerRange ?? (validPowers.length > 0 ? [validPowers[0], validPowers[validPowers.length - 1]] : null);
		const snapshot = { d: draft, neo: draftNeostandard, soul: draftSoul, lr: levelRange, cr: costRange, pr };
		lastSearchRef.current = snapshot;
		const params = buildParams(draft, draftNeostandard, draftSoul, levelRange, costRange, pr);
		setPage(1);
		setHasSearched(true);
		setFiltersOpen(false);
		window.scrollTo({ top: 0, behavior: "smooth" });
		fetchCards(new URLSearchParams(params), 1);
	}, [draft, draftNeostandard, draftSoul, levelRange, costRange, powerRange, validPowers, buildParams, fetchCards]);

	const handleReset = useCallback(() => {
		const fullPr = validPowers.length > 0 ? [validPowers[0], validPowers[validPowers.length - 1]] : null;
		setDraft(EMPTY_DRAFT);
		setDraftNeostandard("");
		setDraftSoul(false);
		setLevelRange([0, maxLevel]);
		setCostRange([0, maxCost]);
		setPowerRange(fullPr);
		lastSearchRef.current = null;
		setHasSearched(false);
		setCards([]);
		setTotal(0);
		setPage(1);
		setFiltersOpen(true);
	}, [validPowers, maxLevel, maxCost]);

	// ── Pagination ─────────────────────────────────────────────────────────────
	const handlePageChange = useCallback((pg) => {
		if (!lastSearchRef.current) return;
		const { d, neo, soul, lr, cr, pr } = lastSearchRef.current;
		const params = buildParams(d, neo, soul, lr, cr, pr);
		setPage(pg);
		fetchCards(new URLSearchParams(params), pg);
		window.scrollTo({ top: 0, behavior: "smooth" });
	}, [buildParams, fetchCards]);

	// ── Variant grouping ───────────────────────────────────────────────────────
	const cardGroups = useMemo(() => {
		const map   = new Map();
		const order = [];
		cards.forEach((c) => {
			const base = extractBaseCardNo(c.cardno) ?? c.cardno;
			if (!map.has(base)) {
				map.set(base, { key: base, variants: [] });
				order.push(base);
			}
			map.get(base).variants.push(c);
		});
		return order.map((k) => {
			const group = map.get(k);
			// Base card (cardno === base) first; rest in original order
			group.variants.sort((a, b) => {
				const aBase = a.cardno?.trim() === k;
				const bBase = b.cardno?.trim() === k;
				return aBase === bBase ? 0 : aBase ? -1 : 1;
			});
			return group;
		});
	}, [cards]);

	// Reset per-card variant index whenever the result set changes
	useEffect(() => { setVariantIdx({}); }, [cards]);

	const selectVariant = useCallback((key, i) => {
		setVariantIdx((prev) => ({ ...prev, [key]: i }));
	}, []);

	const totalPages       = Math.ceil(total / PAGE_SIZE);
	const activeCount = (
		Object.values(draft).filter((v) => v !== "").length
		+ (draftSoul ? 1 : 0)
		+ (levelRange[0] > 0 || levelRange[1] < maxLevel ? 1 : 0)
		+ (costRange[0] > 0  || costRange[1] < maxCost   ? 1 : 0)
		+ (powerRange && validPowers.length > 0 && (powerRange[0] > validPowers[0] || powerRange[1] < validPowers[validPowers.length - 1]) ? 1 : 0)
	);

	return (
		<div className="max-w-5xl mx-auto px-4 sm:px-6 pb-8 sm:py-10">
			{/* Title */}
			<div className="mb-6">
				<h1 className="text-3xl sm:text-4xl font-black tracking-tight text-[var(--text)] leading-none mb-1">
					{t("enCardList.title")}
				</h1>
				<p className="text-sm text-[var(--text-secondary)]">{t("enCardList.subtitle")}</p>
			</div>

			{/* ── Filter panel ───────────────────────────────────────────── */}
			<div className="border border-[var(--border)] rounded-2xl overflow-hidden bg-white/70 backdrop-blur-md mb-5">
				{/* Header */}
				<button
					onClick={() => setFiltersOpen((o) => !o)}
					className="w-full px-5 py-3.5 flex items-center justify-between text-left">
					<div className="flex items-center gap-2">
						<SlidersHorizontal size={14} className="text-[var(--text-muted)]" />
						<span className="text-[11px] font-black tracking-widest uppercase text-[var(--text-secondary)]">
							{t("enCardList.filters")}
						</span>
						{activeCount > 0 && (
							<span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--text-muted)] text-white">
								{activeCount}
							</span>
						)}
					</div>
					<ChevronDown
						size={14}
						className={`text-[var(--text-muted)] transition-transform duration-200 ${filtersOpen ? "rotate-180" : ""}`}
					/>
				</button>

				<div className={`grid transition-all duration-300 ease-in-out ${filtersOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
				<div className="overflow-hidden">
					<div className="px-5 pb-5 border-t border-[var(--border)] pt-4 flex flex-col gap-3">

						{/* Row 1: Search keyword */}
						<div>
							<label className="text-[10px] font-black tracking-widest uppercase text-[var(--text-secondary)] mb-1 block">
								{t("enCardList.search")}
							</label>
							<div className="relative">
								<Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
								<input
									value={draft.search}
									onChange={(e) => setDraft((p) => ({ ...p, search: e.target.value }))}
									onKeyDown={(e) => e.key === "Enter" && handleSearch()}
									placeholder={t("enCardList.searchPlaceholder")}
									className="w-full bg-transparent border border-[var(--border)] rounded-lg pl-8 pr-3 py-2 text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--text-muted)] transition-colors"
								/>
							</div>
						</div>

						{/* Row 2: Product */}
						<div>
							<label className="text-[10px] font-black tracking-widest uppercase text-[var(--text-secondary)] mb-1 block">
								{t("enCardList.product")}
							</label>
							<FilterCombobox
								value={draft.product_name}
								onChange={(v) => setDraft((p) => ({ ...p, product_name: v ?? "" }))}
								options={options.product_name}
								placeholder="Product name"
							/>
						</div>

						{/* Row 3: Neostandard Title + Series Number */}
						<div className="grid grid-cols-2 gap-3">
							<div>
								<label className="text-[10px] font-black tracking-widest uppercase text-[var(--text-secondary)] mb-1 block">
									{t("enCardList.series")}
								</label>
								<FilterCombobox
									value={draftNeostandard}
									onChange={(v) => setDraftNeostandard(v ?? "")}
									options={Object.keys(neostandardMap)}
									placeholder="Title / Series"
								/>
							</div>
							<div>
								<label className="text-[10px] font-black tracking-widest uppercase text-[var(--text-secondary)] mb-1 block">
									{t("enCardList.seriesNumber")}
								</label>
								<FilterCombobox
									value={draft.series_number}
									onChange={(v) => setDraft((p) => ({ ...p, series_number: v ?? "" }))}
									options={options.series_number}
									placeholder="e.g. SAO"
								/>
							</div>
						</div>

						{/* Row 4: Trigger + Rarity */}
						<div className="grid grid-cols-2 gap-3">
							<div>
								<label className="text-[10px] font-black tracking-widest uppercase text-[var(--text-secondary)] mb-1 block">
									{t("enCardList.trigger")}
								</label>
								<FilterCombobox
									value={draft.trigger}
									onChange={(v) => setDraft((p) => ({ ...p, trigger: v ?? "" }))}
									options={options.trigger}
									placeholder="Trigger type"
								/>
							</div>
							<div>
								<label className="text-[10px] font-black tracking-widest uppercase text-[var(--text-secondary)] mb-1 block">
									{t("enCardList.rarity")}
								</label>
								<FilterCombobox
									value={draft.rarity}
									onChange={(v) => setDraft((p) => ({ ...p, rarity: v ?? "" }))}
									options={options.rarity}
									placeholder="Rarity"
								/>
							</div>
						</div>

						{/* Row 5: Card Type + Soul + Color + Side */}
						<div className="flex flex-wrap items-start gap-x-6 gap-y-3">
							<div>
								<p className="text-[10px] font-black tracking-widest uppercase text-[var(--text-secondary)] mb-1.5">{t("enCardList.cardType")}</p>
								<div className="flex gap-1.5">
									{CARD_TYPE_OPTIONS.map((type) => (
										<button
											key={type}
											onClick={() => setDraft((p) => ({ ...p, card_type: p.card_type === type ? "" : type }))}
											className={`text-xs font-bold px-3 py-1.5 rounded-full border transition-all ${
												draft.card_type === type
													? "bg-[var(--text-muted)] text-white border-[var(--text-muted)]"
													: "border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--text-muted)] hover:text-[var(--text)]"
											}`}>
											{type}
										</button>
									))}
								</div>
							</div>
							<div>
								<p className="text-[10px] font-black tracking-widest uppercase text-[var(--text-secondary)] mb-1.5">{t("enCardList.soul")}</p>
								<button
									onClick={() => setDraftSoul((s) => !s)}
									className={`text-xs font-bold px-3 py-1.5 rounded-full border transition-all ${
										draftSoul
											? "bg-[var(--text-muted)] text-white border-[var(--text-muted)]"
											: "border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--text-muted)] hover:text-[var(--text)]"
									}`}>
									{t("enCardList.hasSoul")}
								</button>
							</div>
							<div>
								<p className="text-[10px] font-black tracking-widest uppercase text-[var(--text-secondary)] mb-1.5">{t("enCardList.color")}</p>
								<div className="flex gap-2">
									{COLOR_OPTIONS.map(({ value, label, dot }) => (
										<button
											key={value}
											title={label}
											onClick={() => setDraft((p) => ({ ...p, color: p.color === value ? "" : value }))}
											className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all ${dot} ${
												draft.color === value
													? "border-[var(--text)] scale-110 shadow-sm"
													: "border-transparent opacity-50 hover:opacity-90 hover:scale-105"
											}`}>
											<span className="text-[9px] font-black text-white drop-shadow">{label[0]}</span>
										</button>
									))}
								</div>
							</div>
							<div>
								<p className="text-[10px] font-black tracking-widest uppercase text-[var(--text-secondary)] mb-1.5">{t("enCardList.side")}</p>
								<div className="inline-flex border border-[var(--border)] rounded-lg overflow-hidden">
									{SIDE_OPTIONS.map(({ value, label }) => (
										<button
											key={value}
											onClick={() => setDraft((p) => ({ ...p, side: value }))}
											className={`px-3 py-1.5 text-xs font-bold border-r border-[var(--border)] last:border-r-0 transition-colors ${
												draft.side === value
													? "bg-[var(--text)] text-[var(--background)]"
													: "bg-transparent text-[var(--text)] hover:bg-[var(--card-background)]"
											}`}>
											{label}
										</button>
									))}
								</div>
							</div>
						</div>

						{/* Row 6–8: Level / Cost / Power — each on its own row */}
						{[
							{ label: "Level", content: validLevels.length > 0
								? <RangeSelect value={levelRange} options={validLevels} onChange={setLevelRange} />
								: null },
							{ label: "Cost", content: validCosts.length > 0
								? <RangeSelect value={costRange} options={validCosts} onChange={setCostRange} />
								: null },
							{ label: "Power", content: validPowers.length > 0 && powerRange !== null
								? <RangeSelect value={powerRange} options={validPowers} onChange={setPowerRange} formatOption={(v) => v.toLocaleString()} />
								: null },
						].map(({ label, content }) => (
							<div key={label} className="flex items-center gap-4">
								<p className="text-[10px] font-black tracking-widest uppercase text-[var(--text-secondary)] w-10 shrink-0">{label}</p>
								<div className="flex-1">{content ?? <p className="text-xs text-[var(--text-muted)]">Loading…</p>}</div>
							</div>
						))}

						{/* Buttons */}
						<div className="flex items-center justify-center gap-3 pt-2 border-t border-[var(--border)]">
							<button
								onClick={handleSearch}
								className="px-8 py-2 rounded-xl bg-[var(--text-muted)] text-white text-sm font-bold hover:bg-[var(--text-secondary)] active:scale-95 transition-all shadow-sm">
								{t("enCardList.searchButton")}
							</button>
							<button
								onClick={handleReset}
								className="px-8 py-2 rounded-xl bg-[var(--reset,#b91c1c)] text-white text-sm font-bold hover:opacity-90 active:scale-95 transition-all shadow-sm">
								{t("enCardList.resetButton")}
							</button>
						</div>
					</div>
				</div>
				</div>
			</div>

{/* ── Results bar ────────────────────────────────────────────── */}
			{hasSearched && (
				<div className="flex items-center justify-between mb-4 px-1">
					<span className="text-sm text-[var(--text-secondary)]">
						{loading
							? t("enCardList.loading")
							: t("enCardList.results", { total, page, totalPages: totalPages || 1 })}
					</span>
				</div>
			)}

			{/* ── Card grid ──────────────────────────────────────────────── */}
			{loading ? (
				<div className="grid grid-cols-3 sm:grid-cols-5 gap-2 sm:gap-3">
					{Array.from({ length: 15 }).map((_, i) => (
						<div key={i} className="flex flex-col overflow-hidden rounded-xl shadow-sm">
							<div className="w-full bg-[var(--card-background)] animate-pulse" style={{ aspectRatio: "5/7" }} />
							<div className="px-2 py-1.5 bg-white flex flex-col gap-1">
								<div className="h-2.5 rounded bg-[var(--card-background)] animate-pulse w-3/4" />
								<div className="h-2 rounded bg-[var(--card-background)] animate-pulse w-1/3" />
							</div>
						</div>
					))}
				</div>
			) : fetchError ? (
				<div className="text-center py-16 border border-[var(--border)] rounded-2xl bg-white/70 backdrop-blur-md">
					<p className="text-base font-bold text-[var(--text)] mb-1">{t("enCardList.errorTitle")}</p>
					<p className="text-sm text-[var(--text-secondary)]">{t("enCardList.errorHint")}</p>
				</div>
			) : hasSearched && cards.length === 0 ? (
				<div className="text-center py-16 border border-[var(--border)] rounded-2xl bg-white/70 backdrop-blur-md">
					<p className="text-base font-bold text-[var(--text)] mb-1">{t("enCardList.noResults")}</p>
					<p className="text-sm text-[var(--text-secondary)]">{t("enCardList.noResultsHint")}</p>
				</div>
			) : hasSearched ? (
				<div className="grid grid-cols-3 sm:grid-cols-5 gap-2 sm:gap-3">
					{cardGroups.map(({ key, variants }) => {
						const idx  = variantIdx[key] ?? 0;
						const card = variants[idx];
						return (
						<div
								key={key}
								onClick={() => setSelectedCard(card)}
								className="group flex flex-col overflow-hidden rounded-xl shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-200 cursor-pointer">
								{/* Card image — climax rotated 90° to fill portrait container */}
								<CardImage
									src={card.image_url}
									alt={card.name}
									className="w-full"
								/>
								{/* Info strip */}
								<div className="px-2 py-1.5 bg-white flex flex-col gap-1">
									<p className="text-[10px] font-bold text-[var(--text)] leading-tight line-clamp-1">{card.name}</p>
									{variants.length > 1 ? (
										<div className="flex flex-wrap gap-0.5">
											{variants.map((v, i) => (
												<button
													key={v.cardno ?? i}
													onClick={(e) => { e.stopPropagation(); selectVariant(key, i); }}
													className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full transition-colors ${
														i === idx
															? "bg-[var(--text-muted)] text-white"
															: "bg-[var(--card-background)] text-[var(--text-muted)] hover:bg-[var(--border)]"
													}`}>
													{v.rarity ?? "?"}
												</button>
											))}
										</div>
									) : (
										card.rarity && (
											<span className="text-[9px] text-[var(--text-muted)]">{card.rarity}</span>
										)
									)}
								</div>
							</div>
						);
					})}
				</div>
			) : null}

			{/* ── Pagination ─────────────────────────────────────────────── */}
			{hasSearched && totalPages > 1 && !loading && (
				<PaginationBar page={page} totalPages={totalPages} onPageChange={handlePageChange} />
			)}

			{/* ── Scroll to top ───────────────────────────────────────────── */}
			{hasSearched && cards.length > 0 && !loading && (
				<button
					onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
					className="fixed bottom-6 right-6 z-50 w-10 h-10 rounded-full bg-[var(--text-muted)] text-white shadow-lg flex items-center justify-center hover:scale-110 active:scale-95 transition-transform">
					<ChevronUp size={18} />
				</button>
			)}

			{/* ── Card detail modal ───────────────────────────────────────── */}
			{selectedCard && (
				<CardDetailModal card={selectedCard} onClose={() => setSelectedCard(null)} onRelatedCardClick={setSelectedCard} />
			)}
		</div>
	);
};

export default ENCardList;
