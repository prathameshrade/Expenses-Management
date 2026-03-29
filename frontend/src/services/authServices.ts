import api from './api';
import { LoginRequest, LoginResponse, SignupRequest, SignupResponse } from '../types/auth';
import { ApiResponse } from '../types/api';

const authService = {
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const response = await api.post<ApiResponse<LoginResponse>>('/auth/login', credentials);
    return response.data.data!;
  },

  async signup(data: SignupRequest): Promise<SignupResponse> {
    const response = await api.post<ApiResponse<SignupResponse>>('/auth/signup', data);
    return response.data.data!;
  },
};

export default authService;