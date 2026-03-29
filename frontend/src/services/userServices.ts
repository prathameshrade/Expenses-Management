/**
 * User Service
 */

import apiClient from "./api";
import { User, ApiResponse } from "../types";

class UserService {
  async listUsers() {
    const response = await apiClient.get<ApiResponse<User[]>>("/api/v1/users/");
    return response.data.data || [];
  }

  async getUser(userId: number) {
    const response = await apiClient.get<ApiResponse<User>>(`/api/v1/users/${userId}`);
    return response.data.data;
  }

  async createUser(userData: any) {
    const response = await apiClient.post<ApiResponse<User>>("/api/v1/users/", userData);
    return response.data.data;
  }

  async updateUser(userId: number, updateData: any) {
    const response = await apiClient.put<ApiResponse<User>>(
      `/api/v1/users/${userId}`,
      updateData
    );
    return response.data.data;
  }

  async deleteUser(userId: number) {
    const response = await apiClient.delete(`/api/v1/users/${userId}`);
    return response.data;
  }

  async deactivateUser(userId: number) {
    const response = await apiClient.post(`/api/v1/users/${userId}/deactivate`, {});
    return response.data;
  }
}

export default new UserService();