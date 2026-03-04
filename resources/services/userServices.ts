export interface User {
    id: number;
    name: string;
    email: string;
    phone?: string;
    role: 'admin' | 'staff';
    status: 'active' | 'inactive' | 'suspended';
    last_activity?: string;
    created_at: string;
    updated_at: string;
}

export interface UserStats {
    total_users: number;
    active_users: number;
    inactive_users: number;
    suspended_users: number;
    admin_users: number;
    staff_users: number;
}

export interface ApiResponse<T> {
    success: boolean;
    data: T;
    message?: string;
    errors?: Record<string, unknown>;
}

export interface PaginationData {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
}

export interface UserFormData {
    name: string;
    email: string;
    phone?: string;
    role: 'admin' | 'staff';
    status?: 'active' | 'inactive' | 'suspended'; // DEFENSE MINUTES FIX: Optional for create, required for update
    password?: string;
    password_confirmation?: string;
}

export interface UsersResponse extends ApiResponse<User[]> {
    pagination: PaginationData;
}

class UserService {
    private baseURL = '/api/users';

    private async request<T>(url: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
        const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
        
        const defaultOptions: RequestInit = {
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'X-CSRF-TOKEN': csrfToken || '',
                'X-Requested-With': 'XMLHttpRequest',
                ...options.headers,
            },
            credentials: 'same-origin',
        };

        const response = await fetch(url, { ...defaultOptions, ...options });
        const contentType = response.headers.get('content-type');
        let data;
        
        if (contentType && contentType.includes('application/json')) {
            data = await response.json();
        } else {
            throw new Error('Unexpected response format from server');
        }

        if (!response.ok) {
            if (data.errors) {
                const errorMessages = Object.entries(data.errors)
                    .map(([field, msgs]) => `${field}: ${Array.isArray(msgs) ? msgs.join(', ') : msgs}`)
                    .join('; ');
                throw new Error(errorMessages || data.message || `Request failed with status ${response.status}`);
            }
            throw new Error(data.message || `Request failed with status ${response.status}`);
        }

        return data;
    }

    async getUsers(params: {
        page?: number;
        per_page?: number;
        search?: string;
        role?: string;
        status?: string;
    } = {}): Promise<UsersResponse> {
        const searchParams = new URLSearchParams();
        
        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                searchParams.append(key, value.toString());
            }
        });

        const url = `${this.baseURL}?${searchParams.toString()}`;
        return this.request<User[]>(url) as Promise<UsersResponse>;
    }

    async getUser(id: number): Promise<ApiResponse<User>> {
        return this.request<User>(`${this.baseURL}/${id}`);
    }

    /**
     * Create new user
     * DEFENSE MINUTES FIX: Status field removed, automatically set to 'active' by backend
     */
    async createUser(userData: UserFormData): Promise<ApiResponse<User>> {
        // Remove status from create request - backend will set it to 'active'
        const createData = { ...userData };
        delete createData.status;
        
        return this.request<User>(this.baseURL, {
            method: 'POST',
            body: JSON.stringify(createData),
        });
    }

    /**
     * Update existing user
     * Status field CAN be updated when editing
     */
    async updateUser(id: number, userData: Partial<UserFormData>): Promise<ApiResponse<User>> {
        if (userData.password === '') {
            const updateData = { ...userData };
            delete updateData.password;
            delete updateData.password_confirmation;
            userData = updateData;
        }
        
        return this.request<User>(`${this.baseURL}/${id}`, {
            method: 'PUT',
            body: JSON.stringify(userData),
        });
    }

    async deleteUser(id: number): Promise<ApiResponse<null>> {
        return this.request<null>(`${this.baseURL}/${id}`, {
            method: 'DELETE',
        });
    }

    async getUserStats(): Promise<ApiResponse<UserStats>> {
        return this.request<UserStats>(`${this.baseURL}/stats`);
    }
}

export const userService = new UserService();