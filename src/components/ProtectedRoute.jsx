import React from "react";
import PropTypes from "prop-types";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function ProtectedRoute({ children }) {
	const { isAuthenticated } = useAuth();
	const location = useLocation();

	if (!isAuthenticated()) {
		return (
			<Navigate
				to="/login"
				replace
				state={{ from: location, fromProtectedRoute: true }}
			/>
		);
	}

	return children;
}

ProtectedRoute.propTypes = {
	children: PropTypes.node.isRequired,
};
