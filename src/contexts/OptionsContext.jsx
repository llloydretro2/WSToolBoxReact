/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useEffect, useState } from "react";
import PropTypes from "prop-types";
import localProductList from "../data/productList.json";
import localTranslations from "../data/filter_translations.json";
import localDeckRulesWeiss from "../data/deck_rules_weiss.json";
import localDeckRulesSchwarz from "../data/deck_rules_schwarz.json";
import { apiRequest } from "../utils/api";

const OptionsContext = createContext({
	productList: localProductList,
	translationMap: localTranslations,
	deckRules: {
		weiss: localDeckRulesWeiss.title_categories || [],
		schwarz: localDeckRulesSchwarz.title_categories || [],
	},
	optionsLoading: false,
	optionsError: null,
});

const INITIAL_STATE = {
	productList: localProductList,
	translationMap: localTranslations,
	deckRules: {
		weiss: localDeckRulesWeiss.title_categories || [],
		schwarz: localDeckRulesSchwarz.title_categories || [],
	},
};

export const OptionsProvider = ({ children }) => {
	const [productList, setProductList] = useState(INITIAL_STATE.productList);
	const [translationMap, setTranslationMap] = useState(INITIAL_STATE.translationMap);
	const [deckRules, setDeckRules] = useState(INITIAL_STATE.deckRules);
	const [optionsLoading, setOptionsLoading] = useState(false);
	const [optionsError, setOptionsError] = useState(null);

	useEffect(() => {
		let active = true;
		const fetchOptions = async () => {
			setOptionsLoading(true);
			setOptionsError(null);
			try {
				const [remoteProductList, remoteTranslations, weissRules, schwarzRules] = await Promise.all([
					apiRequest("/api/options/product-list").then((res) => res.json()),
					apiRequest("/api/options/translations").then((res) => res.json()),
					apiRequest("/api/options/deck-rules?side=weiss").then((res) => res.json()),
					apiRequest("/api/options/deck-rules?side=schwarz").then((res) => res.json()),
				]);

				if (!active) return;
				setProductList(remoteProductList || INITIAL_STATE.productList);
				setTranslationMap(remoteTranslations || INITIAL_STATE.translationMap);
				setDeckRules({
					weiss: weissRules?.title_categories || INITIAL_STATE.deckRules.weiss,
					schwarz: schwarzRules?.title_categories || INITIAL_STATE.deckRules.schwarz,
				});
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
			value={{ productList, translationMap, deckRules, optionsLoading, optionsError }}>
			{children}
		</OptionsContext.Provider>
	);
};

OptionsProvider.propTypes = {
	children: PropTypes.node.isRequired,
};

export const useOptions = () => useContext(OptionsContext);

export default OptionsContext;
