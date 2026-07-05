import api from "./api";

export const userService = {
  getLoyaltyInfo: async () => {
    const response = await api.get("/api/users/loyalty");
    return response.data;
  },
};
