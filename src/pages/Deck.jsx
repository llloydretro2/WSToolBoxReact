import React, { useState } from "react";
import { Tabs, Tab, Box } from "@mui/material";
import DeckCreate from "./DeckCreate";
import DeckSearch from "./DeckSearch";

function DeckPage() {
	const [tabIndex, setTabIndex] = useState(0);

	const handleTabChange = (event, newValue) => {
		setTabIndex(newValue);
	};

	return (
		<Box sx={{ width: "100%", mt: 4 }}>
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
					label="创建卡组"
					sx={{
						color: "gray",
						"&.Mui-selected": {
							color: "#a6ceb6",
							fontWeight: "bold",
						},
					}}
				/>
				<Tab
					label="查询卡组"
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
