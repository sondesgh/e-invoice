export type Authority =
  | 'ROLE_USER'
  | 'ROLE_ADMIN'
  | 'ROLE_SUPER_USER'
  | 'ROLE_SUPPORT'
  | string;

export interface Account {
  id?: number;
  login: string;
  firstName?: string;
  lastName?: string;
  email: string;
  imageUrl?: string;
  activated: boolean;
  langKey: string;
  authorities: Authority[];
  createdBy?: string;
  createdDate?: string | null;
  lastModifiedBy?: string;
  lastModifiedDate?: string | null;
  partnerCode?: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
  rememberMe: boolean;
}

export interface PasswordResetInit {
  mail: string;
}

export interface PasswordResetFinish {
  key: string;
  newPassword: string;
}

export interface ChangePassword {
  currentPassword: string;
  newPassword: string;
}

export interface ContactPayload {
  name: string;
  email: string;
  subject?: string;
  message: string;
}

export interface PreviousState {
  name: string;
  params?: Record<string, unknown>;
}