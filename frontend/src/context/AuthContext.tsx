import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  ReactNode,
} from "react";
import * as SecureStore from "expo-secure-store";
import client, {
  setAuthToken,
  clearAuthToken,
  initializeAuthToken,
} from "../api/client";

interface User {
  _id: string;
  name: string;
  email: string;
  token: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check ongoing session
  useEffect(() => {
    const loadUser = async () => {
      try {
        // Initialize token cache from SecureStore
        await initializeAuthToken();

        const storedUser = await SecureStore.getItemAsync("userData");

        if (storedUser) {
          // Optional: Validate token with backend /me endpoint here
          setUser(JSON.parse(storedUser));
        }
      } catch (e) {
        console.error("Failed to load user", e);
      } finally {
        setIsLoading(false);
      }
    };

    loadUser();
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      // Use relative path, client has baseURL
      // NOTE: Our backend userRoutes is mapped to /api/users
      const { data } = await client.post("/users/login", { email, password });

      setUser(data);
      await setAuthToken(data.token); // Updates both cache and SecureStore
      await SecureStore.setItemAsync("userData", JSON.stringify(data));
    } catch (error: any) {
      console.error("Login failed", error.response?.data || error.message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (name: string, email: string, password: string) => {
    setIsLoading(true);
    try {
      const { data } = await client.post("/users", { name, email, password });

      setUser(data);
      await setAuthToken(data.token); // Updates both cache and SecureStore
      await SecureStore.setItemAsync("userData", JSON.stringify(data));
    } catch (error: any) {
      console.error("Register failed", error.response?.data || error.message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await clearAuthToken(); // Clears both cache and SecureStore
      await SecureStore.deleteItemAsync("userData");
      setUser(null);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteAccount = async () => {
    setIsLoading(true);
    try {
      await client.delete("/users/me");
      await logout();
    } catch (error: any) {
      console.error(
        "Delete account failed",
        error.response?.data || error.message
      );
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, isLoading, login, register, logout, deleteAccount }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
