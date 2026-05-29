/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useEffect, useState } from "react";
import PropTypes from "prop-types";
import { apiRequest } from "../utils/api";

const EMPTY_PRODUCT_LIST = {};
const EMPTY_TRANSLATION_MAP = {};
const EMPTY_NEOSTANDARD_MAP = {};

const OptionsContext = createContext({
	productList: EMPTY_PRODUCT_LIST,
	enProductList: EMPTY_PRODUCT_LIST,
	neostandardMap: EMPTY_NEOSTANDARD_MAP,
	jpNeostandardMap: EMPTY_NEOSTANDARD_MAP,
	translationMap: EMPTY_TRANSLATION_MAP,
	optionsLoading: true,
	optionsError: null,
});

const INITIAL_STATE = {
	productList: EMPTY_PRODUCT_LIST,
	enProductList: EMPTY_PRODUCT_LIST,
	neostandardMap: EMPTY_NEOSTANDARD_MAP,
	jpNeostandardMap: EMPTY_NEOSTANDARD_MAP,
	translationMap: EMPTY_TRANSLATION_MAP,
};

export const OptionsProvider = ({ children }) => {
	const [productList, setProductList] = useState(INITIAL_STATE.productList);
	const [enProductList, setEnProductList] = useState(INITIAL_STATE.enProductList);
	const [neostandardMap, setNeostandardMap] = useState(INITIAL_STATE.neostandardMap);
	const [jpNeostandardMap, setJpNeostandardMap] = useState(INITIAL_STATE.jpNeostandardMap);
	const [translationMap, setTranslationMap] = useState(INITIAL_STATE.translationMap);
	const [optionsLoading, setOptionsLoading] = useState(true);
	const [optionsError, setOptionsError] = useState(null);

	useEffect(() => {
		let active = true;
		const fetchOptions = async () => {
			setOptionsLoading(true);
			setOptionsError(null);
			try {
				const [remoteProductList, remoteTranslations, remoteEnProductList] = await Promise.all([
					apiRequest("/api/options/jp/filter-option").then((res) => res.json()),
					apiRequest("/api/options/jp/translations").then((res) => res.json()),
					apiRequest("/api/options/en/filter-option").then((res) => res.json()),
				]);

				if (!active) return;
				setProductList(remoteProductList ?? EMPTY_PRODUCT_LIST);
				setEnProductList(remoteEnProductList ?? EMPTY_PRODUCT_LIST);
				setNeostandardMap(remoteEnProductList?.neostandard_map ?? EMPTY_NEOSTANDARD_MAP);
				setJpNeostandardMap(remoteProductList?.neostandard_map ?? EMPTY_NEOSTANDARD_MAP);
				setTranslationMap(remoteTranslations ?? EMPTY_TRANSLATION_MAP);
			} catch (err) {
				if (!active) return;
				console.error("加载后台选项数据失败", err);
				setOptionsError(err.message || "加载下拉数据失败");
			} finally {
				if (active) setOptionsLoading(false);
			}
		};

		fetchOptions();
		return () => {
			active = false;
		};
	}, []);

	return (
		<OptionsContext.Provider
			value={{ productList, enProductList, neostandardMap, jpNeostandardMap, translationMap, optionsLoading, optionsError }}>
			{children}
		</OptionsContext.Provider>
	);
};

OptionsProvider.propTypes = {
	children: PropTypes.node.isRequired,
};

export const useOptions = () => useContext(OptionsContext);

export default OptionsContext;
