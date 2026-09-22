export interface JwtPayload {
  sub: number;
  rol?: string;
  username?: string;
  email?: string; // opcional
  iat?: number;
  exp?: number;
}
