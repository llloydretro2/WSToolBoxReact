import React, { useState } from "react";
import { Tabs, Tab, Box } from "@mui/material";
import { useLocale } from "../contexts/LocaleContext";
import DeckCreate from "./DeckCreate";
import DeckSearch from "./DeckSearch";

// TODO: 更改系列筛选，需要查看neo-standard确定包含的系列
// TODO: 前端路由需要更改，现在的路由方式太奇怪

function DeckPage() {
	const { t } = useLocale();
	const [tabIndex, setTabIndex] = useState(0);

	const handleTabChange = (event, newValue) => {
		setTabIndex(newValue);
	};

	return (
		<Box sx={{ width: "100%" }}>
			<Tabs
				value={tabIndex}
				onChange={handleTabChange}
				centered
				slotProps={{
					indicator: {
						style: {
							backgroundColor: "#a6ceb6",
						},
					},
				}}>
				<Tab
					label={t("pages.deck.createTab")}
					sx={{
						color: "gray",
						"&.Mui-selected": {
							color: "#a6ceb6",
							fontWeight: "bold",
						},
					}}
				/>
				<Tab
					label={t("pages.deck.searchTab")}
					sx={{
						color: "gray",
						"&.Mui-selected": {
							color: "#a6ceb6",
							fontWeight: "bold",
						},
					}}
				/>
			</Tabs>

			<Box sx={{ p: 2 }}>
				<div hidden={tabIndex !== 0}>
					<DeckCreate />
				</div>
				<div hidden={tabIndex !== 1}>
					<DeckSearch />
				</div>
			</Box>
		</Box>
	);
}

export default DeckPage;
