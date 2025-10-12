import React from "react";
import { useLocale } from "../contexts/LocaleContext";

function Tracker() {
	const { t } = useLocale();
	return <h2>{t("pages.tracker.title")}</h2>;
}

export default Tracker;
