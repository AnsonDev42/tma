import axios from "axios";
import { createContext } from "react";
import { ReactNode, useContext, useEffect, useState } from "react";
import { useSession } from "./SessionContext";

interface UserInfo {
	role: string;
	daily_limit: number;
	remaining_accesses: number;
}

interface UserInfoContextProps {
	userInfo: UserInfo | null;
	setUserInfo: (userInfo: UserInfo | null) => void;
}

export const UserInfoContext = createContext<UserInfoContextProps | undefined>(
	undefined,
);

export const UserInfoProvider = ({ children }: { children: ReactNode }) => {
	const { session } = useSession();
	const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const fetchUserInfo = async () => {
			if (session) {
				try {
					const response = await axios.get(`${__API_URL__}/user-info`, {
						headers: { Authorization: `Bearer ${session?.access_token}` },
					});
					setUserInfo(response.data);
					// return response.data;
				} catch (error) {
					console.error("Error fetching user info:", error);
				}
			} else {
				setUserInfo(null);
			}
			setLoading(false);
		};

		fetchUserInfo();
	}, [session]);

	if (loading) {
		return <div>Loading user info...</div>;
	}

	return (
		<UserInfoContext.Provider value={{ userInfo, setUserInfo }}>
			{children}
		</UserInfoContext.Provider>
	);
};

export const useUserInfo = () => {
	const context = useContext(UserInfoContext);
	if (context === undefined) {
		throw new Error("useUserInfo must be used within a UserInfoProvider");
	}
	return context;
};
